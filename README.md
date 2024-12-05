# ts-rsql-query

[![license](https://img.shields.io/badge/MIT-blue.svg)](https://github.com/massfords/ts-rsql-query/blob/master/LICENSE)
[![npm version](https://badge.fury.io/js/ts-rsql-query.svg)](https://badge.fury.io/js/ts-rsql-query)
[![NPM](https://nodei.co/npm/ts-rsql-query.png?stars=true)](https://www.npmjs.com/package/ts-rsql-query)

## What does it do?

Transforms the AST produced from [ts-rsql](https://github.com/trevor-leach/ts-rsql) into a SQL predicate that is suitable to append to a base query and execute.

Consider a service that lists players in a game based on the number of points they have in descending order and then alphabetically by name.

```sql
SELECT u.firstName    AS "firstName",
       u.lastName     AS "lastName",
       u.email,
       u.active,
       u.dob,
       u.tier,
       u.id,
       u.pointbalance AS points
FROM tsrsql.users u
ORDER BY u.pointbalance DESC, u.lastname, u.firstname, u.id;
```

| points | lastName | firstName | email               | active | dob        | tier   | id                                   |
| :----- | :------- | :-------- | :------------------ | :----- | :--------- | :----- | :----------------------------------- |
| 3      | Cupcake  | Charlie   | charlie@example.com | true   | 1960-03-05 | GOLD   | 0399c724-5829-5458-b7ac-ac6a298e0e4b |
| 2      | Banana   | Bob       | bob@example.com     | true   | 1960-02-04 | SILVER | 7139e81e-dc13-54d1-8c10-6fe6f7bfb34e |
| 1      | Apple    | Alice     | alice@example.com   | false  | 1960-01-03 | BRONZE | 7fd757a2-2173-5a60-8d25-615994740358 |

### Context and configuration for the SQL transform

| SqlContext Field                                      | Description                                                                                                             |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `values: Value[]`                                     | new array per query, typically just `[]`                                                                                |
| `selectors: Record<string, string or SelectorConfig>` | static config that is either inlined or declared at file scope                                                          |
| `lax?: true`                                          | if present, selectors are not required to be defined, but are enforced if defined (default: `false`)                    |
| `keywordsLowerCase?: true`                            | whether to print SQL keywords lower-case (default: `false`)                                                             |
| `detachedOperators?: true`                            | whether to print SQL operators with SPACE around, e.g. `'field >= 3'` instead of `'field>=3'` (default: `false`)        |
| `whereKeywordPrefix?: string`                         | prefix for `WHERE` keyword to enable a more custom formatting of SQL code, e.g. a `WHERE` on next line (default: `" "`) |
| `plugins?: RsqlOperatorPlugin[]`                      | any [plugins](#plugins) to create new or overwrite standard RSQL operators                                              |

> Values extracted from the filter and order by handling are appended to this array.
> The length after adding a value determines the offset for its query parameter ($1, $2, etc).
>
> Note that if the base query already has query parameters then the values
> array should contain those parameters to ensure any newly generated
> parameters do not conflict.

### Filtering

The query builder leverages the RSQL expression parser from [ts-rsql](https://github.com/trevor-leach/ts-rsql) and transforms the resulting AST to SQL.

| RSQL         | SqlContext Selector Config                          | SQL Output          | Values  |
| ------------ | --------------------------------------------------- | ------------------- | ------- |
| `points>500` | none                                                | `points>$1`         | `[500]` |
| `points>42`  | `{ points: u.pointbalance }`                        | `u.pointbalance=$1` | `[42]`  |
| `points>42`  | `{ points: { type: integer, sql: u.pointbalance} }` | `u.pointbalance=$1` | `[42]`  |
| `points>abc` | `{ points: { type: integer, sql: u.pointbalance} }` | validation error    |         |

- Output is a parameterized query
- The building of the parameterized query appends to the Values array.
- Selector configuration is either a string or object.
- If the type of the selector is known then the value is validated.

### Sorting

The order by expression builder leverages the sort expression parser from [ts-rsql](https://github.com/trevor-leach/ts-rsql) and transforms the resulting AST to SQL.

| Sort Expressions                   | SqlContext Selector Config     | SQL Output                                                |
| ---------------------------------- | ------------------------------ | --------------------------------------------------------- |
| `-points, lastName, firstName, id` | none                           | `order by points DESC, lastName, firstName, id`           |
| `-points, lastName, firstName, id` | `{ points: "u.pointbalance" }` | `order by u.pointbalance DESC, lastName, firstName, u.id` |

> The order by expression builder use the same configuration in the SQLContext for its selectors.

### Filtering, Sorting, and Pagination

This library implements the [Seek Method](https://use-the-index-luke.com/sql/partial-results/fetch-next-page) for its pagination.

The target SQL dialect is Postgresql since it supports the SQL92 "row values" syntax for a SELECT.

#### SqlContext for the first page of results

**Sort Expression**: `-points, lastName, firstName, id`

**SQLContext**

```typescript
const context: SqlContext = {
  values: [],
  mainQuery: "SELECT * FROM tsrsql.users u",
  selectors: {
    points: {
      sql: "u.pointBalance",
      type: "integer",
    },
    lastName: "u.lastName",
    firstName: "u.firstName",
    id: "u.id",
  },
};
```

**SQL Output**: `ORDER BY u.pointbalance DESC, u.lastName, u.firstName, u.id`

#### SqlContext for the page after the **keyset** row

**Sort Expression**: `-points, lastName, firstName, id`

**SQLContext** (same as above)

**SQL Output**:

```
(u.pointbalance,u.lastName,u.firstName,u.id)<($1,$2,$3,$4)
order by u.pointbalance DESC, u.lastName, u.firstName, u.id
```

- output includes "row-values" syntax to implement the seek.
- The values from the encoded **keyset** parameter are appended to the values array

#### Creating the **keyset** value

Using the same sort order example of `-points,lastName,firstName,id`:

```typescript
const rows = db.manyOrNone<UserRecord>(sql, context.values);
if (rows.length > 0) {
  // pass keyset back to client so they can fetch the next page
  const keyset = toKeySet(lastRowToKeySet(rows[rows.length - 1], sorts, context));
}
```

## Building and running a query

See `live-db.it.ts` for how complete queries are built and run.

```typescript
import { parseSort } from "ts-rsql";

const context: SqlContext = {
  values: [],
  mainQuery: "SELECT * FROM tsrsql.users u",
  selectors: {
    points: {
      sql: "u.pointBalance",
      type: "integer",
    },
    lastName: "u.lastName",
    firstName: "u.firstName",
    id: "u.id",
  },
};

const filter: string | null = null; // should come from query parameter, mapped by app
const sort: string | null = null; // should come from query parameter, mapped by app
const keyset: string | null = null; // should come from query parameter, mapped by app

// parsing the sorts into an array here for
// possible reuse below in building a keyset.
const parsedSorts: SortNode[] = sort && sort !== "" ? parseSort(sort) : [];

const sql = assembleFullQuery(
  {
    filter,
    sort: parsedSorts,
    keyset,
  },
  context,
);
if (sql.isValid) {
  const rows = await db.manyOrNone(sql.sql, context.values);
  let keysetForNextRequest: string | null = null;
  if (rows.length > 0) {
    invariant(rows[rows.length - 1]);
    // note that the function that builds the keyset expects to
    // operate on the row shape from the query.
    // Also note the re-use of the parsedSorts array here
    keysetForNextRequest = toKeySet(lastRowToKeySet(rows[rows.length - 1], parsedSorts, context));
  }
}
```

## Plugins

This library supports a plugin architecture to allow for custom operators or overwriting
standard ones. The reason for that is, some RSQL build libraries may allow the definition
of custom operators (e.g. [rsql-builder](https://www.npmjs.com/package/rsql-builder)),
you might have a need for "business-logic" operators encapsulating a complex SQL-logic
or even sometimes there might also be a need to overwrite the standard operator behavior
(see [parameterized query with an `IN` operator](https://github.com/brianc/node-postgres/issues/1452)).

For a plugin definition you have to provide:

- a proper operator name,
- (optional) invariant check(s)
- and finally, the the transformation instructions to SQL

### Plugin configuration

Any plugin has to be configured according to this type:

```typescript
/**
 * The plugin for a custom or an overwrite of a known (aka standard) RSQL operator.
 */
export type RsqlOperatorPlugin = {
  /**
   * The new custom operator starting and ending with `=`, e.g. `=customOperator=`
   * or an overwrite of a known RSQL operator.
   */
  readonly operator: string;
  /**
   * Callback to implement any (optional) invariant checks before transforming to SQL.
   *
   * @param ast - The comparison AST node.
   */
  invariant?(ast: ComparisonNode): void;
  /**
   * Callback to implement the transformation of current (formatted) `selector`, AST,
   * custom or overwritten known operator and its possible `values` to SQL.
   *
   * @param options - The transformation options.
   * @returns The SQL code.
   */
  toSql(options: RsqlOperatorPluginToSqlOptions): string;
  /**
   * Flag whether the selector's `type` validation for value of this plugin should be skipped.
   * Use this if you plugin accepts other values than configured in the selector's `type`.
   *
   * @default false
   */
  readonly skipValidation?: true;
};
```

which is to be passed to the `SqlContext`, e.g. like this:

```typescript
import { MapInToEqualsAnyPlugin, MapOutToNotEqualsAllPlugin } from "ts-rsql-query";

const context: SqlContext = {
  // ...
  plugins: [MapInToEqualsAnyPlugin, MapOutToNotEqualsAllPlugin],
};
```

### Plugin implementation

The following codes shows an example of how to implement a plugin by the predefined plugin `IsNullPlugin`:

```typescript
import { CustomOperator, formatKeyword, isBooleanValueInvariant, RsqlOperatorPlugin, RsqlOperatorPluginToSqlOptions } from "ts-rsql-query";

/**
 * Plugin for an is-null operation.
 * [SQL](https://www.postgresqltutorial.com/postgresql-tutorial/postgresql-is-null/) mapping:
 *
 * - `field=null=true` => `field IS null`
 * - `field=null=false` => `field IS NOT null`
 */
export const IsNullPlugin: RsqlOperatorPlugin = {
  operator: CustomOperator.IS_NULL /* New! */,
  invariant: isBooleanValueInvariant,
  toSql: (options: RsqlOperatorPluginToSqlOptions): string => {
    const {
      keywordsLowerCase,
      selector,
      ast: { operands },
    } = options;
    return `${selector} ${formatKeyword("IS", options)}${operands?.[0] === "false" ? ` ${formatKeyword("NOT", keywordsLowerCase)}` : ""} null`;
  },
  skipValidation: true,
};
```

### Plugin overwrite

An example how to overwrite a standard operator `=in=` by predefined `MapInToEqualsAnyPlugin`:

```typescript
import { formatKeyword, formatValue, OverwrittenOperator, RsqlOperatorPlugin, RsqlOperatorPluginToSqlOptions } from "ts-rsql-query";
import invariant from "tiny-invariant";
import type { ComparisonNode } from "ts-rsql";

/**
 * Plugin for in-overwrite (is-any) operation.
 * [PostgreSQL](https://www.postgresqltutorial.com/postgresql-tutorial/postgresql-any/) mapping:
 *
 * - `field=in=(test1,test2)` => `field = ANY(test1,test2)`
 *
 * > NOTE: this is useful in the context of PostgreSQL, because the overall motivation
 * > was to have a solution for following `pg` problem: [parameterized query with an
 * > `IN` operator](https://github.com/brianc/node-postgres/issues/1452).
 */
export const MapInToEqualsAnyPlugin: RsqlOperatorPlugin = {
  operator: OverwrittenOperator.IN /* Operator override! */,
  invariant: (ast: ComparisonNode): void => {
    invariant(ast.operands);
  },
  toSql: (options: RsqlOperatorPluginToSqlOptions): string => {
    const { ast, keywordsLowerCase, selector, values, config } = options;
    values.push(formatValue({ ast, allowArray: true }, config));
    return `${selector} = ${formatKeyword("ANY", keywordsLowerCase)}($${values.length})`;
  },
};
```

### Out-of-the-box plugins

> **IMPORTANT NOTE:** The plugins [`IsEmptyPlugin`](#isemptyplugin) and [`IsNullOrEmptyPlugin`](#isnulloremptyplugin)
> are intended to be used on fields which are `TEXT`-like, if you use them on other types (e.g. `TIMESTAMP` or `INTEGER`)
> you might experience errors on SQL validation level, e.g.:
>
> ```text
> error: invalid input syntax for type integer: ""
> ```
>
> These messages could be different depending on the underlying SQL driver/framework implementation So, be careful when using it.

#### `MapInToEqualsAnyPlugin`

Plugin for in-overwrite (is-any) operation.

[PostgreSQL](https://www.postgresqltutorial.com/postgresql-tutorial/postgresql-any/) mapping:

- `field=in=(1,2)` => `field = ANY(ARRAY[1, 2])`

#### `MapOutToNotEqualsAllPlugin`

Plugin for out-overwrite (not-all) operation.
[PostgreSQL](https://www.postgresqltutorial.com/postgresql-tutorial/postgresql-all/) mapping:

- `field=out=(1,2)` => `field <> ALL(ARRAY[1, 2])`

> NOTE: `MapInToEqualsAnyPlugin` and `MapOutToNotEqualsAllPlugin` are useful in the context
> of PostgreSQL, because the overall motivation was to have a solution for following `pg`
> problem: [parameterized query with an `IN` operator](https://github.com/brianc/node-postgres/issues/1452).

#### `IsNullPlugin`

Plugin for an is-null operation.
[SQL](https://www.postgresqltutorial.com/postgresql-tutorial/postgresql-is-null/) mapping:

- `field=null=true` => `field IS null`
- `field=null=false` => `field IS NOT null`

#### `IsEmptyPlugin`

Plugin for an is-empty-string operation.
[SQL](https://www.postgresql.org/docs/current/functions-comparison.html) mapping:

- `field=empty=true` => `field = ''`
- `field=empty=false` => `field <> ''`

#### `IsNullOrEmptyPlugin`

Plugin for an is-null or is-empty-string operation.

[SQL equals](https://www.postgresql.org/docs/current/functions-comparison.html) or
[SQL is-null](https://www.postgresqltutorial.com/postgresql-tutorial/postgresql-is-null/) mapping:

- `field=nullorempty=true` => `(field IS null OR field = '')`
- `field=nullorempty=false` => `NOT (field IS null OR field = '')`

## License

See [LICENSE](./LICENSE).
