import { parseRsql } from "ts-rsql";
import { toSql } from "../to-sql";
import { TestSelectors } from "./fixture";

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
  ];
  it.each(inputs)("$rsql", ({ rsql, err }) => {
    expect.hasAssertions();
    const ast = parseRsql(rsql);
    const actual = toSql(ast, { values: [], selectors: TestSelectors });
    expect(actual).toStrictEqual({ isValid: false, err });
  });
});
