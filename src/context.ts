export type SelectorConfig =
  | {
      sql: string;
      type: "string" | "number" | "integer" | "date" | "date-time" | "boolean";
    }
  | {
      sql: string;
      enum: string[];
    };

export type Value = string | number | boolean | string[] | number[];

export type SqlContext = {
  // This array is used to append values extracted from the filter
  // and order by handling for use in a parameterized query.
  // Note that the length of the array + 1 determines the offset value
  // for the parameterized values like $1, $2, etc.
  values: Value[];
  // defines the behavior for mapping the selector to a SQL expression
  // allows for simple logical to physical mapping
  // additional mapping hints available with SelectorConfig as a value
  selectors: Record<string, string | SelectorConfig>;
  // if present, the keyset provides the data for the Seek Method
  keyset?: string | null;
  // if present, selectors are not required to be defined, but are enforced if defined
  lax?: true;
};
