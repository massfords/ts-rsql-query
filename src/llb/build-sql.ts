import type { ASTNode, SortNode } from "ts-rsql";
import type { SqlContext } from "../context";
import type { SqlResult } from "../result";
import { toSql } from "./to-sql";
import { toOrderBy } from "./to-orderby";

/**
 * produces a SQL clause to append to a base query.
 * side effects: values extracted from the filter and keyset
 *               are appended to the context's values array
 * @internal
 */
export const buildPredicateAndOrderBy = (input: {
  filter: ASTNode | string | null;
  sort: SortNode[] | string | null;
  keyset: string | null;
  context: SqlContext;
}): SqlResult => {
  // build the predicate sql
  // build the order by clause
  // return the full query
  const { filter, sort, context, keyset } = input;
  const sqlPredicate = toSql(filter, context);
  if (!sqlPredicate.isValid) {
    return sqlPredicate;
  }
  const orderBy = toOrderBy(sort, keyset, context);
  if (!orderBy.isValid) {
    return orderBy;
  }
  if (orderBy.seek === "" && orderBy.orderby == "") {
    return { isValid: true, sql: sqlPredicate.sql };
  }

  let sql = sqlPredicate.sql;
  if (sqlPredicate.sql !== "" && orderBy.seek !== "") {
    sql = `(${sql}) AND `;
  }
  if (orderBy.seek !== "") {
    sql += orderBy.seek;
  }
  if (orderBy.orderby !== "") {
    sql += ` ORDER BY ${orderBy.orderby}`;
  }
  return { isValid: true, sql: sql.trim() };
};
