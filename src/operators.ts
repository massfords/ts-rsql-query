export type SymbolicOperator = "<" | "<=" | ">" | ">=" | "==" | "!=";
export type NamedOperator = `=${"lt" | "le" | "gt" | "ge" | "in" | "out" }=`;
export type KnownOperator = SymbolicOperator | NamedOperator;

export const toSqlOperator = (operator: NamedOperator | SymbolicOperator): string => {
    switch (operator) {
        case "==":
            return "like"
        case "!=":
            return "<>"
        case "<":
        case "=lt=":
            return "<"
        case "<=":
        case "=le=":
            return "<="
        case ">":
        case "=gt=":
            return ">"
        case ">=":
        case "=ge=":
            return ">="
        case "=in=":
            return "in"
        case "=out=":
            return "not in"
        default: {
            const invalid: never = operator;
            throw Error(invalid);
        }
    }
}

export const isKnownOperator = (maybe:string): maybe is KnownOperator => {
    try {
        toSqlOperator(maybe as NamedOperator);
        return true;
    } catch {
        return false;
    }
}
