import invariant from "tiny-invariant";
import { ASTNode, ComparisonNode, Operand, parseRsql } from "ts-rsql";
import type {
  SelectorConfig,
  SqlContext,
  StaticQueryConfig,
  Value,
} from "../context";
import { maybeExecuteRsqlOperatorPlugin } from "../plugin";
import { isAstNode, isComparisonNode } from "./ast";
import { KnownOperator, toSqlOperator } from "./operators";
import { validate } from "./validate";

/**
 * Formats a keyword according to configuration (either fully upper- or lower-case).
 *
 * @param keyword - The keyword to format.
 * @param keywordsLowerCase - The configuration.
 * @returns The formatted keyword.
 */
export const formatKeyword = (
  keyword: string,
  keywordsLowerCase = false,
): string =>
  keywordsLowerCase ? keyword.toLowerCase() : keyword.toUpperCase();

/**
 * Formats the selector for printing to SQL.
 *
 * @param context - The context.
 * @param selector - The (unformatted) selector.
 * @returns The formatted selector.
 */
export const formatSelector = (
  context: SqlContext,
  selector: string,
): string => {
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
  config: StaticQueryConfig,
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

export const formatValue = (
  { allowArray, ast }: { ast: ComparisonNode; allowArray?: boolean },
  config: StaticQueryConfig,
): Value => {
  const firstOperand =
    ast.operands && Array.isArray(ast.operands) ? (ast.operands[0] ?? "") : "";
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
  context: SqlContext,
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

/**
 * Creates the SQL string from the `==` or `!=` RSQL operator including any wildcard(s) occurrence in its operand.
 *
 * @param ast - The comparison node.
 * @param context - The SQL context.
 * @param operator - The `==` or `!=` RSQL operator.
 * @param selector - The current selector.
 * @returns The proper SQL string for `==` or `!=` RSQL operator.
 */
const _handleEqualOrNotEqualOperator = (
  ast: ComparisonNode,
  context: SqlContext,
  operator: "==" | "!=",
  selector: string,
): string => {
  const { detachedOperators, keywordsLowerCase, values } = context;
  invariant(ast.operands);
  invariant(ast.operands[0]);
  const operand = ast.operands[0];
  const leadingWildcard = operand.startsWith("*");
  const trailingWildcard = operand.endsWith("*");
  if (leadingWildcard && trailingWildcard) {
    values.push(`%${operand.substring(1, operand.length - 1)}%`);
  } else if (leadingWildcard) {
    values.push(`%${operand.substring(1)}`);
  } else if (trailingWildcard) {
    values.push(`${operand.substring(0, operand.length - 1)}%`);
  } else {
    values.push(formatValue({ ast }, context));
  }
  return `${selector}${
    leadingWildcard || trailingWildcard
      ? ` ${formatKeyword(
          `${operator === "!=" ? "NOT " : ""}ILIKE`,
          keywordsLowerCase,
        )} `
      : `${toSqlOperator(operator, keywordsLowerCase, detachedOperators)}`
  }$${values.length}`;
};

const _toSql = (ast: ASTNode | null | Operand, context: SqlContext): string => {
  if (!isAstNode(ast)) {
    // We would have reported this as an error in validate.
    // The extra check here is to remove some assert guard calls
    // below which are unnecessary after validation.
    return "";
  }
  const { detachedOperators, keywordsLowerCase } = context;
  if (ast.operator == "and" || ast.operator == "or") {
    invariant(ast.operands);
    const lhs = ast.operands[0] ?? null;
    let sql = _toSql(lhs, context);
    for (let i = 1; i < ast.operands.length; i++) {
      const rhs = ast.operands[i] ?? null;
      sql += ` ${formatKeyword(ast.operator, keywordsLowerCase)} ${_toSql(
        rhs,
        context,
      )}`;
    }
    return `(${sql})`;
  } else if (ast.operator === "not") {
    invariant(ast.operands);
    const operand = ast.operands[0] ?? null;
    return `${formatKeyword("NOT", keywordsLowerCase)}(${_toSql(
      operand,
      context,
    )})`;
  } else if (isComparisonNode(ast)) {
    const { values, ...config } = context;
    // cast is ok here as we are past validation AND the switch/case below is exhaustive
    const op: KnownOperator = ast.operator as KnownOperator;
    const selector = formatSelector(context, ast.selector);

    // checks for and executes plugin (custom operator or overwrite of known operator)
    const pluginResult = maybeExecuteRsqlOperatorPlugin(context, ast, selector);
    if (pluginResult) {
      return pluginResult;
    }

    switch (op) {
      case "==":
      case "!=": {
        return _handleEqualOrNotEqualOperator(ast, context, op, selector);
      }
      case "<":
      case "<=":
      case ">":
      case ">=":
      case "=lt=":
      case "=le=":
      case "=gt=":
      case "=ge=": {
        invariant(ast.operands && ast.operands[0]);
        values.push(formatValue({ ast }, config));
        return `${selector}${toSqlOperator(
          op,
          keywordsLowerCase,
          detachedOperators,
        )}$${values.length}`;
      }
      case "=in=":
      case "=out=": {
        invariant(ast.operands);
        values.push(formatValue({ ast, allowArray: true }, config));
        return `${selector} ${toSqlOperator(op, keywordsLowerCase)} $${
          values.length
        }`;
      }
      default: {
        const invalid: never = op;
        throw Error(invalid);
      }
    }
  }
  invariant(false, "unsupported AST node");
};
