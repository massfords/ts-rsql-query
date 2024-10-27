import {
  isPluginOperator,
  KnownOperator,
  toSqlOperator,
} from "../llb/operators";

describe("operators tests", () => {
  describe("toSqlOperator", () => {
    const inputs: Array<{
      rsql: KnownOperator;
      sql: string;
    }> = [
      {
        rsql: "==",
        sql: "LIKE",
      },
      {
        rsql: "!=",
        sql: "<>",
      },
      {
        rsql: "<",
        sql: "<",
      },
      {
        rsql: "=lt=",
        sql: "<",
      },
      {
        rsql: "<=",
        sql: "<=",
      },
      {
        rsql: "=le=",
        sql: "<=",
      },
      {
        rsql: ">",
        sql: ">",
      },
      {
        rsql: "=gt=",
        sql: ">",
      },
      {
        rsql: ">=",
        sql: ">=",
      },
      {
        rsql: "=ge=",
        sql: ">=",
      },
      {
        rsql: "=in=",
        sql: "IN",
      },
      {
        rsql: "=out=",
        sql: "NOT IN",
      },
    ];
    it.each(inputs)("should return '$sql' for '$rsql'", ({ rsql, sql }) => {
      expect.hasAssertions();
      const actual = toSqlOperator(rsql);
      expect(actual).toStrictEqual(sql);
    });

    const inputsWithLowerCaseAndDetachedOperatorOptions: Array<{
      rsql: KnownOperator;
      sql: string;
    }> = [
      {
        rsql: "==",
        sql: "like",
      },
      {
        rsql: "!=",
        sql: " <> ",
      },
      {
        rsql: "<",
        sql: " < ",
      },
      {
        rsql: "=lt=",
        sql: " < ",
      },
      {
        rsql: "<=",
        sql: " <= ",
      },
      {
        rsql: "=le=",
        sql: " <= ",
      },
      {
        rsql: ">",
        sql: " > ",
      },
      {
        rsql: "=gt=",
        sql: " > ",
      },
      {
        rsql: ">=",
        sql: " >= ",
      },
      {
        rsql: "=ge=",
        sql: " >= ",
      },
      {
        rsql: "=in=",
        sql: "in",
      },
      {
        rsql: "=out=",
        sql: "not in",
      },
    ];
    it.each(inputsWithLowerCaseAndDetachedOperatorOptions)(
      "should return '$sql' for '$rsql'",
      ({ rsql, sql }) => {
        expect.hasAssertions();
        const actual = toSqlOperator(rsql, true, true);
        expect(actual).toStrictEqual(sql);
      }
    );
  });

  describe("isPluginOperator", () => {
    const operator = "=custom=";

    it("should return false if plugins configuration is empty array", () => {
      expect(isPluginOperator(operator, [])).toBe(false);
    });

    it("should return false if plugins configuration is undefined", () => {
      expect(isPluginOperator(operator)).toBe(false);
    });

    it("should return false if plugins configuration is empty array", () => {
      expect(
        isPluginOperator(operator, [
          {
            operator,
            toSql: jest.fn(),
          },
        ])
      ).toBe(true);
    });
  });
});
