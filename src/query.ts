import type { ASTNode, SortNode } from "ts-rsql";
import type { SqlContext } from "./context";
import type { SqlResult } from "./result";
import { buildPredicateAndOrderBy } from "./llb/build-sql";

export const assembleFullQuery = (
  input: {
    filter: ASTNode | string | null;
    sort: SortNode[] | string | null;
    keyset: string | null;
  },
  context: SqlContext
): SqlResult => {
  const { filter, sort, keyset } = input;
  const sqlPredicateAndOrderBy = buildPredicateAndOrderBy({
    filter,
    sort,
    context,
    keyset,
  });
  if (!sqlPredicateAndOrderBy.isValid) {
    return sqlPredicateAndOrderBy;
  }
  if (sqlPredicateAndOrderBy.sql === "") {
    return { isValid: true, sql: context.mainQuery };
  }
  if (sqlPredicateAndOrderBy.sql.startsWith("ORDER BY")) {
    // the concat strategy is not considered here.
    // we'd hit this case in a listing service w/o a predicate
    // that is returning the first page of results. In this case
    // there is no predicate generated when building the query.
    return {
      isValid: true,
      sql: `${context.mainQuery} ${sqlPredicateAndOrderBy.sql}`,
    };
  }
  // The concatStrategy is used to join the two strings.
  // This is left to the caller to configure statically.
  // It's not worth parsing the query to figure out how to
  // concat the strings.
  return {
    isValid: true,
    sql: `${context.mainQuery} ${context.concatStrategy} ${sqlPredicateAndOrderBy.sql}`,
  };
};
