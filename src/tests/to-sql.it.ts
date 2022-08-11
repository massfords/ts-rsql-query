import {db, destroyDb, initDb} from "./fixture-db";
import invariant from "tiny-invariant";
import {toSql} from "../to-sql";
import {TestSelectors} from "./fixture";
import {SqlContext} from "../config";

describe("runs the sql with a real db connection", () => {

    // noinspection SqlResolve
    const query = `select name, email, active, dob, tier from tsrsql.users u`;

    beforeAll(async () => {
        await initDb();
    });

    afterAll(async () => {
        await destroyDb()
    });

    const inputs : Array<{rsql: string, rows: number}> = [
        {
            rsql: "name==Alice",
            rows: 1
        },
        {
            rsql: "name==Alice,name==Bo*",
            rows: 2
        },
        {
            rsql: "name==Alice;active==false",
            rows: 1
        },
        {
            rsql: "name==Alice;points==1",
            rows: 1
        },
        {
            rsql: "points=gt=100",
            rows: 0
        },
        {
            rsql: "points=lt=100",
            rows: 3
        },
        {
            rsql: "birthday=gt=1950-01-02;birthday<1960-02-01",
            rows: 1
        },
        {
            rsql: "birthday=gt=1950-01-02;birthday<=1960-01-03",
            rows: 1
        },
        {
            rsql: "birthday=gt=1950-01-02;birthday<1960-01-03",
            rows: 0
        }
    ];
    it.each(inputs)("$rsql", async ({rsql, rows}) => {
        expect.hasAssertions();
        invariant(db);
        const context :SqlContext = {values: [], selectors: TestSelectors};
        const result = toSql(rsql, context);
        invariant(result.isValid);
        console.log(`${query} where ${result.sql}`);
        expect(await db.manyOrNone(`${query} where ${result.sql}`, context.values)).toHaveLength(rows);
    });
})
