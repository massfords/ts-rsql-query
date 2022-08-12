import { toOrderBy } from "../sort";
import { SqlContext } from "../context";
import { TestSelectors } from "./fixture";
import invariant from "tiny-invariant";
import { Base64 } from "js-base64";

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
        values: [],
        selectors: TestSelectors,
      };
      const result = toOrderBy(sort, context);
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
          values: [],
          selectors: TestSelectors,
          keyset: Base64.encodeURI(JSON.stringify(paging.keyset)),
        };
        const result = toOrderBy(sort, context);
        invariant(result.isValid);
        expect(result.seek).toStrictEqual(paging.seek);
        expect(context.values).toStrictEqual(paging.keyset);
      }
    );
  });
});
