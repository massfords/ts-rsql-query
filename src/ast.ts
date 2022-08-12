import { ASTNode, ComparisonNode, Operand } from "ts-rsql";

export const isAstNode = (ast: Operand | null): ast is ASTNode => {
  return ast !== null && typeof ast !== "string";
};

export const isComparisonNode = (ast: ASTNode): ast is ComparisonNode => {
  return "selector" in ast;
};
