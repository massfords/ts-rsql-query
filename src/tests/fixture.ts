// sample configuration for specifying the selectors and their data types
import type { StaticQueryConfig } from "../context";
import {
  IsEmptyPlugin,
  IsNullOrEmptyPlugin,
  IsNullPlugin,
  MapInToEqualsAnyPlugin,
  MapOutToNotEqualsAllPlugin,
} from "../plugin";

export const TestQueryConfig: StaticQueryConfig = {
  // SQL used for the main portion of the listing query.
  // This is a simple example where all rows are selected.
  // The selected columns MUST include all selectors used in the sort expression
  // noinspection SqlResolve
  mainQuery: /* sql */ `select u.firstName    as "firstName",
                          u.lastName     as "lastName",
                          u.email,
                          u.address,
                          u.interest,
                          u.active,
                          u.dob,
                          u.tier,
                          u.id,
                          u.pointbalance as points
                   from tsrsql.users u`,
  concatStrategy: "where",
  selectors: {
    id: "u.id",
    firstName: "u.firstName",
    lastName: "u.lastName",
    email: "email",
    address: "u.address",
    interest: "u.interest",
    active: {
      sql: "u.active",
      type: "boolean",
    },
    lastModified: {
      sql: `u."lastModified"`,
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
  },
};

export const TestQueryConfigWithPlugins: StaticQueryConfig = {
  ...TestQueryConfig,
  plugins: [
    IsNullPlugin,
    IsEmptyPlugin,
    IsNullOrEmptyPlugin,
    MapInToEqualsAnyPlugin,
    MapOutToNotEqualsAllPlugin,
  ],
};
