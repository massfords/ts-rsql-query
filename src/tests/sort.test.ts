import { toKeySet } from "../keyset";
import { SqlContext } from "../context";
import { TestQueryConfig } from "./fixture";
import invariant from "tiny-invariant";
import { toOrderBy } from "../llb/to-orderby";

describe("sorting tests", () => {
  const inputs: Array<{
    sort: string;
    sql: string;
    paging?: {
      keyset: string[];
      seek: string;
    };
  }> = [
    {
      sort: "-points, lastName, firstName, id",
      sql: "u.pointBalance DESC,u.lastName,u.firstName,u.id",
    },
    {
      sort: "-points, lastName, firstName, id",
      sql: "u.pointBalance DESC,u.lastName,u.firstName,u.id",
      paging: {
        keyset: ["2", "Banana", "Bob", "1234-abc"],
        seek: "(u.pointBalance,u.lastName,u.firstName,u.id)<($1,$2,$3,$4)",
      },
    },
  ];
  describe("order by expression", () => {
    it.each(inputs)("$sort", ({ sort, sql }) => {
      expect.hasAssertions();
      const context: SqlContext = {
        ...TestQueryConfig,
        values: [],
      };
      const result = toOrderBy(sort, null, context);
      invariant(result.isValid);
      expect(result.orderby).toStrictEqual(sql);
    });
  });

  describe("seek expressions", () => {
    it.each(inputs.filter((input) => Boolean(input.paging)))(
      "seek: $sort",
      ({ sort, paging }) => {
        expect.hasAssertions();
        invariant(paging);
        const context: SqlContext = {
          ...TestQueryConfig,
          values: [],
        };
        const result = toOrderBy(sort, toKeySet(paging.keyset), context);
        invariant(result.isValid);
        expect(result.seek).toStrictEqual(paging.seek);
        expect(context.values).toStrictEqual(paging.keyset);
      }
    );
  });
});
