import type { RsqlOperatorPlugin } from "../context";
import { formatKeyword } from "./to-sql";

/**
 * SymbolicOperator matches the symbolic operators supported by ts-rsql.
 */
type SymbolicOperator = "<" | "<=" | ">" | ">=" | "==" | "!=";

/**
 * NamedOperator defines what this library uses for named operators.
 */
type NamedOperator = `=${"lt" | "le" | "gt" | "ge" | "in" | "out"}=`;

/**
 * KnownOperator defines the operators that this lib supports without any plugins.
 */
export type KnownOperator = SymbolicOperator | NamedOperator;

/**
 * Transforms an RSQL operator into a corresponding SQL operator.
 *
 * > NOTE:
 * > - Option `keywordsLowerCase` has no effect for:
 * >   - `!=`
 * >   - `<`
 * >   - `=lt=`
 * >   - `<=`
 * >   - `=le=`
 * >   - `>`
 * >   - `=gt=`
 * >   - `>=`
 * >   - `=ge=`
 * > - Option `detachedOperators` has no effect for:
 * >   - `==`
 * >   - `=in=`
 * >   - `=out=`
 *
 * @param operator - The RSQL operator.
 * @param [keywordsLowerCase] - Whether to return SQL keywords in lower or upper-case, default: `false`.
 * @param [detachedOperators] - Whether to return plain SQL operators with SPACE around,
 * default: `false`.
 */
export const toSqlOperator = (
  operator: KnownOperator,
  keywordsLowerCase = false,
  detachedOperators = false,
): string => {
  const space = detachedOperators ? " " : "";
  switch (operator) {
    case "==":
      return formatKeyword("LIKE", keywordsLowerCase);
    case "!=":
      return `${space}<>${space}`;
    case "<":
    case "=lt=":
      return `${space}<${space}`;
    case "<=":
    case "=le=":
      return `${space}<=${space}`;
    case ">":
    case "=gt=":
      return `${space}>${space}`;
    case ">=":
    case "=ge=":
      return `${space}>=${space}`;
    case "=in=":
      return formatKeyword("IN", keywordsLowerCase);
    case "=out=":
      return formatKeyword("NOT IN", keywordsLowerCase);
    default: {
      const invalid: never = operator;
      throw Error(invalid);
    }
  }
};

/**
 * Checks if passed operator is a known RSQL operator.
 *
 * @param maybe - The RSQL operator.
 * @returns A `true` if is known RSQL operator, else `false`.
 */
export const isKnownOperator = (maybe: string): maybe is KnownOperator => {
  try {
    toSqlOperator(maybe as NamedOperator);
    return true;
  } catch {
    return false;
  }
};

/**
 * Checks if passed operator is a configured RSQL plugin operator.
 *
 * @param maybe - The RSQL plugin operator.
 * @param plugins - The RSQL operator plugins.
 * @returns A `true` if is a configured RSQL plugin operator, else `false`.
 */
export const isPluginOperator = (
  maybe: string,
  plugins?: RsqlOperatorPlugin[],
): boolean => {
  return plugins?.length
    ? plugins.some((plugin) => plugin.operator.toLowerCase() === maybe)
    : false;
};
