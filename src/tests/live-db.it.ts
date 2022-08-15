import {
  db,
  destroyDb,
  idForTestRecord,
  initDb,
  UserRecord,
} from "./fixture-db";
import invariant from "tiny-invariant";
import { TestSelectors } from "./fixture";
import { SqlContext } from "../context";
import { assembleFullQuery, mustPredicateAndOrderBy } from "../query";
import { lastRowToKeySet, toKeySet } from "../sort";
import { parseSort, SortNode } from "ts-rsql";

describe("runs the sql with a real db connection", () => {
  // SQL used for the main portion of the listing query.
  // This is a simple example where all rows are selected.
  // The selected columns MUST include all selectors used in the sort expression
  // noinspection SqlResolve
  const mainSql = `select u.firstName    as "firstName",
                          u.lastName     as "lastName",
                          u.email,
                          u.active,
                          u.dob,
                          u.tier,
                          u.id,
                          u.pointbalance as points
                   from tsrsql.users u`;

  beforeAll(async () => {
    // this assumes the env has the correct auth info
    process.env.DB_NAME = "postgres";
    await initDb();
  });

  afterAll(async () => {
    await destroyDb();
  });

  describe("full query tests", () => {
    // The test table is only loaded with 3 records
    // Each of these tests runs the base query with the given filter
    // and asserts the row count
    const inputs: Array<{ filter: string; rows: number }> = [
      {
        filter: "firstName==Alice",
        rows: 1,
      },
      {
        filter: "firstName==Alice,firstName==Bo*",
        rows: 2,
      },
      {
        filter: "firstName==Alice;active==false",
        rows: 1,
      },
      {
        filter: "firstName==Alice;points==1",
        rows: 1,
      },
      {
        filter: "points=gt=100",
        rows: 0,
      },
      {
        filter: "points=lt=100",
        rows: 3,
      },
      {
        filter: "birthday=gt=1950-01-02;birthday<1960-02-01",
        rows: 1,
      },
      {
        filter: "birthday=gt=1950-01-02;birthday<=1960-01-03",
        rows: 1,
      },
      {
        filter: "birthday=gt=1950-01-02;birthday<1960-01-03",
        rows: 0,
      },
    ];
    it.each(inputs)("$filter", async ({ filter, rows }) => {
      expect.hasAssertions();
      invariant(db);
      const context: SqlContext = { values: [], selectors: TestSelectors };
      const sql = assembleFullQuery({
        mainSql,
        concatStrategy: "where",
        sqlPredicateAndOrderBy: mustPredicateAndOrderBy({
          filter,
          context,
          sort: [],
        }),
      });
      expect(await db.manyOrNone(sql, context.values)).toHaveLength(rows);
    });
  });

  describe("pagination", () => {
    let parsedSorts: SortNode[] | null = null;

    beforeAll(() => {
      // sort expression used for the tests below.
      // When returning all rows, we should get [Charlie, Bob, Alice]
      // since the ordering is descending by points.
      parsedSorts = parseSort("-points, lastName, firstName, id");
    });
    describe("simple pagination tests", () => {
      const inputs: Array<{
        label: string;
        keyset: string | null;
        firstNameFromEachRow: string[];
      }> = [
        {
          label: "show all",
          // null keyset means no records are skipped
          keyset: null,
          firstNameFromEachRow: ["Charlie", "Bob", "Alice"],
        },
        {
          label: "after Charlie",
          keyset: toKeySet([
            "3",
            "Cupcake",
            "Charlie",
            idForTestRecord("Charlie"),
          ]),
          firstNameFromEachRow: ["Bob", "Alice"],
        },
        {
          label: "after Bob",
          keyset: toKeySet(["2", "Banana", "Bob", idForTestRecord("Bob")]),
          firstNameFromEachRow: ["Alice"],
        },
        {
          label: "after Alice",
          keyset: toKeySet(["1", "Apple", "Alice", idForTestRecord("Alice")]),
          firstNameFromEachRow: [],
        },
      ];
      it.each(inputs)("$label", async ({ keyset, firstNameFromEachRow }) => {
        expect.hasAssertions();
        invariant(parsedSorts);
        invariant(db);
        const context: SqlContext = {
          values: [],
          selectors: TestSelectors,
          keyset,
        };
        const actual = await db.manyOrNone(
          assembleFullQuery({
            mainSql: mainSql,
            concatStrategy: "where",
            sqlPredicateAndOrderBy: mustPredicateAndOrderBy({
              filter: null,
              sort: parsedSorts,
              context,
            }),
          }),
          context.values
        );
        expect(
          actual.map(({ firstName }: { firstName: string }) => firstName)
        ).toStrictEqual(firstNameFromEachRow);
      });
    });
    it("should be able to walk the full list one record at a time", async () => {
      expect.hasAssertions();
      invariant(db);
      invariant(parsedSorts);
      const results: string[] = [];
      const keysets: Array<string | null> = [];
      let keyset: string | null = null;
      while (results.length < 3) {
        const context: SqlContext = {
          values: [],
          selectors: TestSelectors,
          keyset,
        };
        keysets.push(keyset);
        const rows = await db.manyOrNone<UserRecord>(
          assembleFullQuery({
            mainSql,
            concatStrategy: "where",
            sqlPredicateAndOrderBy: mustPredicateAndOrderBy({
              filter: null,
              sort: parsedSorts,
              context,
            }),
          }) + ` limit 1`,
          context.values
        );
        const lastRow = rows[rows.length - 1];
        invariant(lastRow);
        keyset = toKeySet(lastRowToKeySet(lastRow, parsedSorts, context));
        results.push(lastRow.firstName);
      }
      expect(results).toStrictEqual(["Charlie", "Bob", "Alice"]);
      expect(keysets).toMatchInlineSnapshot(`
        Array [
          null,
          "WyIzIiwiQ3VwY2FrZSIsIkNoYXJsaWUiLCIwMzk5YzcyNC01ODI5LTU0NTgtYjdhYy1hYzZhMjk4ZTBlNGIiXQ",
          "WyIyIiwiQmFuYW5hIiwiQm9iIiwiNzEzOWU4MWUtZGMxMy01NGQxLThjMTAtNmZlNmY3YmZiMzRlIl0",
        ]
      `);
    });
  });
});
