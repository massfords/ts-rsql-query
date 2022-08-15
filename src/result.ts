export type SuccessSqlResult = { isValid: true; sql: string };
export type ErrSqlResult = { isValid: false; err: string };

export type SqlResult = SuccessSqlResult | ErrSqlResult;
