import type { ComparisonNode } from "ts-rsql";

/**
 * The selector configuration.
 */
export type SelectorConfig = {
  /**
   * The value for the left-hand side of a SQL expression.
   * If not set then the selector value is used.
   */
  readonly sql?: string;
  /**
   * Optional value for use in building a keyset.
   * Provides a string to access this selector from the
   * result set returned from its query.
   * If not set, then the selector value is used.
   */
  readonly alias?: string;
  /**
   * Defines the type for the selector and enables validation at runtime.
   *
   * > NOTE: there is no validation defined for `string`.
   *
   * @default string
   */
  readonly type?:
    | "string"
    | "number"
    | "integer"
    | "date"
    | "date-time"
    | "boolean";
  /**
   * Defines the set of permitted values for this selector.
   */
  readonly enum?: string[];
  /**
   * Whether the selector is marked as sortable. If `false` it will result in invalid SQL
   * if the selector is part of the `SORT BY`.
   */
  readonly sortable?: boolean;
};

/**
 * The TS values mappable to SQL values.
 */
export type Value = string | number | boolean | string[] | number[];

/**
 * The options for a custom or an overwrite of a known RSQL operator SQL transformation options.
 */
export type RsqlOperatorPluginToSqlOptions = {
  /**
   * The current already formatted(!) selector.
   *
   * > IMPORTANT NOTE: do NOT use `ComparisonNode.selector` directly from of
   * > `RsqlOperatorPluginToSqlOptions.ast`!
   */
  readonly selector: string;
  /**
   * The comparison node AST.
   */
  readonly ast: ComparisonNode;
  /**
   * This array is used to append values extracted from the filter
   * and order by handling for use in a parameterized query.
   * Values extracted from the filter and order by handling are appended to this array.
   * The length after adding a value determines the offset for its query parameter (`$1`,
   * `$2`, etc).
   *
   * > IMPORTANT NOTE: add a value only if you add an offset for its query parameter in
   * > `RsqlOperatorPlugin.toSql(options: ToSqlOptions)` or you may
   * > experience strange value assignments!
   */
  readonly values: Value[];
  /**
   * Formatting option whether to print SQL keywords lower-case.
   *
   * @default false
   */
  readonly keywordsLowerCase?: true | undefined;
  /**
   * The static query configuration.
   */
  readonly config: StaticQueryConfig;
};

/**
 * The plugin for a custom or an overwrite of a known (aka standard) RSQL operator.
 */
export type RsqlOperatorPlugin = {
  /**
   * The new custom operator starting and ending with `=`, e.g. `=customOperator=`
   * or an overwrite of a known RSQL operator.
   *
   * > NOTE: actually, this is case-insensitive during parsing/validation. Therefore,
   * > finding the plugin is done by converting this operator name to lower-case first.
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
   * Pass your plugin's allowed values for validation.
   * Use this if you plugin accepts other values than configured in the selector's `type`.
   *
   * @default No validation action.
   */
  readonly allowedValues?: string[];
};

/**
 * The static query configuration.
 */
export type StaticQueryConfig = {
  /**
   * The main query part of the resulting SQL.
   */
  readonly mainQuery: string;
  /**
   * Defines the behavior for mapping the selector to a SQL expression.
   * Allows for simple logical to physical mapping.
   * Additional mapping hints available with SelectorConfig as a value.
   */
  readonly selectors: Record<string, string | SelectorConfig>;
  /**
   * Use `"where"` if the mainQuery does not contain a `WHERE` clause.
   * Use `"and"` if the mainQuery has an existing `WHERE` clause.
   */
  readonly concatStrategy: "where" | "and";
  /**
   * If present, selectors are not required to be defined, but are enforced if defined.
   *
   * @default false
   */
  readonly lax?: true;
  /**
   * The custom or overwrite RSQL operator plugins.
   */
  readonly plugins?: RsqlOperatorPlugin[];
  /**
   * Whether to print SQL keywords lower-case.
   *
   * @default false
   */
  readonly keywordsLowerCase?: true;
  /**
   * A prefix for `WHERE` keyword to enable a more custom formatting of SQL code
   * (e.g. a `WHERE` on next line).
   *
   * @default ' ' (SPACE)
   */
  readonly whereKeywordPrefix?: string;
  /**
   * Formatting option whether to print SQL operators with SPACE around, e.g. `'field >= 3'` (`true`) instead of `'field>=3'` (`false`).
   *
   * @default false
   */
  readonly detachedOperators?: boolean;
};

/**
 * The RSQL to SQL transformation context.
 */
export type SqlContext = {
  /**
   * This array is used to append values extracted from the filter
   * and order by handling for use in a parameterized query.
   * Values extracted from the filter and order by handling are appended to this array.
   * The length after adding a value determines the offset for its query parameter (`$1`,
   * `$2`, etc).
   */
  readonly values: Value[];
} & StaticQueryConfig;
