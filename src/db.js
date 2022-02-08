const { Client } = require("pg");
const { db_options } = require("../config.json");

const client = (exports.client = new Client(db_options));
client.connect();

// prefix
{
    client.query(
        `CREATE TABLE IF NOT EXISTS prefix (
            guild_id VARCHAR(32) PRIMARY KEY,
            prefix VARCHAR(8)
        )`
    );

    exports.set_prefix = async function (guild, prefix) {
        await client.query(
            `INSERT INTO prefix (
                guild_id, prefix
            ) VALUES ($1, $2) ON CONFLICT (
                guild_id
            ) DO UPDATE SET prefix = $2`,
            [guild_id, prefix]
        );
    };
}

// permissions
{
    client.query(
        `CREATE TABLE IF NOT EXISTS role_permissions (
            guild_id VARCHAR(32) PRIMARY KEY,
            role_id VARCHAR(32) PRIMARY KEY,
            permission VARCHAR(32) PRIMARY KEY
        )`
    );

    client.query(
        `CREATE TABLE IF NOT EXISTS user_permissions (
            guild_id VARCHAR(32) PRIMARY KEY,
            user_id VARCHAR(32) PRIMARY KEY,
            permission VARCHAR(32) PRIMARY KEY,
            allow BOOLEAN
        )`
    );

    exports.allow_role = async function (role, permission) {
        await client.query(
            `INSERT INTO role_permissions (
                guild_id, role_id, permission
            ) VALUES ($1, $2, $3) ON CONFLICT (
                guild_id, role_id, permission
            ) DO UPDATE permission = role_permissions.permission`,
            [role.guild.id, role.id, permission]
        );
    };

    exports.disallow_role = async function (role, permission) {
        await client.query(
            `DELETE FROM role_permissions WHERE guild_id = $1 AND role_id = $2 AND permission = $3`,
            [role.guild.id, role.id, permission]
        );
    };

    exports.set_user_override = async function (member, permission, allow) {
        await client.query(
            `INSERT INTO user_permissions (
                guild_id, user_id, permission, allow
            ) VALUES ($1, $2, $3, $4) ON CONFLICT(
                guild_id, user_id, permission
            ) DO UPDATE allow = $4`,
            [member.guild.id, member.id, permission, allow]
        );
    };

    exports.remove_user_override = async function (member, permission) {
        await client.query(
            `DELETE FROM user_permissions WHERE guild_id = $1 AND user_id = $2 AND permission = $3`,
            [member.guild.id, member.id, permission]
        );
    };

    exports.permission_info = async function (guild, permission) {
        return {
            roles: await client.query(
                `SELECT role_id FROM role_permissions WHERE guild_id = $1 AND permission = $2`,
                [guild.id, permission]
            ),
            allowed_users: await client.query(
                `SELECT user_id FROM user_permissions WHERE guild_id = $1 AND permission = $2 AND allow`,
                [guild.id, permission]
            ),
            disallowed_users: await client.query(
                `SELECT user_id FROM user_permissions WHERE guild_id = $1 AND permission = $2 AND NOT allow`,
                [guild.id, permission]
            ),
        };
    };

    exports.has_permission = async function (
        member,
        permission,
        disallow_owner
    ) {
        if (!disallow_owner && member.id == member.guild.ownerId) return true;
        const override = await client.query(
            `SELECT allow FROM user_permissions WHERE guild_id = $1 AND user_id = $2 AND permission = $3`,
            [member.guild.id, member.id, permission]
        );
        if (override.rowCount > 0) {
            return override.rows[0].allow;
        }
        const role_ids = new Set(
            (
                await client.query(
                    `SELECT role_id FROM role_permissions WHERE guild_id = $1 AND permission = $2`,
                    [member.guild.id, permission]
                )
            ).rows.map((row) => row.role_id)
        );
        return member.roles.cache.some((role) => role_ids.has(role.id));
    };
}
