# ts-rsql-to-sql

[![license](https://img.shields.io/badge/MIT-blue.svg)](https://github.com/massfords/ts-rsql-to-sql/blob/master/LICENSE)
[![npm version](https://badge.fury.io/js/ts-rsql-to-sql.svg)](https://badge.fury.io/js/ts-rsql-to-sql)
[![NPM](https://nodei.co/npm/ts-rsql-to-sql.png?stars=true)](https://www.npmjs.com/package/ts-rsql-to-sql)

## What does it do?

Transforms the AST produced from [ts-rsql](https://github.com/trevor-leach/ts-rsql) into a SQL predicate
that is suitable to append to a base query and execute.

Consider a service that lists players in a game based on the number of points they have in descending order and then alphabetically by name.
```sql
select * from tsrsql.users u
order by u.pointbalance DESC, u.lastname, u.firstname, u.id
```

### Filtering
 
The query builder leverages the RSQL expression parser from [ts-rsql](https://github.com/trevor-leach/ts-rsql) and transforms the resulting AST to SQL.

| RSQL         | SQLContext Selector Config                          | SQL Output          | Values  |
|--------------|-----------------------------------------------------|---------------------|---------|
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

| Sort Expressions                   | SQLContext Selector Config     | SQL Output                                                |
|------------------------------------|--------------------------------|-----------------------------------------------------------|
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
    selectors: {
        points: {
            sql: "u.pointBalance",
            type: "integer"
        },
        lastName: "u.lastName",
        firstName: "u.firstName",
        id: "u.id"
    }
};
```

**SQL Output**: `order by u.pointbalance DESC, u.lastName, u.firstName, u.id`

#### SqlContext for the page after the **keyset** row

**Sort Expression**: `-points, lastName, firstName, id`

**SQLContext**
```typescript
const context: SqlContext = {
    values: [],
    keyset: "base64-encoded-json-array....",
    selectors: {
        points: {
            sql: "u.pointBalance",
            type: "integer"
        },
        lastName: "u.lastName",
        firstName: "u.firstName",
        id: "u.id"
    }
};
```

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
import {Base64} from "js-base64";

// the values in the array come from the last row for the current page. 
// currently, there's nothing in this library that helps build this.
const keyset = Base64.encodeURI(JSON.stringify(["2","Banana","Bob","ba851221-c545-461f-9427-d708829f84b1"]));
```

## Building and running a query

This lib builds the SQL predicate, not the full query. See `to-sql.it.ts` for how complete queries are built and run.


## License
See [LICENSE](./LICENSE).
