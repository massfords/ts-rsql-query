# Changelog

## v1.3.4

**Bugfix:**

- Fix [Boolean value based plugins do not work with validation (in case of typed selector values) and will fail with unexpected error](https://github.com/massfords/ts-rsql-query/issues/10).
- Plugin configuration section of [README.md](./README.md#plugin-configuration) updated.

> IMPORTANT NOTE: the fix affects boolean-value-based plugins (like the provided `IsNullPlugin`) which might be created by
> developers so far in a "non-backwards-compatible" way.
>
> **Migration path**: add `allowedValues: : [ 'value1', value2, ...]` to your `RsqlOperatorPlugin`
> configuration to enable a proper functionality of your custom plugin.

**Internals:**

- Tests added for fix.
- Added new `Makefile` target: `tl` to execute live-DB tests.
- Fix `lastModified` selector-column mapping in `TestQueryConfig` (column was configured case-sensitive in DB but not in selector).

## v1.3.3

**Bugfixes:**

- Fix [Optional "boolean" configuration options checked by key-in-object could resolve to true if the key is set to undefined](https://github.com/massfords/ts-rsql-query/issues/8).

## v1.3.2

**Bugfixes:**

- Fix [No wildcard(s) support for `!=` operator](https://github.com/massfords/ts-rsql-query/issues/6).
- Fixed a bug where `RsqlOperatorPluginToSqlOptions.keywordsLowerCase` was not passed to the options when it would be configured to `true`.
- Corrected implementation examples for plugin section in (./README.md#plugins).

**Internals:**

- Added some bugfix related (non-)equality tests to live-DB.
- Git- and npm-ignored `.vscode/` folder.
- Fixed internal function `toSqlOperator` to return SQL `=` for RSQL `==` operator (actually, case was never used before, but now it is used and fixed therefore).
- Added some bugfix related (non-)equality tests to live-DB.

## v1.3.1

**Internals:**

- Update ``to`node-version: 20.x`.

## v1.3.0

**New feature implementations:**

- New [plugin](./README.md#plugins) architecture with:
  - Creation of custom operator plugins.
  - Overwriting of known (standard) operators.
  - Usage of predefined plugins:
    - Is-Any: Overwrite of `=in=` (mapped to PostgreSQL's `= ANY(...)`).
    - Is-Not-All: Overwrite of `=out=` (mapped to PostgreSQL's `<> ALL(...)`).
    - Is-Null: `=null=[true | false]` => `IS [ NOT ] null`
    - Is-Empty: `=empty=[true | false]` => `[ = | <>] ''`.
    - Is-Null-Or-Empty: `=nullorempty=[true | false]` => `(... IS [ NOT ] null OR ... [ = | <>]  '')`.
  - Exported new function `formatKeyword(keyword: string, keywordsLowerCase = false)` to be usable in plugins.
  - Exported existing function `formatSelector(context: SqlContext, selector: string)` to be usable in plugins.
  - Exported existing function `formatValue({ allowArray, ast }: { ast: ComparisonNode; allowArray?: boolean }, config: StaticQueryConfig)` to be usable in plugins.
- Extended [configuration](./README.md#context-and-configuration-for-the-sql-transform):
  - Plugins from above (`plugins`, default: `undefined`).
  - SQL cosmetics:
    - SQL keyword lower-case and UPPER-case configuration (default: UPPER).
      - **NOTE: Since this was somehow a mixed style before, this is unified to upper-case now and therefore is not fully "backwards compatible".**
    - Plain SQL operators with SPACE around or not (`detachedOperators`, default: `false`).
    - Prefix configuration for `WHERE` (`whereKeywordPrefix`, default: `" "`).

**Internals:**

- Added `.editorconfig`
- Some minor code adaptions/refactorings.
- Some unit tests added.
- Some js-doc added.
- Added new test-coverage script: `npm run test:coverage`.
- `coverage` folder ignored from Git.
- Added a `Makefile` for convenience (optional usage, requires UNIX-like environment).
- Added `Changelog.md`.

## v1.0.0 - v1.2.0

Initial Implementation and bugfixes.
