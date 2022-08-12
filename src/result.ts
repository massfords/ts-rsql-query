export type SqlResult =
  | { isValid: true; sql: string }
  | { isValid: false; err: string };
