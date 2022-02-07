import { Client } from "pg";

import { db_options } from "../config.json";

export const client = new Client(db_options);

// permissions
{
    client.query(
        `CREATE TABLE IF NOT EXISTS permissions (
            guild_id VARCHAR(32),
            snowflake VARCHAR(32),
            allow BOOLEAN
        )`
    );
}
