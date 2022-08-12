// sample configuration for specifying the selectors and their data types
import { SelectorConfig } from "../context";

export const TestSelectors: Record<string, string | SelectorConfig> = {
  id: "u.id",
  firstName: "u.firstName",
  lastName: "u.lastName",
  email: "email",
  active: {
    sql: "u.active",
    type: "boolean",
  },
  lastModified: {
    sql: "u.lastModified",
    type: "date-time",
  },
  birthday: {
    sql: "u.dob",
    type: "date",
  },
  tier: {
    sql: "u.tier",
    enum: ["GOLD", "SILVER", "BRONZE"],
  },
  points: {
    sql: "u.pointBalance",
    type: "integer",
  },
};
