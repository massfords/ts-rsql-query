import { parseRsql } from "ts-rsql";
import { toSql } from "../llb/to-sql";
import { TestQueryConfig, TestQueryConfigWithPlugins } from "./fixture";

describe("validate AST tests", () => {
  const inputs: Array<{ rsql: string; err: string }> = [
    {
      rsql: "bogus==value",
      err: `unknown selector: "bogus"`,
    },
    {
      rsql: "active==yes",
      err: `bad selector value for "active": "yes" is not a boolean`,
    },
    {
      rsql: "tier==DIAMOND",
      err: `bad selector value for "tier": "DIAMOND" must be one of ["GOLD","SILVER","BRONZE"]`,
    },
    {
      rsql: "points=gt=not-an-int",
      err: 'bad selector value for "points": "not-an-int" is not a integer',
    },
    {
      rsql: "birthday=gt=not-a-date;birthday<not-a-date",
      err: 'bad selector value for "birthday": "not-a-date" is not a date',
    },
  ];
  it.each(inputs)("$rsql", ({ rsql, err }) => {
    expect.hasAssertions();
    const ast = parseRsql(rsql);
    const actual = toSql(ast, {
      ...TestQueryConfig,
      values: [],
    });
    expect(actual).toStrictEqual({ isValid: false, err });
  });

  /* Test the edge case related to https://github.com/massfords/ts-rsql-query/issues/8 */
  const inputsForLaxUndefinedCase: Array<{ rsql: string; err: string }> = [
    {
      rsql: "bogus==value",
      err: `unknown selector: "bogus"`,
    },
    {
      rsql: "active==yes",
      err: `bad selector value for "active": "yes" is not a boolean`,
    },
    {
      rsql: "tier==DIAMOND",
      err: `bad selector value for "tier": "DIAMOND" must be one of ["GOLD","SILVER","BRONZE"]`,
    },
    {
      rsql: "points=gt=not-an-int",
      err: 'bad selector value for "points": "not-an-int" is not a integer',
    },
    {
      rsql: "birthday=gt=not-a-date;birthday<not-a-date",
      err: 'bad selector value for "birthday": "not-a-date" is not a date',
    },
  ];
  it.each(inputsForLaxUndefinedCase)("$rsql", ({ rsql, err }) => {
    expect.hasAssertions();
    const ast = parseRsql(rsql);
    const actual = toSql(ast, {
      ...TestQueryConfig,
      values: [],
      /* We have to trick typescript here. */
      lax: undefined as unknown as true,
    });
    expect(actual).toStrictEqual({ isValid: false, err });
  });

  describe("(custom) plugin query tests", () => {
    const inputs: Array<{ rsql: string; err: string }> = [
      {
        rsql: "points=null=invalid",
        err: `bad value for "points": "invalid" (with "=null=" operator), must be one of ["true","false"]`,
      },
      {
        rsql: "tier=nullorempty=invalid",
        err: `bad value for "tier": "invalid" (with "=nullorempty=" operator), must be one of ["true","false"]`,
      },
      {
        rsql: "tier=empty=invalid",
        err: `bad value for "tier": "invalid" (with "=empty=" operator), must be one of ["true","false"]`,
      },
    ];
    it.each(inputs)("$rsql", ({ rsql, err }) => {
      expect.hasAssertions();
      const ast = parseRsql(rsql);
      const actual = toSql(ast, {
        ...TestQueryConfigWithPlugins,
        values: [],
      });
      expect(actual).toStrictEqual({ isValid: false, err });
    });
  });
});
