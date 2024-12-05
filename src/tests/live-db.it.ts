import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from "testcontainers";
import invariant from "tiny-invariant";
import { parseSort, SortNode } from "ts-rsql";
import type { SqlContext } from "../context";
import { lastRowToKeySet, toKeySet } from "../keyset";
import { assembleFullQuery } from "../query";
import { TestQueryConfig, TestQueryConfigWithPlugins } from "./fixture";
import {
  db,
  destroyDb,
  idForTestRecord,
  initDb,
  UserRecord,
} from "./fixture-db";

describe("runs the sql with a real db connection", () => {
  let startedContainer: StartedPostgreSqlContainer | null = null;

  beforeAll(async () => {
    startedContainer = await new PostgreSqlContainer()
      .withUsername("postgres")
      .start();
    await initDb(startedContainer);
  });

  afterAll(async () => {
    await destroyDb();
    await startedContainer?.stop();
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
        filter: "firstName==*Alice",
        rows: 1,
      },
      {
        filter: "firstName==Alice*",
        rows: 1,
      },
      {
        filter: "firstName==*Alice*",
        rows: 1,
      },
      {
        filter: "firstName!=Alice",
        rows: 2,
      },
      {
        filter: "firstName!=*Alice",
        rows: 2,
      },
      {
        filter: "firstName!=Alice*",
        rows: 2,
      },
      {
        filter: "firstName!=*Alice*",
        rows: 2,
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
        filter: "points=gt=1",
        rows: 2,
      },
      {
        filter: "points<=3",
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
      const context: SqlContext = {
        ...TestQueryConfig,
        values: [],
      };
      const sql = assembleFullQuery(
        {
          filter,
          sort: null,
          keyset: null,
        },
        context,
      );
      invariant(sql.isValid);
      expect(await db.manyOrNone(sql.sql, context.values)).toHaveLength(rows);
    });
  });

  describe("(custom) plugin query tests", () => {
    // The test table is only loaded with 3 records
    // Each of these tests runs the base query with the given filter
    // and asserts the row count
    const inputs: Array<{ filter: string; rows: number }> = [
      /* Custom operator tests: IS [NOT] null, = '', <> '' and combinations. */
      {
        filter: "address=null=true",
        rows: 3,
      },
      {
        filter: "address=null=false",
        rows: 0,
      },
      {
        filter: "interest=empty=true",
        rows: 3,
      },
      {
        filter: "interest=empty=false",
        rows: 0,
      },
      {
        filter: "address=nullorempty=true",
        rows: 3,
      },
      {
        filter: "address=nullorempty=false",
        rows: 0,
      },
      {
        filter: "interest=nullorempty=true",
        rows: 3,
      },
      {
        filter: "interest=nullorempty=false",
        rows: 0,
      },
      {
        filter: "address=null=true,interest=empty=false",
        rows: 3,
      },
      {
        filter: "address=null=true;interest=empty=false",
        rows: 0,
      },
      {
        filter: "address=null=false,interest=empty=true",
        rows: 3,
      },
      {
        filter: "address=null=false;interest=empty=true",
        rows: 0,
      },
      {
        filter: "address=nullorempty=true,interest=nullorempty=false",
        rows: 3,
      },
      {
        filter: "address=nullorempty=true;interest=nullorempty=false",
        rows: 0,
      },
      {
        filter: "address=nullorempty=false,interest=nullorempty=true",
        rows: 3,
      },
      {
        filter: "address=nullorempty=false;interest=nullorempty=true",
        rows: 0,
      },
      {
        filter: "birthday=null=true",
        rows: 0,
      },
      {
        filter: "birthday=null=false",
        rows: 3,
      },
      {
        filter: "active=null=true",
        rows: 0,
      },
      {
        filter: "active=null=false",
        rows: 3,
      },
      {
        filter: "tier=null=true",
        rows: 0,
      },
      {
        filter: "tier=null=false",
        rows: 3,
      },
      {
        filter: "tier=nullorempty=true",
        rows: 0,
      },
      {
        filter: "tier=nullorempty=false",
        rows: 3,
      },
      {
        filter: "points=null=true",
        rows: 0,
      },
      {
        filter: "points=null=false",
        rows: 3,
      },
      {
        filter: "lastModified=null=true",
        rows: 0,
      },
      {
        filter: "lastModified=null=false",
        rows: 3,
      },
    ];
    it.each(inputs)("$filter", async ({ filter, rows }) => {
      expect.hasAssertions();
      invariant(db);
      const context: SqlContext = {
        ...TestQueryConfigWithPlugins,
        values: [],
      };
      const sql = assembleFullQuery(
        {
          filter,
          sort: null,
          keyset: null,
        },
        context,
      );
      invariant(sql.isValid, !sql.isValid ? sql.err : undefined);
      expect(await db.manyOrNone(sql.sql, context.values)).toHaveLength(rows);
    });
  });

  describe("(overwriting) plugin query tests", () => {
    // The test table is only loaded with 3 records
    // Each of these tests runs the base query with the given filter
    // and asserts the row count
    const inputs: Array<{ filter: string; rows: number }> = [
      /* Overwritten operator tests: ANY, ALL instead [NOT] IN. */
      {
        filter: "firstName=in=(Alice,Bob)",
        rows: 2,
      },
      {
        filter: "firstName=out=(Alice,Bob)",
        rows: 1,
      },
    ];
    it.each(inputs)("$filter", async ({ filter, rows }) => {
      expect.hasAssertions();
      invariant(db);
      const context: SqlContext = {
        ...TestQueryConfigWithPlugins,
        values: [],
      };
      const sql = assembleFullQuery(
        {
          filter,
          sort: null,
          keyset: null,
        },
        context,
      );
      invariant(sql.isValid);
      expect(await db.manyOrNone(sql.sql, context.values)).toHaveLength(rows);
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
          ...TestQueryConfig,
          values: [],
        };
        const sql = assembleFullQuery(
          {
            filter: null,
            sort: parsedSorts,
            keyset,
          },
          context,
        );
        invariant(sql.isValid);
        const actual = await db.manyOrNone(sql.sql, context.values);
        expect(
          actual.map(({ firstName }: { firstName: string }) => firstName),
        ).toStrictEqual(firstNameFromEachRow);
      });
    });
    it("should be able to walk the full list one record at a time", async () => {
      expect.hasAssertions();
      invariant(db && parsedSorts);
      const results: string[] = [];
      const keysets: Array<string | null> = [];
      let keyset: string | null = null;
      while (results.length < 3) {
        const context: SqlContext = {
          ...TestQueryConfig,
          values: [],
        };
        keysets.push(keyset);
        const sql = assembleFullQuery(
          {
            filter: null,
            sort: parsedSorts,
            keyset,
          },
          context,
        );
        invariant(sql.isValid);
        const rows = await db.manyOrNone<UserRecord>(
          `${sql.sql} limit 1`,
          context.values,
        );
        invariant(rows.length == 1 && rows[0]);
        keyset = toKeySet(lastRowToKeySet(rows[0], parsedSorts, context));
        results.push(rows[0].firstName);
      }
      expect(results).toStrictEqual(["Charlie", "Bob", "Alice"]);
      expect(keysets).toMatchInlineSnapshot(`
        [
          null,
          "WyIzIiwiQ3VwY2FrZSIsIkNoYXJsaWUiLCIwMzk5YzcyNC01ODI5LTU0NTgtYjdhYy1hYzZhMjk4ZTBlNGIiXQ",
          "WyIyIiwiQmFuYW5hIiwiQm9iIiwiNzEzOWU4MWUtZGMxMy01NGQxLThjMTAtNmZlNmY3YmZiMzRlIl0",
        ]
      `);
    });
  });
});
