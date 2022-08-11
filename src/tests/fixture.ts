import {ValidSelectors} from "../config";

// sample configuration for specifying the selectors and their data types
export const TestSelectors: ValidSelectors = {
    name: {
        sql: "u.name",
        type: "string"
    },
    email: "email",
    active: {
        sql: "u.active",
        type: "boolean"
    },
    lastModified: {
        sql: "u.lastModified",
        type: "date-time"
    },
    birthday: {
        sql: "u.dob",
        type: "date"
    },
    tier: {
        sql: "u.tier",
        type: "string",
        enum: ["GOLD", "SILVER", "BRONZE"]
    },
    points: {
        sql: "u.pointBalance",
        type: "integer",
    }
}
