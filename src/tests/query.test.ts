import type { SqlContext } from "../context";
import { TestQueryConfig } from "./fixture";
import { Base64 } from "js-base64";
import invariant from "tiny-invariant";
import { buildPredicateAndOrderBy } from "../llb/build-sql";

describe("query string tests", () => {
  describe("sql predicate", () => {
    const inputs: Array<{
      filter: string;
      sort: string;
      keyset?: string[];
      expected: string;
      expectedValues: string[];
    }> = [
      {
        filter: "firstName==Alice",
        sort: "-points,lastName,firstName,id",
        keyset: ["2", "Apple", "Alice", "1234-abc"],
        expected:
          "(u.firstName=$1) AND (u.pointBalance,u.lastName,u.firstName,u.id)<($2,$3,$4,$5) ORDER BY u.pointBalance DESC,u.lastName,u.firstName,u.id",
        expectedValues: ["Alice", "2", "Apple", "Alice", "1234-abc"],
      },
      {
        filter: "firstName==Alice",
        sort: "-points,lastName,firstName,id",
        expected:
          "u.firstName=$1 ORDER BY u.pointBalance DESC,u.lastName,u.firstName,u.id",
        expectedValues: ["Alice"],
      },
      {
        filter: "",
        sort: "-points,lastName,firstName,id",
        expected: "ORDER BY u.pointBalance DESC,u.lastName,u.firstName,u.id",
        expectedValues: [],
      },
    ];
    it.each(inputs)(
      "filter:$filter",
      ({ filter, sort, keyset, expected, expectedValues }) => {
        expect.hasAssertions();
        const context: SqlContext = {
          ...TestQueryConfig,
          values: [],
        };
        const result = buildPredicateAndOrderBy({
          filter,
          sort,
          context,
          keyset: keyset ? Base64.encodeURI(JSON.stringify(keyset)) : null,
        });
        invariant(result.isValid);
        expect(result.sql).toStrictEqual(expected);
        expect(context.values).toStrictEqual(expectedValues);
      }
    );

    const inputsWithDetachedOperators: Array<{
      filter: string;
      sort: string;
      keyset?: string[];
      expected: string;
      expectedValues: string[];
    }> = [
      {
        filter: "firstName==Alice",
        sort: "-points,lastName,firstName,id",
        keyset: ["2", "Apple", "Alice", "1234-abc"],
        expected:
          "(u.firstName = $1) AND (u.pointBalance,u.lastName,u.firstName,u.id) < ($2,$3,$4,$5) ORDER BY u.pointBalance DESC,u.lastName,u.firstName,u.id",
        expectedValues: ["Alice", "2", "Apple", "Alice", "1234-abc"],
      },
      {
        filter: "firstName==Alice",
        sort: "-points,lastName,firstName,id",
        expected:
          "u.firstName = $1 ORDER BY u.pointBalance DESC,u.lastName,u.firstName,u.id",
        expectedValues: ["Alice"],
      },
      {
        filter: "",
        sort: "-points,lastName,firstName,id",
        expected: "ORDER BY u.pointBalance DESC,u.lastName,u.firstName,u.id",
        expectedValues: [],
      },
    ];
    it.each(inputsWithDetachedOperators)(
      "filter:$filter with detached operators",
      ({ filter, sort, keyset, expected, expectedValues }) => {
        expect.hasAssertions();
        const context: SqlContext = {
          ...TestQueryConfig,
          detachedOperators: true,
          values: [],
        };
        const result = buildPredicateAndOrderBy({
          filter,
          sort,
          context,
          keyset: keyset ? Base64.encodeURI(JSON.stringify(keyset)) : null,
        });
        invariant(result.isValid);
        expect(result.sql).toStrictEqual(expected);
        expect(context.values).toStrictEqual(expectedValues);
      }
    );
  });
});
