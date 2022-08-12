import { ASTNode, SortNode } from "ts-rsql";
import { SqlContext } from "./context";
import { toSql } from "./to-sql";
import { toOrderBy } from "./sort";
import { SqlResult } from "./result";

// buildQuery produces a SQL clause suitable for appending to the
// side effects: values extracted from the filter and keyset
// are appended to the context's values array
export const buildQuery = (input: {
  filter: ASTNode | string;
  sort: SortNode[] | string;
  context: SqlContext;
}): SqlResult => {
  // build the main sql
  // build the order by clause
  // return the full query
  const { filter, sort, context } = input;
  const mainSql = toSql(filter, context);
  if (!mainSql.isValid) {
    return mainSql;
  }
  const orderBy = toOrderBy(sort, context);
  if (!orderBy.isValid) {
    return orderBy;
  }
  if (orderBy.seek === "" && orderBy.orderby == "") {
    return { isValid: true, sql: mainSql.sql };
  }

  let sql = mainSql.sql;
  if (mainSql.sql !== "" && orderBy.seek !== "") {
    sql += " AND ";
  }
  if (orderBy.seek !== "") {
    sql += orderBy.seek;
  }
  if (orderBy.orderby !== "") {
    sql += ` ORDER BY ${orderBy.orderby}`;
  }
  return { isValid: true, sql: sql.trim() };
};
