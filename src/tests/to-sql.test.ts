const mockMaybeExecuteRsqlOperatorPlugin = jest.fn();
jest.mock("../plugin", () => ({
  maybeExecuteRsqlOperatorPlugin: mockMaybeExecuteRsqlOperatorPlugin,
}));

import { formatKeyword, toSql } from "../llb/to-sql";
import { parseRsql } from "ts-rsql";
import type { SqlContext, Value } from "../context";
import { TestQueryConfig } from "./fixture";

describe("tests for sql generation", () => {
  describe("formatKeyword", () => {
    it("should format SQL keyword to upper case if configured by default", () => {
      expect(formatKeyword("select")).toBe("SELECT");
    });

    it("should format SQL keyword to lower case if configured to true", () => {
      expect(formatKeyword("SELECT", true)).toBe("select");
    });
  });

  const inputs: Array<{
    filter: string;
    sql: string;
    values: Value[];
  }> = [
    {
      filter: `name=="Kill Bill";!year=gt=2003`,
      sql: `(name=$1 AND NOT(year>$2))`,
      values: ["Kill Bill", "2003"],
    },
    {
      filter: `name=="Kill Bill";!year<=2003`,
      sql: `(name=$1 AND NOT(year<=$2))`,
      values: ["Kill Bill", "2003"],
    },
    {
      filter: `genres=in=(sci-fi,action);(director=='Christopher Nolan',actor==*Bale);year=ge=2000`,
      sql: `(genres IN $1 AND (director=$2 OR actor ILIKE $3) AND year>=$4)`,
      values: [["sci-fi", "action"], "Christopher Nolan", "%Bale", "2000"],
    },
    {
      filter: `director.lastName==Nolan;year=ge=2000;year=lt=2010`,
      sql: `(director.lastName=$1 AND year>=$2 AND year<$3)`,
      values: ["Nolan", "2000", "2010"],
    },
    {
      filter: `director.lastName==Nolan and year>=2000 and year<2010`,
      sql: `(director.lastName=$1 AND year>=$2 AND year<$3)`,
      values: ["Nolan", "2000", "2010"],
    },
    {
      filter: `genres=in=(sci-fi,action);genres=out=(romance,animated,horror),director==*Tarantino`,
      sql: `((genres IN $1 AND genres NOT IN $2) OR director ILIKE $3)`,
      values: [
        ["sci-fi", "action"],
        ["romance", "animated", "horror"],
        "%Tarantino",
      ],
    },
    {
      filter: `name==Bill*`,
      sql: `name ILIKE $1`,
      values: ["Bill%"],
    },
    {
      filter: `name==*Bill*`,
      sql: `name ILIKE $1`,
      values: ["%Bill%"],
    },
  ];
  it.each(inputs)("filter", ({ filter, sql, values }) => {
    expect.hasAssertions();
    const ast = parseRsql(filter);
    const vals: Value[] = [];
    const actual = toSql(ast, {
      ...TestQueryConfig,
      values: vals,
      selectors: {},
      lax: true,
    });
    expect(actual).toStrictEqual({ isValid: true, sql });
    expect(vals).toStrictEqual(values);
  });

  const inputsWithDetachedOperators: Array<{
    filter: string;
    sql: string;
    values: Value[];
  }> = [
    {
      filter: `name=="Kill Bill";!year=gt=2003`,
      sql: `(name = $1 AND NOT(year > $2))`,
      values: ["Kill Bill", "2003"],
    },
    {
      filter: `name=="Kill Bill";!year<=2003`,
      sql: `(name = $1 AND NOT(year <= $2))`,
      values: ["Kill Bill", "2003"],
    },
    {
      filter: `genres=in=(sci-fi,action);(director=='Christopher Nolan',actor==*Bale);year=ge=2000`,
      sql: `(genres IN $1 AND (director = $2 OR actor ILIKE $3) AND year >= $4)`,
      values: [["sci-fi", "action"], "Christopher Nolan", "%Bale", "2000"],
    },
    {
      filter: `director.lastName==Nolan;year=ge=2000;year=lt=2010;foo!=foo;foo==bar`,
      sql: `(director.lastName = $1 AND year >= $2 AND year < $3 AND foo <> $4 AND foo = $5)`,
      values: ["Nolan", "2000", "2010", "foo", "bar"],
    },
    {
      filter: `director.lastName==Nolan and year>=2000 and year<2010`,
      sql: `(director.lastName = $1 AND year >= $2 AND year < $3)`,
      values: ["Nolan", "2000", "2010"],
    },
    {
      filter: `genres=in=(sci-fi,action);genres=out=(romance,animated,horror),director==*Tarantino`,
      sql: `((genres IN $1 AND genres NOT IN $2) OR director ILIKE $3)`,
      values: [
        ["sci-fi", "action"],
        ["romance", "animated", "horror"],
        "%Tarantino",
      ],
    },
    {
      filter: `name==Bill*`,
      sql: `name ILIKE $1`,
      values: ["Bill%"],
    },
    {
      filter: `name==*Bill*`,
      sql: `name ILIKE $1`,
      values: ["%Bill%"],
    },
  ];
  it.each(inputsWithDetachedOperators)(
    "filter with detached operators",
    ({ filter, sql, values }) => {
      expect.hasAssertions();
      const ast = parseRsql(filter);
      const vals: Value[] = [];
      const actual = toSql(ast, {
        ...TestQueryConfig,
        detachedOperators: true,
        values: vals,
        selectors: {},
        lax: true,
      });
      expect(actual).toStrictEqual({ isValid: true, sql });
      expect(vals).toStrictEqual(values);
    },
  );

  it("should use selector when present as string", () => {
    expect.hasAssertions();
    const ast = parseRsql("name==value");
    const vals: Value[] = [];
    const actual = toSql(ast, {
      ...TestQueryConfig,
      values: vals,
      selectors: {
        name: "tableName.colName",
      },
    });
    expect(actual).toStrictEqual({
      isValid: true,
      sql: "tableName.colName=$1",
    });
  });

  it("should use selector when present as config", () => {
    expect.hasAssertions();
    const ast = parseRsql("name==value");
    const vals: Value[] = [];
    const actual = toSql(ast, {
      ...TestQueryConfig,
      values: vals,
      selectors: {
        name: { sql: "tableName.colName", type: "string" },
      },
    });
    expect(actual).toStrictEqual({
      isValid: true,
      sql: "tableName.colName=$1",
    });
  });

  it("should use values array for offsets", () => {
    expect.hasAssertions();
    const ast = parseRsql("name==value");
    const values: Value[] = ["some-other-value"];
    const actual = toSql(ast, {
      ...TestQueryConfig,
      values,
      selectors: {},
      lax: true,
    });
    expect(actual).toStrictEqual({ isValid: true, sql: "name=$2" });
    expect(values).toStrictEqual(["some-other-value", "value"]);
  });

  describe("plugin", () => {
    beforeEach(() => {
      mockMaybeExecuteRsqlOperatorPlugin.mockClear();
    });

    it("should be executed if configured", () => {
      expect.hasAssertions();

      const operator = "=isNull=";
      const ast = parseRsql(`name${operator}true`);

      /* Just simulate that the function is called and returns a value. */
      const expectedSql = "plugin result";
      mockMaybeExecuteRsqlOperatorPlugin.mockReturnValueOnce(expectedSql);

      const context: SqlContext = {
        ...TestQueryConfig,
        plugins: [
          {
            operator,
            toSql: jest.fn(),
          },
        ],
        values: [],
        selectors: {},
        lax: true,
      };

      const actual = toSql(ast, context);

      expect(actual).toStrictEqual({ isValid: true, sql: expectedSql });

      expect(mockMaybeExecuteRsqlOperatorPlugin).toHaveBeenCalledTimes(1);
      expect(mockMaybeExecuteRsqlOperatorPlugin).toHaveBeenCalledWith(
        context,
        ast,
        "name",
      );
    });

    it("should not be executed if configured plugins are empty", () => {
      expect.hasAssertions();

      const operator = "==";
      const ast = parseRsql(`name${operator}value`);

      /* Just simulate that the function is called but plugin is not found and returns undefined. */
      mockMaybeExecuteRsqlOperatorPlugin.mockReturnValueOnce(undefined);

      const context: SqlContext = {
        ...TestQueryConfig,
        plugins: [],
        values: [],
        selectors: {},
        lax: true,
      };

      const actual = toSql(ast, context);

      expect(actual).toStrictEqual({ isValid: true, sql: "name=$1" });

      expect(mockMaybeExecuteRsqlOperatorPlugin).toHaveBeenCalledTimes(1);
      expect(mockMaybeExecuteRsqlOperatorPlugin).toHaveBeenCalledWith(
        context,
        ast,
        "name",
      );
    });

    it("should not be executed if plugins are not configured", () => {
      expect.hasAssertions();

      const operator = "==";
      const ast = parseRsql(`name${operator}value`);

      /* Just simulate that the function is called but plugin is not found and returns undefined. */
      mockMaybeExecuteRsqlOperatorPlugin.mockReturnValueOnce(undefined);

      const context: SqlContext = {
        ...TestQueryConfig,
        values: [],
        selectors: {},
        lax: true,
      };

      const actual = toSql(ast, context);

      expect(actual).toStrictEqual({ isValid: true, sql: "name=$1" });

      expect(mockMaybeExecuteRsqlOperatorPlugin).toHaveBeenCalledTimes(1);
      expect(mockMaybeExecuteRsqlOperatorPlugin).toHaveBeenCalledWith(
        context,
        ast,
        "name",
      );
    });
  });
});
