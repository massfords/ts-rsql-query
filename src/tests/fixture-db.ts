import invariant from "tiny-invariant";
import { v5 } from "uuid";
import pgpPromise from "pg-promise";
import type { StartedPostgreSqlContainer } from "testcontainers";

export let db: pgpPromise.IDatabase<unknown> | null = null;

export const initDb = async (startedContainer: StartedPostgreSqlContainer) => {
  const cn = {
    host: startedContainer.getHost(),
    port: startedContainer.getPort(),
    database: startedContainer.getDatabase(),
    user: startedContainer.getUsername(),
    password: startedContainer.getPassword(),
    max: 1,
  };
  const pgp = pgpPromise({});
  db = pgp(cn);

  // create test table
  await db.none(/* sql */ `create schema if not exists tsrsql;
        drop table if exists tsrsql.users;
        create table tsrsql.users
        (
            id             uuid                                            not null
                constraint users_pk
                    primary key,
            email          text                                            not null,
            firstname      text                                            not null,
            lastname       text                                            not null,
            address        text, -- used for is-null plugin tests
            interest       text default '', -- used for is-empty plugin tests
            "lastModified" timestamp with time zone default now()          not null,
            dob            date,
            tier           text                     default 'BRONZE'::text not null,
            active         boolean                                         not null,
            pointBalance   int                      default 0              not null
        );
        create unique index users_email_uindex
            on tsrsql.users (email);

    `);

  await insertUserRecords();
};

export const destroyDb = async () => {
  if (!db) {
    return;
  }
  await db.$pool.end();
  db = null;
};

export type UserRecord = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  active: boolean;
  dob: string;
  tier: string;
  pointBalance: number;
};

export const idForTestRecord = (firstname: string): string => {
  return v5(firstname, "00000000-0000-0000-0000-000000000000");
};

export const Users: UserRecord[] = [
  {
    firstName: "Alice",
    lastName: "Apple",
    email: "alice@example.com",
    tier: "BRONZE",
    active: false,
    dob: "1960-01-03",
    pointBalance: 1,
    id: idForTestRecord("Alice"),
  },
  {
    firstName: "Bob",
    lastName: "Banana",
    email: "bob@example.com",
    tier: "SILVER",
    active: true,
    dob: "1960-02-04",
    pointBalance: 2,
    id: idForTestRecord("Bob"),
  },
  {
    firstName: "Charlie",
    lastName: "Cupcake",
    email: "charlie@example.com",
    tier: "GOLD",
    active: true,
    dob: "1960-03-05",
    pointBalance: 3,
    id: idForTestRecord("Charlie"),
  },
];

export const insertUserRecords = async (): Promise<void> => {
  invariant(db);
  await db.tx(async (tx) => {
    await tx.batch(
      Users.map(async (row) => {
        const {
          id,
          firstName,
          lastName,
          email,
          active,
          dob,
          tier,
          pointBalance,
        } = row;
        // noinspection SqlResolve
        return await tx.none(
          /* sql */ `
                        insert into tsrsql.users (id,
                                                  firstName,
                                                  lastName,
                                                  email,
                                                  active,
                                                  dob,
                                                  tier,
                                                  pointBalance)
                        values ($(id),
                                $(firstName),
                                $(lastName),
                                $(email),
                                $(active),
                                $(dob),
                                $(tier),
                                $(pointBalance))
                    `,
          {
            id,
            firstName,
            lastName,
            email,
            active,
            dob,
            tier,
            pointBalance,
          },
        );
      }),
    );
  });
};
