import {toSql} from "../to-sql";
import {parseRsql} from "ts-rsql";
import {Value} from "../config";

describe("tests for sql generation", () => {
    const inputs : Array<{
        rsql: string,
        sql: string,
        values: Value[]
    }> = [
        {
            rsql: `name=="Kill Bill";!year=gt=2003`,
            sql: `(name=$1 and not(year>$2))`,
            values: ["Kill Bill", "2003"]
        },
        {
            rsql: `name=="Kill Bill";!year<=2003`,
            sql: `(name=$1 and not(year<=$2))`,
            values: ["Kill Bill", "2003"]
        },
        {
            rsql: `genres=in=(sci-fi,action);(director=='Christopher Nolan',actor==*Bale);year=ge=2000`,
            sql: `(genres in $1 and (director=$2 or actor ilike $3) and year>=$4)`,
            values: [["sci-fi", "action"], "Christopher Nolan", "%Bale", "2000"]
        },
        {
            rsql: `director.lastName==Nolan;year=ge=2000;year=lt=2010`,
            sql: `(director.lastName=$1 and year>=$2 and year<$3)`,
            values: ["Nolan", "2000", "2010"]
        },
        {
            rsql: `director.lastName==Nolan and year>=2000 and year<2010`,
            sql: `(director.lastName=$1 and year>=$2 and year<$3)`,
            values: ["Nolan", "2000", "2010"]
        },
        {
            rsql: `genres=in=(sci-fi,action);genres=out=(romance,animated,horror),director==*Tarantino`,
            sql: `((genres in $1 and genres not in $2) or director ilike $3)`,
            values: [["sci-fi", "action"], ["romance","animated","horror"], "%Tarantino"]
        }
    ];
    it.each(inputs)("$rsql", ({rsql, sql, values}) => {
        expect.hasAssertions();
        const ast = parseRsql(rsql);
        const vals: Value[] = [];
        const actual = toSql(ast, {values: vals, selectors: {}, lax:true});
        expect(actual).toStrictEqual({isValid: true, sql});
        expect(vals).toStrictEqual(values);
    });

    it("should use selector when present as string", () => {
        expect.hasAssertions();
        const ast = parseRsql("name==value");
        const vals: Value[] = [];
        const actual = toSql(ast, {values: vals, selectors: {
            name: "tableName.colName"
            }});
        expect(actual).toStrictEqual({isValid: true, sql: "tableName.colName=$1"});
    })

    it("should use selector when present as config", () => {
        expect.hasAssertions();
        const ast = parseRsql("name==value");
        const vals: Value[] = [];
        const actual = toSql(ast, {values: vals, selectors: {
                name: { sql: "tableName.colName", type: "string"}
            }});
        expect(actual).toStrictEqual({isValid: true, sql: "tableName.colName=$1"});
    })

    it("should use values array for offsets", () => {
        expect.hasAssertions();
        const ast = parseRsql("name==value");
        const values: Value[] = ["some-other-value"];
        const actual = toSql(ast, {values, selectors: {}, lax: true});
        expect(actual).toStrictEqual({isValid: true, sql: "name=$2"});
        expect(values).toStrictEqual(["some-other-value", "value"]);
    });
});
