import type { ComparisonNode } from "ts-rsql";
import type {
  RsqlOperatorPluginToSqlOptions,
  SqlContext,
  StaticQueryConfig,
} from "../context";
import {
  CustomOperator,
  findPluginByOperator,
  isBooleanValueInvariant,
  IsEmptyPlugin,
  IsNullOrEmptyPlugin,
  IsNullPlugin,
  MapInToEqualsAnyPlugin,
  MapOutToNotEqualsAllPlugin,
  maybeExecuteRsqlOperatorPlugin,
  OverwrittenOperator,
} from "../plugin";

describe("tests for sql generation by plugins", () => {
  const selector = "table.column";
  const createOptions = (
    operator: string,
    operands: string[],
    values = [],
  ): RsqlOperatorPluginToSqlOptions => {
    return {
      ast: {
        operator,
        operands,
        selector,
      },
      selector,
      config: {
        selectors: {
          selector,
        },
      } as unknown as StaticQueryConfig,
      values,
    };
  };

  describe("findPluginByOperator", () => {
    const operator = "=custom=";

    it("should return undefined if plugins configuration is empty array", () => {
      expect(findPluginByOperator(operator, [])).toBeUndefined();
    });

    it("should return undefined if plugins configuration is undefined", () => {
      expect(findPluginByOperator(operator)).toBeUndefined();
    });

    it("should return plugin if plugins configuration contains plugin", () => {
      const plugin = {
        operator,
        toSql: jest.fn(),
      };
      const result = findPluginByOperator(operator, [plugin]);
      expect(result).toBeDefined();
      expect(result).toBe(plugin);
    });
  });

  describe("maybeExecuteRsqlOperatorPlugin", () => {
    const mockInvariant = jest.fn();
    const sql = "SQL";
    const mockToSql = jest.fn(() => sql);
    const operator = "=custom=";
    const values: string[] = [];
    const context = {
      plugins: [
        {
          operator,
          invariant: mockInvariant,
          toSql: mockToSql,
        },
      ],
      values,
    } as unknown as SqlContext;
    const ast: ComparisonNode = {
      operator,
      selector,
    };
    const formattedSelector = "formattedSelector";

    afterEach(() => {
      mockInvariant.mockClear();
      mockToSql.mockClear();
    });

    it("should execute a found plugin for a given (custom) operator", () => {
      expect(
        maybeExecuteRsqlOperatorPlugin(context, ast, formattedSelector),
      ).toBe(sql);

      expect(mockInvariant).toHaveBeenCalledTimes(1);
      expect(mockInvariant).toHaveBeenCalledWith(ast);

      expect(mockToSql).toHaveBeenCalledTimes(1);
      expect(mockToSql).toHaveBeenCalledWith({
        selector: formattedSelector,
        ast,
        values,
        config: context,
      });
    });

    it("should pass the keywordsLowerCase configuration from context", () => {
      const newContext = {
        ...context,
        keywordsLowerCase: true,
      } as unknown as SqlContext;
      expect(
        maybeExecuteRsqlOperatorPlugin(newContext, ast, formattedSelector),
      ).toBe(sql);

      expect(mockInvariant).toHaveBeenCalledTimes(1);
      expect(mockInvariant).toHaveBeenCalledWith(ast);

      expect(mockToSql).toHaveBeenCalledTimes(1);
      expect(mockToSql).toHaveBeenCalledWith({
        selector: formattedSelector,
        ast,
        values,
        keywordsLowerCase: true,
        config: newContext,
      });
    });

    it("should return undefined if plugins configuration is empty array", () => {
      expect(
        maybeExecuteRsqlOperatorPlugin(
          {
            plugins: [],
          } as unknown as SqlContext,
          ast,
          formattedSelector,
        ),
      ).toBeUndefined();

      expect(mockInvariant).not.toHaveBeenCalled();
      expect(mockToSql).not.toHaveBeenCalled();
    });

    it("should return undefined if plugins configuration is not defined", () => {
      expect(
        maybeExecuteRsqlOperatorPlugin(
          {} as unknown as SqlContext,
          ast,
          formattedSelector,
        ),
      ).toBeUndefined();

      expect(mockInvariant).not.toHaveBeenCalled();
      expect(mockToSql).not.toHaveBeenCalled();
    });
  });

  describe("isBooleanValueInvariant", () => {
    it("should pass if operands[0] is only and 'true'", () => {
      expect(() =>
        isBooleanValueInvariant({
          operands: ["true"],
          selector,
          operator: "",
        }),
      ).not.toThrow();
    });

    it("should pass if operands[0] is only and 'false'", () => {
      expect(() =>
        isBooleanValueInvariant({
          operands: ["false"],
          selector,
          operator: "",
        }),
      ).not.toThrow();
    });

    it("should not pass if operands is empty", () => {
      expect(() =>
        isBooleanValueInvariant({
          operands: [],
          selector,
          operator: "",
        }),
      ).toThrow(
        "operator must have one value, operator value must be 'true' or 'false'",
      );
    });

    it("should not pass if operands is not 'true' or 'false'", () => {
      expect(() =>
        isBooleanValueInvariant({
          operands: ["invalid"],
          selector,
          operator: "",
        }),
      ).toThrow("operator value must be 'true' or 'false', but was: 'invalid'");
    });
  });

  describe("MapInToEqualsAnyPlugin", () => {
    describe("toSql", () => {
      const operator = OverwrittenOperator.IN;
      const operands = ["op1", "op2"];
      const options: RsqlOperatorPluginToSqlOptions = createOptions(
        operator,
        operands,
      );

      it("should create the parameterized '= ANY($1)' PostgreSQL code from =in= operator", () => {
        expect(MapInToEqualsAnyPlugin.toSql(options)).toBe(
          "table.column = ANY($1)",
        );
        expect(options.values).toStrictEqual([operands]);
      });

      it("should create the parameterized '= any($1)' PostgreSQL code from =in= operator", () => {
        expect(
          MapInToEqualsAnyPlugin.toSql({
            ...options,
            values: [],
            keywordsLowerCase: true,
          }),
        ).toBe("table.column = any($1)");
      });
    });

    describe("invariant", () => {
      it("should fail on falsy", () => {
        expect(() =>
          MapInToEqualsAnyPlugin.invariant({} as unknown as ComparisonNode),
        ).toThrow("Invariant failed");
      });

      it("should pass on truthy", () => {
        expect(() =>
          MapInToEqualsAnyPlugin.invariant({
            operands: [],
          } as unknown as ComparisonNode),
        ).not.toThrow("Invariant failed");
      });
    });
  });

  describe("MapOutToNotEqualsAllPlugin", () => {
    describe("toSql", () => {
      const operator = OverwrittenOperator.OUT;
      const operands = ["op1", "op2"];
      const options: RsqlOperatorPluginToSqlOptions = createOptions(
        operator,
        operands,
      );

      it("should create the parameterized '= ANY($1)' PostgreSQL code from =out= operator", () => {
        expect(MapOutToNotEqualsAllPlugin.toSql(options)).toBe(
          "table.column <> ALL($1)",
        );
        expect(options.values).toStrictEqual([operands]);
      });

      it("should create the parameterized '= any($1)' PostgreSQL code from =out= operator", () => {
        expect(
          MapOutToNotEqualsAllPlugin.toSql({
            ...options,
            values: [],
            keywordsLowerCase: true,
          }),
        ).toBe("table.column <> all($1)");
      });
    });

    describe("invariant", () => {
      it("should fail on falsy", () => {
        expect(() =>
          MapOutToNotEqualsAllPlugin.invariant({} as unknown as ComparisonNode),
        ).toThrow("Invariant failed");
      });

      it("should pass on truthy", () => {
        expect(() =>
          MapOutToNotEqualsAllPlugin.invariant({
            operands: [],
          } as unknown as ComparisonNode),
        ).not.toThrow("Invariant failed");
      });
    });
  });

  describe("IsNullPlugin", () => {
    describe("toSql", () => {
      const operator = CustomOperator.IS_NULL;
      const operands = ["true"];
      const options: RsqlOperatorPluginToSqlOptions = createOptions(
        operator,
        operands,
      );

      it(`should create the 'IS null' SQL code from ${CustomOperator.IS_NULL}true`, () => {
        expect(IsNullPlugin.toSql(options)).toBe("table.column IS null");
        expect(options.values).toStrictEqual([]);
      });

      it(`should create the 'is null' SQL code from ${CustomOperator.IS_NULL}true`, () => {
        expect(
          IsNullPlugin.toSql({
            ...options,
            keywordsLowerCase: true,
          }),
        ).toBe("table.column is null");
        expect(options.values).toStrictEqual([]);
      });

      it(`should create the 'IS NOT null' SQL code from ${CustomOperator.IS_NULL}false`, () => {
        expect(
          IsNullPlugin.toSql({
            ...options,
            ast: {
              operator,
              operands: ["false"],
              selector,
            },
          }),
        ).toBe("table.column IS NOT null");
        expect(options.values).toStrictEqual([]);
      });

      it(`should create the 'is not null' SQL code from ${CustomOperator.IS_NULL}false`, () => {
        expect(
          IsNullPlugin.toSql({
            ...options,
            ast: {
              operator,
              operands: ["false"],
              selector,
            },
            keywordsLowerCase: true,
          }),
        ).toBe("table.column is not null");
        expect(options.values).toStrictEqual([]);
      });
    });
  });

  describe("IsEmptyPlugin", () => {
    describe("toSql", () => {
      const operator = CustomOperator.IS_EMPTY;
      const operands = ["true"];
      const options: RsqlOperatorPluginToSqlOptions = createOptions(
        operator,
        operands,
      );

      it(`should create the parameterized '= ''' SQL code from ${CustomOperator.IS_EMPTY}true`, () => {
        expect(IsEmptyPlugin.toSql(options)).toBe("table.column = ''");
        expect(options.values).toStrictEqual([]);
      });

      it(`should create the '<> ''' SQL code from ${CustomOperator.IS_EMPTY}false`, () => {
        expect(
          IsEmptyPlugin.toSql({
            ...options,
            ast: {
              operator,
              operands: ["false"],
              selector,
            },
          }),
        ).toBe("table.column <> ''");
        expect(options.values).toStrictEqual([]);
      });
    });
  });

  describe("IsNullOrEmptyPlugin", () => {
    describe("toSql", () => {
      const operator = CustomOperator.IS_NULL_OR_EMPTY;
      const operands = ["true"];
      const options: RsqlOperatorPluginToSqlOptions = createOptions(
        operator,
        operands,
      );

      it(`should create the "(... IS null OR ... = ''" SQL code from ${CustomOperator.IS_NULL_OR_EMPTY}true`, () => {
        expect(IsNullOrEmptyPlugin.toSql(options)).toBe(
          "(table.column IS null OR table.column = '')",
        );
        expect(options.values).toStrictEqual([]);
      });

      it(`should create the "(...is null or ... = ''" SQL code from ${CustomOperator.IS_NULL_OR_EMPTY}true`, () => {
        expect(
          IsNullOrEmptyPlugin.toSql({
            ...options,
            keywordsLowerCase: true,
          }),
        ).toBe("(table.column is null or table.column = '')");
        expect(options.values).toStrictEqual([]);
      });

      it(`should create the "NOT (... IS null OR ... = ''" SQL code from ${CustomOperator.IS_NULL_OR_EMPTY}false`, () => {
        expect(
          IsNullOrEmptyPlugin.toSql({
            ...options,
            ast: {
              operator,
              operands: ["false"],
              selector,
            },
          }),
        ).toBe("NOT (table.column IS null OR table.column = '')");
        expect(options.values).toStrictEqual([]);
      });

      it(`should create the "not (... is null or ... = ''" SQL code from ${CustomOperator.IS_NULL_OR_EMPTY}false`, () => {
        expect(
          IsNullOrEmptyPlugin.toSql({
            ...options,
            ast: {
              operator,
              operands: ["false"],
              selector,
            },
            keywordsLowerCase: true,
          }),
        ).toBe("not (table.column is null or table.column = '')");
        expect(options.values).toStrictEqual([]);
      });
    });
  });
});
