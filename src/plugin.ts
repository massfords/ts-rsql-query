import invariant from "tiny-invariant";
import type { ComparisonNode } from "ts-rsql";
import type {
  RsqlOperatorPlugin,
  RsqlOperatorPluginToSqlOptions,
  SqlContext,
} from "./context";
import { isKnownOperator } from "./llb/operators";
import { formatKeyword, formatValue } from "./llb/to-sql";

/**
 * Custom RSQL operators supported out-of-the-box by this library.
 */
export const CustomOperator = {
  IS_EMPTY: "=empty=",
  IS_NULL: "=null=",
  IS_NULL_OR_EMPTY: "=nullorempty=",
} as const;

/**
 * Overwritten RSQL operators supported out-of-the-box by this library.
 */
export const OverwrittenOperator = {
  IN: "=in=",
  OUT: "=out=",
} as const;

/**
 * Executes any plugin found for RSQL `currentOperator`. If none found, it returns `undefined`.
 *
 * @param context - The SQL context.
 * @param ast - The comparison AST node.
 * @param formattedSelector - The formatted selector.
 * @returns The plugin result (if plugin found) or `undefined`.
 */
export const maybeExecuteRsqlOperatorPlugin = (
  context: SqlContext,
  ast: ComparisonNode,
  formattedSelector: string
): string | undefined => {
  const { plugins, values } = context;
  /* Check for plugin (custom operator or overwrite of known operator). */
  const plugin = plugins?.length
    ? plugins.find((plugin) => plugin.operator.toLowerCase() === ast.operator)
    : undefined;
  if (plugin) {
    invariant(
      /* Case: overwrite any known operator. */
      isKnownOperator(ast.operator) ||
        /* Case: new operator. */
        (ast.operator.startsWith("=") && ast.operator.endsWith("=")),
      `invalid custom RSQL operator, must start and end with '=',  but was: '${ast.operator}'`
    );

    if (plugin.invariant) {
      plugin.invariant(ast);
    }

    return plugin.toSql({
      selector: formattedSelector,
      ast,
      values,
      config: context,
    });
  }

  return undefined;
};

/**
 * Invariant which checks if the passed AST has an operand and `'true'` or `'false'` as value.
 *
 * @param ast - The AST object.
 */
export const isBooleanValueInvariant = (ast: ComparisonNode): void => {
  const message = "operator value must be 'true' or 'false'";
  invariant(ast.operands, `operator must have one value, ${message}`);
  invariant(ast.operands[0], `operator must have one value, ${message}`);
  invariant(
    ast.operands[0] === "true" || ast.operands[0] === "false",
    `${message}, but was: '${ast.operands[0]}'`
  );
};

/**
 * Plugin for in-overwrite (is-any) operation.
 * [PostgreSQL](https://www.postgresqltutorial.com/postgresql-tutorial/postgresql-any/) mapping:
 *
 * - `field=in=(1,2)` => `field = ANY(ARRAY[1, 2])`
 *
 * > NOTE: this is useful in the context of PostgreSQL, because the overall motivation
 * > was to have a solution for following `pg` problem: [parameterized query with an
 * > `IN` operator](https://github.com/brianc/node-postgres/issues/1452).
 */
export const MapInToEqualsAnyPlugin: RsqlOperatorPlugin = {
  operator: OverwrittenOperator.IN,
  invariant: (ast: ComparisonNode): void => {
    invariant(ast.operands);
  },
  toSql: (options: RsqlOperatorPluginToSqlOptions): string => {
    const { ast, keywordsLowerCase, selector, values, config } = options;
    values.push(formatValue({ ast, allowArray: true }, config));
    return /* sql */ `${selector} = ${formatKeyword(
      "ANY",
      keywordsLowerCase
    )}($${values.length})`;
  },
};

