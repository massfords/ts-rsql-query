# Changelog

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
