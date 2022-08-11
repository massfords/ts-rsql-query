import invariant from "tiny-invariant";
import {v4} from "uuid";
import pgpPromise from "pg-promise";

export let db: pgpPromise.IDatabase<unknown> | null = null;

export const initDb = async () => {
    const cn = {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        max: 1
    };
    const pgp = pgpPromise({});
    db = pgp(cn);

    // create test table
    await db.none(`
        drop table if exists tsrsql.users;
        create table tsrsql.users
        (
            id             uuid                                            not null
                constraint users_pk
                    primary key,
            email          text                                            not null,
            name           text                                            not null,
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
}

export const destroyDb = async () => {
    if (!db) {
        return;
    }
    await db.none(`drop table if exists tsrsql.users;`)
    await db.$pool.end();
    db = null;
}

export interface UserRecord {
    name: string;
    email: string;
    active: boolean;
    dob: string;
    tier: string
    pointBalance: number;
}

export const Users: UserRecord[] = [
    {
        name: "Alice",
        email: "alice@example.com",
        tier: "BRONZE",
        active: false,
        dob: "1960-01-03",
        pointBalance: 1
    },
    {
        name: "Bob",
        email: "bob@example.com",
        tier: "SILVER",
        active: true,
        dob: "1960-02-04",
        pointBalance: 2
    },
    {
        name: "Charlie",
        email: "charlie@example.com",
        tier: "GOLD",
        active: true,
        dob: "1960-03-05",
        pointBalance: 3
    }
]

export const insertUserRecords = async (): Promise<void> => {
    invariant(db);
    await db.tx(async (tx) => {
        await tx.batch(
            Users.map(async (row) => {
                const {
                    name,
                    email,
                    active,
                    dob,
                    tier,
                    pointBalance
                } = row;
                // noinspection SqlResolve
                return await tx.none(
                    `
                        insert into tsrsql.users (id,
                                                  name,
                                                  email,
                                                  active,
                                                  dob,
                                                  tier,
                                                  pointBalance)
                        values ($(id),
                                $(name),
                                $(email),
                                $(active),
                                $(dob),
                                $(tier),
                                $(pointBalance))
                    `,
                    {
                        id: v4(),
                        name,
                        email,
                        active,
                        dob,
                        tier,
                        pointBalance
                    }
                );
            })
        );
    });
};
