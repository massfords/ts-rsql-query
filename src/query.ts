import { ASTNode, SortNode } from "ts-rsql";
import { SqlContext } from "./context";
import { toSql } from "./to-sql";
import { toOrderBy } from "./sort";
import { SqlResult, SuccessSqlResult } from "./result";
import invariant from "tiny-invariant";

export const assembleFullQuery = (input: {
  // mainSql for the listing service
  mainSql: string;
  // use "where" if the mainSql does not contain a where clause
  // use "and" if the mainSql has an existing where clause
  concatStrategy: "where" | "and";
  // computed predicate and order by to append to the main query
  sqlPredicateAndOrderBy: SuccessSqlResult | null;
}): string => {
  const { mainSql, concatStrategy, sqlPredicateAndOrderBy } = input;
  if (!sqlPredicateAndOrderBy || sqlPredicateAndOrderBy.sql === "") {
    return mainSql;
  }
  if (sqlPredicateAndOrderBy.sql.startsWith("ORDER BY")) {
    // the concat strategy is not considered here.
    // we'd hit this case in a listing service w/o a predicate
    // that is returning the first page of results. In this case
    // there is no predicate generated when building the query.
    return `${mainSql} ${sqlPredicateAndOrderBy.sql}`;
  }
  // The concatStrategy is used to join the two strings.
  // This is left to the caller to configure statically.
  // It's not worth parsing the query to figure out how to
  // concat the strings.
  return `${mainSql} ${concatStrategy} ${sqlPredicateAndOrderBy.sql}`;
};

// buildPredicateAndOrderBy produces a SQL clause to append to a base query.
// side effects: values extracted from the filter and keyset
//               are appended to the context's values array
export const buildPredicateAndOrderBy = (input: {
  filter: ASTNode | string | null;
  sort: SortNode[] | string;
  context: SqlContext;
}): SqlResult => {
  // build the predicate sql
  // build the order by clause
  // return the full query
  const { filter, sort, context } = input;
  const sqlPredicate = toSql(filter, context);
  if (!sqlPredicate.isValid) {
    return sqlPredicate;
  }
  const orderBy = toOrderBy(sort, context);
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

export const mustPredicateAndOrderBy = (input: {
  filter: ASTNode | string | null;
  sort: SortNode[] | string;
  context: SqlContext;
}): SuccessSqlResult => {
  const result = buildPredicateAndOrderBy(input);
  invariant(result.isValid);
  return result;
};
