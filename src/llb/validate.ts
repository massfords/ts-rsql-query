import { parseISO } from "date-fns";
import invariant from "tiny-invariant";
import type { ASTNode } from "ts-rsql";
import type { SelectorConfig, SqlContext } from "../context";
import { findPluginByOperator } from "../plugin";
import { isAstNode, isComparisonNode } from "./ast";
import { isKnownOperator } from "./operators";

export const validate = (
  ast: ASTNode,
  context: SqlContext,
): { isValid: true } | { isValid: false; err: string } => {
  if (ast.operator == "and" || ast.operator == "or") {
    if (!ast.operands) {
      return { isValid: false, err: `missing operands: ${ast.operator}` };
    }
    const lhs = ast.operands[0] ?? null;
    if (!isAstNode(lhs)) {
      return {
        isValid: false,
        err: `invalid operand type: ${JSON.stringify(lhs)}`,
      };
    }
    let result = validate(lhs, context);
    if (result.isValid) {
      for (let i = 1; i < ast.operands.length && result.isValid; i++) {
        const rhs = ast.operands[i] ?? null;
        if (!isAstNode(rhs)) {
          return {
            isValid: false,
            err: `invalid operand type: ${JSON.stringify(rhs)}`,
          };
        }
        result = validate(rhs, context);
      }
    }
    return result;
  } else if (ast.operator === "not") {
    if (!ast.operands) {
      return { isValid: false, err: `missing operands: ${ast.operator}` };
    }
    const operand = ast.operands[0] ?? null;
    if (!isAstNode(operand)) {
      return {
        isValid: false,
        err: `invalid operand type: ${JSON.stringify(operand)}`,
      };
    }
    return { isValid: true };
  } else if (isComparisonNode(ast)) {
    const plugin = findPluginByOperator(ast.operator, context.plugins);
    if (!(isKnownOperator(ast.operator) || plugin)) {
      return {
        isValid: false,
        err: `unknown operator: ${JSON.stringify(ast.operator)}`,
      };
    }
    invariant(ast.operands);
    const value = ast.operands[0] ?? null;
    if (!value) {
      return {
        isValid: false,
        err: `missing value for selector: ${JSON.stringify(ast.selector)}`,
      };
    }
    if (!context.lax) {
      const selector = context.selectors[ast.selector];
      if (!selector) {
        return {
          isValid: false,
          err: `unknown selector: ${JSON.stringify(ast.selector)}`,
        };
      }
      if (typeof selector === "object") {
        if (!plugin?.skipValidation && !isValueValid(selector, value)) {
          if (selector.enum) {
            return {
              isValid: false,
              err: `bad selector value for "${
                ast.selector
              }": "${value}" must be one of ${JSON.stringify(selector.enum)}`,
            };
          }
          return {
            isValid: false,
            err: `bad selector value for "${
              ast.selector
            }": "${value}" is not a ${selector?.type ?? "type"}`,
          };
        }
      }
    }
    return { isValid: true };
  }
  return { isValid: false, err: `unknown node type: ${JSON.stringify(ast)}` };
};

const isValueValid = (selector: SelectorConfig, val: string): boolean => {
  if (selector.enum) {
    return selector.enum.some((allowedValue) => val == allowedValue);
  }
  if (!selector.type) {
    return true;
  }
  switch (selector.type) {
    case "boolean":
      return /^(?<bool>true|false)$/iu.test(val);
    case "date":
      return isIso8601Date(val);
    case "date-time":
      return isIso8601DateTime(val);
    case "integer":
      return /^\d+$/u.test(val) && !isNaN(Number(val));
    case "number":
      return !isNaN(Number(val));
    case "string":
      return true;
    default: {
      const invalid: never = selector.type;
      throw Error(invalid);
    }
  }
};

const iso8601DatePattern = new RegExp(
  [
    /(?<year>\d{4})-/u,
    /(?<month>0[1-9]|1[0-2])-/u,
    /(?<day>0[1-9]|1\d|2\d|3[0-1])/u,
  ]
    .map((regex) => regex.source)
    .join(""),
  "u",
);
const isIso8601DateTime = (input: string): boolean => {
  const parsed = parseISO(input);
  const time = parsed.getTime();
  return !isNaN(time);
};
const isIso8601Date = (input: string): boolean =>
  iso8601DatePattern.test(input) && isIso8601DateTime(input);
