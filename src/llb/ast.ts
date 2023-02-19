import type { ASTNode, ComparisonNode, Operand } from "ts-rsql";

/**
 * @internal
 */
export const isAstNode = (ast: Operand | null): ast is ASTNode => {
  return ast !== null && typeof ast !== "string";
};

/**
 * @internal
 */
export const isComparisonNode = (ast: ASTNode): ast is ComparisonNode => {
  return "selector" in ast;
};
