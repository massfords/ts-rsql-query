export type SelectorConfig = {
    sql: string;
    type: "string" | "number" | "integer" | "date" | "date-time" | "boolean";
} | {
    sql: string;
    type: "string";
    enum: string[]
}

export type Value = string | number | boolean | string[] | number[];
export type ValidSelectors = Record<string, string | SelectorConfig>

export type SqlContext =
    {
        // values from the RSQL are appended to this array in the toSql call
        values: Value[];
    } &
    ({ lax: true; } | { selectors: ValidSelectors })
