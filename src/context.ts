export type SelectorConfig =
  | {
      readonly sql: string;
      readonly type:
        | "string"
        | "number"
        | "integer"
        | "date"
        | "date-time"
        | "boolean";
    }
  | {
      readonly sql: string;
      readonly enum: string[];
    };

export type Value = string | number | boolean | string[] | number[];

export type SqlContext = {
  // This array is used to append values extracted from the filter
  // and order by handling for use in a parameterized query.
  // The offset in the parameterized query is based on the array length + 1.
  // This produces parameterized values like $1, $2, etc.
  values: Value[];
  // defines the behavior for mapping the selector to a SQL expression.
  // allows for simple logical to physical mapping.
  // additional mapping hints available with SelectorConfig as a value.
  readonly selectors: Record<string, string | SelectorConfig>;
  // if present, the keyset provides the data for the Seek Method
  readonly keyset?: string | null;
  // if present, selectors are not required to be defined, but are enforced if defined
  readonly lax?: true;
};
