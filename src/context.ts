export type SelectorConfig = {
  // The value for the left-hand side of a SQL expression.
  readonly sql: string;
  // optional value for use in building a keyset.
  // provides a string to access this selector from the
  // result set returned from its query.
  // If not set, then the selector value is used.
  readonly alias?: string;
} & (
  | {
      // defines the type for the selector and enables validation at runtime.
      // Note: there is no validation defined for `string`
      readonly type:
        | "string"
        | "number"
        | "integer"
        | "date"
        | "date-time"
        | "boolean";
    }
  | {
      // defines the set of permitted values for this selector
      readonly enum: string[];
    }
);

export type Value = string | number | boolean | string[] | number[];

export type StaticQueryConfig = {
  readonly mainQuery: string;
  // defines the behavior for mapping the selector to a SQL expression.
  // allows for simple logical to physical mapping.
  // additional mapping hints available with SelectorConfig as a value.
  readonly selectors: Record<string, string | SelectorConfig>;
  // use "where" if the mainQuery does not contain a where clause
  // use "and" if the mainQuery has an existing where clause
  readonly concatStrategy: "where" | "and";
  // if present, selectors are not required to be defined, but are enforced if defined
  readonly lax?: true;
};

export type SqlContext = {
  // This array is used to append values extracted from the filter
  // and order by handling for use in a parameterized query.
  // Values extracted from the filter and order by handling are appended to this array.
  // The length after adding a value determines the offset for its query parameter ($1, $2, etc).
  values: Value[];
} & StaticQueryConfig;
