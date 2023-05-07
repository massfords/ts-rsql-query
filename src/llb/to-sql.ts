import { ASTNode, ComparisonNode, Operand, parseRsql } from "ts-rsql";
import invariant from "tiny-invariant";
import { isAstNode, isComparisonNode } from "./ast";
import type {
  SelectorConfig,
  SqlContext,
  StaticQueryConfig,
  Value,
} from "../context";
import { KnownOperator, toSqlOperator } from "./operators";
import { validate } from "./validate";

const formatSelector = (context: SqlContext, selector: string): string => {
  if (!("selectors" in context)) {
    return selector;
  }
  const sel = context.selectors[selector];
  if (!sel) {
    return selector;
  }
  if (typeof sel === "string") {
    return sel;
  }
  return sel.sql ?? selector;
};

const selectorConfig = (
  selector: string,
  config: StaticQueryConfig
): SelectorConfig | null => {
  if (!config.selectors) {
    return null;
  }
  const selConfig = config.selectors[selector] ?? null;
  if (typeof selConfig === "string") {
    return null;
  }
  return selConfig;
};

const formatValue = (
  { allowArray, ast }: { ast: ComparisonNode; allowArray?: boolean },
  config: StaticQueryConfig
): Value => {
  const firstOperand =
    ast.operands && Array.isArray(ast.operands) ? ast.operands[0] ?? "" : "";
  const selConfig = selectorConfig(ast.selector, config);

  // case where the config is an enum
  if (selConfig && "enum" in selConfig) {
    if (allowArray) {
      return (
        ast.operands?.filter((op) => selConfig.enum?.find((e) => e === op)) ??
        []
      );
    }
    return selConfig.enum.find((e) => e === firstOperand) ? firstOperand : "";
  }

  // there is no config, use the raw operand
  if (!selConfig || !selConfig.type) {
    if (allowArray && Array.isArray(ast.operands)) {
      return ast.operands;
    }
    return firstOperand;
  }

  // there is a config, convert the type
  switch (selConfig.type) {
    case "string":
    case "date":
    case "date-time":
      return allowArray && Array.isArray(ast.operands)
        ? ast.operands
        : firstOperand;
    case "integer":
    case "number":
      return allowArray && Array.isArray(ast.operands)
        ? ast.operands.map(Number)
        : Number(firstOperand);
    case "boolean":
      return firstOperand.toLowerCase() === "true";
    default: {
      const invalid: never = selConfig.type;
      throw Error(invalid);
    }
  }
};

export const toSql = (
  input: ASTNode | string | null,
  context: SqlContext
): { isValid: true; sql: string } | { isValid: false; err: string } => {
  if (!input || input === "") {
    return { isValid: true, sql: "" };
  }
  const ast: ASTNode = typeof input === "string" ? parseRsql(input) : input;
  const result = validate(ast, context);
  if (!result.isValid) {
    return result;
  }
  return { isValid: true, sql: _toSql(ast, context) };
};

const _toSql = (ast: ASTNode | null | Operand, context: SqlContext): string => {
  if (!isAstNode(ast)) {
    // We would have reported this as an error in validate.
    // The extra check here is to remove some assert guard calls
    // below which are unnecessary after validation.
    return "";
  }
  if (ast.operator == "and" || ast.operator == "or") {
    invariant(ast.operands);
    const lhs = ast.operands[0] ?? null;
    let sql = _toSql(lhs, context);
    for (let i = 1; i < ast.operands.length; i++) {
      const rhs = ast.operands[i] ?? null;
      sql += ` ${ast.operator} ${_toSql(rhs, context)}`;
    }
    return `(${sql})`;
  } else if (ast.operator === "not") {
    invariant(ast.operands);
    const operand = ast.operands[0] ?? null;
    return `not(${_toSql(operand, context)})`;
  } else if (isComparisonNode(ast)) {
    const { values, ...config } = context;
    // cast is ok here as we are past validation AND the switch/case below is exhaustive
    const op: KnownOperator = ast.operator as KnownOperator;
    const selector = formatSelector(context, ast.selector);
    switch (op) {
      case "==": {
        invariant(ast.operands);
        invariant(ast.operands[0]);
        const operand = ast.operands[0];
        const leadingWildcard = operand.startsWith("*");
        const trailingWildcard = operand.endsWith("*");
        if (leadingWildcard && trailingWildcard) {
          values.push(`%${operand.substring(1, operand.length - 2)}%`);
        } else if (leadingWildcard) {
          values.push(`%${operand.substring(1)}`);
        } else if (trailingWildcard) {
          values.push(`${operand.substring(0, operand.length - 2)}%`);
        } else {
          values.push(formatValue({ ast }, config));
        }
        return `${selector}${
          leadingWildcard || trailingWildcard ? ` ilike ` : "="
        }$${values.length}`;
      }
      case "!=": {
        invariant(ast.operands && ast.operands[0]);
        values.push(formatValue({ ast }, config));
        return `${selector}<>$${values.length}`;
      }
      case "<":
      case "<=":
      case ">":
      case ">=": {
        invariant(ast.operands && ast.operands[0]);
        values.push(formatValue({ ast }, config));
        return `${selector}${op}$${values.length}`;
      }
      case "=lt=":
      case "=le=":
      case "=gt=":
      case "=ge=": {
        invariant(ast.operands && ast.operands[0]);
        values.push(formatValue({ ast }, config));
        return `${selector}${toSqlOperator(op)}$${values.length}`;
      }
      case "=in=":
      case "=out=": {
        invariant(ast.operands);
        values.push(formatValue({ ast, allowArray: true }, config));
        return `${selector} ${toSqlOperator(op)} $${values.length}`;
      }
      default: {
        const invalid: never = op;
        throw Error(invalid);
      }
    }
  }
  invariant(false, "unsupported AST node");
};
