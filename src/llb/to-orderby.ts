import { parseSort, SortNode } from "ts-rsql";
import type { SqlContext } from "../context";
import invariant from "tiny-invariant";
import { Base64 } from "js-base64";

const buildRowValues = (
  nodes: SortNode[],
  keyset: string | null,
  context: SqlContext
): string => {
  if (nodes.length === 0 || !keyset || keyset === "") {
    return "";
  }
  invariant(nodes[0]);
  const op: string = nodes[0].operator === "desc" ? "<" : ">";
  return `(${nodes
    .map((node) => node.operand)
    .map((operand: string) => {
      if ("selectors" in context) {
        const selConfig = context.selectors[operand];
        invariant(selConfig);
        if (typeof selConfig === "string") {
          return selConfig;
        }
        return selConfig.sql;
      }
      return operand;
    })
    .join(",")})${op}(${nodes
    .map((_value, index) => `$${index + 1 + context.values.length}`)
    .join(",")})`;
};

export type SortResult =
  | { isValid: true; orderby: string; seek: string }
  | { isValid: false; err: string };

/**
 * @internal
 */
export const toOrderBy = (
  input: SortNode[] | string | null,
  keyset: string | null,
  context: SqlContext
): SortResult => {
  if (input === null) {
    return { isValid: true, seek: "", orderby: "" };
  }
  const nodes: SortNode[] =
    typeof input === "string" ? parseSort(input) : input;
  if ("selectors" in context) {
    // validate the selectors
    for (const node of nodes) {
      const selConfig = context.selectors[node.operand];
      if (!selConfig) {
        return { isValid: false, err: `invalid sort: ${node.operand}` };
      }
    }
  }
  const result: SortResult = {
    isValid: true,
    orderby: nodes
      .map((node) => {
        const dir = node.operator === "desc" ? " DESC" : "";
        if ("selectors" in context) {
          const selConfig = context.selectors[node.operand];
          invariant(selConfig, `selector config missing for ${node.operand}`);
          if (typeof selConfig === "string") {
            return `${selConfig}${dir}`;
          } else {
            return `${selConfig.sql}${dir}`;
          }
        }
        return `${node.operand}${dir}`;
      })
      .join(","),
    seek: keyset ? buildRowValues(nodes, keyset, context) : "",
  };
  if (keyset) {
    const keysetValues: string[] = JSON.parse(
      Base64.decode(keyset)
    ) as string[];
    context.values.push(...keysetValues);
  }
  return result;
};