/**
 * Plugin for out-overwrite (not-all) operation.
 * [PostgreSQL](https://www.postgresqltutorial.com/postgresql-tutorial/postgresql-all/) mapping:
 *
 * - `field=out=(1,2)` => `field <> ALL(ARRAY[1, 2])`
 *
 * > NOTE: this is useful in the context of PostgreSQL, because the overall motivation
 * > was to have a solution for following `pg` problem: [parameterized query with an
 * > `IN` operator](https://github.com/brianc/node-postgres/issues/1452).
 */
export const MapOutToNotEqualsAllPlugin: RsqlOperatorPlugin = {
  operator: OverwrittenOperator.OUT,
  invariant: (ast: ComparisonNode): void => {
    invariant(ast.operands);
  },
  toSql: (options: RsqlOperatorPluginToSqlOptions): string => {
    const { ast, keywordsLowerCase, selector, values, config } = options;
    values.push(formatValue({ ast, allowArray: true }, config));
    return /* sql */ `${selector} <> ${formatKeyword(
      "ALL",
      keywordsLowerCase
    )}($${values.length})`;
  },
};

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
    return /* sql */ `${selector} ${formatKeyword("IS", keywordsLowerCase)}${
      (operands as string[])[0] === "false"
        ? ` ${formatKeyword("NOT", keywordsLowerCase)}`
        : ""
    } null`;
  },
};

/**
 * Plugin for an is-empty-string operation.
 * [SQL](https://www.postgresql.org/docs/current/functions-comparison.html) mapping:
 *
 * - `field=empty=true` => `field = ''`
 * - `field=empty=false` => `field <> ''`
 *
 * > **IMPORTANT NOTE:** The plugin `IsEmptyPlugin is intended to be
 * > used on fields which are `TEXT`-like, if you use them on other types (e.g. `TIMESTAMP`)
 * > you might experience errors on SQL or RSQL validation level. So, be careful when using it.
 */
export const IsEmptyPlugin: RsqlOperatorPlugin = {
  operator: CustomOperator.IS_EMPTY,
  invariant: isBooleanValueInvariant,
  toSql: (options: RsqlOperatorPluginToSqlOptions): string => {
    const {
      selector,
      ast: { operands },
    } = options;
    return /* sql */ `${selector} ${
      (operands as string[])[0] === "true" ? "=" : "<>"
    } ''`;
  },
};

/**
 * Plugin for an is-null or is-empty-string operation.
 * [SQL equals](https://www.postgresql.org/docs/current/functions-comparison.html) or
 * [SQL is-null](https://www.postgresqltutorial.com/postgresql-tutorial/postgresql-is-null/) mapping:
 *
 * - `field=nullorempty=true` => `(field IS null OR field = '')`
 * - `field=nullorempty=false` => `NOT (field IS null OR field = '')`
 *
 * > **IMPORTANT NOTE:** The plugin `IsNullOrEmptyPlugin` is intended to be
 * > used on fields which are `TEXT`-like, if you use them on other types (e.g. `TIMESTAMP`)
 * > you might experience errors on SQL or RSQL validation level. So, be careful when using it.
 */
export const IsNullOrEmptyPlugin: RsqlOperatorPlugin = {
  operator: CustomOperator.IS_NULL_OR_EMPTY,
  invariant: isBooleanValueInvariant,
  toSql: (options: RsqlOperatorPluginToSqlOptions): string => {
    const {
      keywordsLowerCase,
      ast: { operands },
    } = options;
    const reverse = (operands as string[])[0] === "false";
    const maybeReversedOptions = {
      ...options,
      ast: { operands: reverse ? ["true"] : operands } as ComparisonNode,
    };
    return /* sql */ `${
      reverse ? `${formatKeyword("NOT", keywordsLowerCase)} ` : ""
    }(${IsNullPlugin.toSql(maybeReversedOptions)} ${formatKeyword(
      "OR",
      keywordsLowerCase
    )} ${IsEmptyPlugin.toSql(maybeReversedOptions)})`;
  },
};
