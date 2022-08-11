# ts-rsql-to-sql

[![license](https://img.shields.io/badge/MIT-blue.svg)](https://github.com/massfords/ts-rsql-to-sql/blob/master/LICENSE)
[![npm version](https://badge.fury.io/js/ts-rsql-to-sql.svg)](https://badge.fury.io/js/ts-rsql-to-sql)

[![NPM](https://nodei.co/npm/ts-rsql-to-sql.png?stars=true)](https://www.npmjs.com/package/ts-rsql-to-sql)

## What does it do?

Transforms the AST produced from [ts-rsql](https://github.com/trevor-leach/ts-rsql) into a SQL predicate
that is suitable to append to a base query and execute.

### Example in lax mode without restrictions on the selectors or values

```typescript
import {parseRsql} from "ts-rsql";
import {toSql} from "./to-sql";

const ast = parseRsql("active=true;points=gt=10");
const context: SqlContext = {values: [], lax: true};
const result = toSql(rsql, context);
if (result.isValid) {
    console.log(result.sql);
    /*
        active=$1 and points>$2
     */
} else {
    console.log(result.err);
}
```

### Example in strict mode with mappings to sql defined for the selectors

```typescript
import {parseRsql} from "ts-rsql";
import {toSql} from "./to-sql";

const ast = parseRsql("active=true;points=gt=10");
const context: SqlContext = {
    values: [], selectors: {
        active: {
            sql: "u.active",
            type: "boolean"
        },
        points: {
            sql: "u.pointBalance",
            type: "integer"
        }
    }
};
const result = toSql(rsql, context);
if (result.isValid) {
    console.log(result.sql);
    /*
        u.active=$1 and u.pointBalance>$2
     */
} else {
    console.log(result.err);
}
```

## How it works

- accepts the AST from the ts-rsql
- walk the AST and builds the sql predicate
    - default behavior is literal selector value as the left-hand (**LHS**) side expression 
    - optional config may map the selector to **LHS** expr
    - builds string and appends values to an array

- walk the AST and validate each selector name
    - optional config defines valid selectors
    - if selector not found, then it's invalid
    - if selector defines the type, then validate the type

## Building and running a query

This lib builds the SQL predicate, not the full query. See `to-sql.it.ts` for how complete queries are built and run.

### Example with full query

```typescript
import {parseRsql} from "ts-rsql";
import {toSql} from "./to-sql";

const query = `select name, email, active, dob, tier from tsrsql.users u`;

const ast = parseRsql("active=true;points=gt=10");
const context: SqlContext = {
    values: [], selectors: {
        active: {
            sql: "u.active",
            type: "boolean"
        },
        points: {
            sql: "u.pointBalance",
            type: "integer"
        }
    }
};
const result = toSql(rsql, context);
if (result.isValid) {
    console.log(result.sql);
    /*
        u.active=true and u.pointBalance>10
     */
    const fullQuery = `${query} where ${result.sql}`;
    const rows = await db.manyOrNone(fullQuery, context.values);
}
```

## Pagination

TBD

## Ordering

TBD

## License

See [LICENSE](./LICENSE).
