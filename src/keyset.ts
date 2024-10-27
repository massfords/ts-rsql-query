import type { SortNode } from "ts-rsql";
import type { StaticQueryConfig } from "./context";
import invariant from "tiny-invariant";
import { Base64 } from "js-base64";

export const toKeySet = (values: string[]): string => {
  return Base64.encodeURI(JSON.stringify(values));
};

export const lastRowToKeySet = (
  row: Record<string, unknown>,
  sorts: SortNode[],
  config: StaticQueryConfig,
): string[] => {
  // walk each sort node
  // map to the key to use to pull the value from the row
  return sorts
    .map((sortNode) => {
      const selectorConfig = config.selectors[sortNode.operand];
      if (!selectorConfig) {
        return sortNode.operand;
      }
      if (typeof selectorConfig === "string") {
        return selectorConfig in row ? selectorConfig : sortNode.operand;
      }

      if (selectorConfig.alias && selectorConfig.alias in row) {
        return selectorConfig.alias;
      }
      return sortNode.operand;
    })
    .map((alias) => {
      invariant(
        alias in row,
        () => `row: ${JSON.stringify(row)} is missing property '${alias}'`,
      );
      const rowVal = row[alias];
      if (typeof rowVal !== "string") {
        return JSON.stringify(rowVal);
      }
      return rowVal;
    });
};
