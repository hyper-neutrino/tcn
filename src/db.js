const { Client } = require("pg");
const config = require("../config.json");
const { ArgumentError } = require("./errors");

const client = (exports.client = new Client(config.db_options));

// servers
{
    client.query(
        `CREATE TABLE IF NOT EXISTS servers (
            guild_id VARCHAR(32) PRIMARY KEY
        )`
    );

    var approved_servers_cached = false;
    const approved_servers = new Set();

    exports.add_server = async function (guild) {
        approved_servers.add(guild.id);
        await client.query(
            `INSERT INTO servers (
                guild_id
            ) VALUES ($1) ON CONFLICT (
                guild_id
            ) DO UPDATE SET guild_id = servers.guild_id`,
            [guild.id]
        );
    };

    exports.remove_server = async function (guild) {
        approved_servers.delete(guild.id);
        await client.query(`DELETE FROM servers WHERE guild_id = $1`, [
            guild.id,
        ]);
    };

    exports.has_server = async function (guild) {
        if (!approved_servers_cached) await list_servers();
        return approved_servers.has(guild.id);
    };

    const list_servers = (exports.list_servers = async function () {
        if (!approved_servers_cached) {
            for (const entry of (
                await client.query(`SELECT guild_id FROM servers`)
            ).rows) {
                approved_servers.add(entry.guild_id);
            }
            approved_servers_cached = true;
        }
        return approved_servers;
    });
}

// prefix
{
    client.query(
        `CREATE TABLE IF NOT EXISTS prefix (
            guild_id VARCHAR(32),
            prefix VARCHAR(8),
            PRIMARY KEY (guild_id)
        )`
    );

    const prefixes = new Map();

    exports.set_prefix = async function (guild, prefix) {
        if (prefix.length > 8 || prefix.length < 1) {
            throw new ArgumentError(
                "Prefix must be between 1 and 8 characters long."
            );
        }
        prefixes.set(guild.id, prefix);
        await client.query(
            `INSERT INTO prefix (
                guild_id, prefix
            ) VALUES ($1, $2) ON CONFLICT (
                guild_id
            ) DO UPDATE SET prefix = $2`,
            [guild.id, prefix]
        );
    };

    exports.get_prefix = async function (guild) {
        if (!prefixes.has(guild.id)) {
            prefixes.set(
                guild.id,
                (
                    await client.query(
                        `SELECT COALESCE(MAX(prefix), $1) FROM prefix WHERE guild_id = $2`,
                        [config.default_prefix, guild.id]
                    )
                ).rows[0].coalesce
            );
        }
        return prefixes.get(guild.id);
    };
}

// permissions
{
    client.query(
        `CREATE TABLE IF NOT EXISTS role_permissions (
            guild_id VARCHAR(32),
            role_id VARCHAR(32),
            permission VARCHAR(32),
            PRIMARY KEY (guild_id, role_id, permission)
        )`
    );

    client.query(
        `CREATE TABLE IF NOT EXISTS user_permissions (
            guild_id VARCHAR(32),
            user_id VARCHAR(32),
            permission VARCHAR(32),
            allow BOOLEAN,
            PRIMARY KEY (guild_id, user_id, permission)
        )`
    );

    client.query(
        `CREATE TABLE IF NOT EXISTS admins (
            user_id VARCHAR(32),
            PRIMARY KEY (user_id)
        )`
    );

    exports.allow_role = async function (role, permission) {
        await client.query(
            `INSERT INTO role_permissions (
                guild_id, role_id, permission
            ) VALUES ($1, $2, $3) ON CONFLICT (
                guild_id, role_id, permission
            ) DO UPDATE SET permission = role_permissions.permission`,
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
            ) DO UPDATE SET allow = $4`,
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
        if (permission == "observer") {
            return {
                roles: [],
                allowed_users: config.observers,
                disallowed_users: [],
            };
        }
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
        if (permission == "observer") {
            return config.observers.indexOf(member.id) != -1;
        }
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

// tags
{
    client.query(
        `CREATE TABLE IF NOT EXISTS tags (
            tagname VARCHAR(16) PRIMARY KEY
        )`
    );

    exports.tag_exists = async function (tagname) {
        return (
            (
                await client.query(
                    `SELECT COUNT(*) FROM tags WHERE tagname = $1`,
                    [tagname]
                )
            ).rows[0].count > 0
        );
    };

    exports.add_tag = async function (tagname) {
        await client.query(
            `INSERT INTO tags (
                tagname
            ) VALUES ($1) ON CONFLICT (
                tagname
            ) DO UPDATE SET tagname = tags.tagname`,
            [tagname]
        );
    };

    exports.delete_tag = async function (tagname) {
        await client.query(`DELETE FROM tags WHERE tagname = $1`, [tagname]);
    };

    exports.get_tags = async function () {
        return (
            await client.query(`SELECT tagname FROM tags ORDER BY tagname ASC`)
        ).rows.map(({ tagname }) => tagname);
    };
}

// filters
{
    client.query(
        `CREATE TABLE IF NOT EXISTS filter (
            guild_id VARCHAR(32),
            tagname VARCHAR(16),
            allow SMALLINT,
            PRIMARY KEY (guild_id, tagname)
        )`
    );

    exports.set_filter = async function (guild, tagname, allow) {
        await client.query(
            `INSERT INTO filter (
                guild_id, tagname, allow
            ) VALUES ($1, $2, $3) ON CONFLICT (
                guild_id, tagname
            ) DO UPDATE SET allow = $3`,
            [guild.id, tagname, allow]
        );
    };

    exports.delete_filter = async function (guild, tagname) {
        await client.query(
            `DELETE FROM filter WHERE guild_id = $1 AND tagname = $2`,
            [guild.id, tagname]
        );
    };

    exports.allowed = async function (guild, tagnames) {
        const relevant = (
            await client.query(
                `SELECT tagname, allow FROM filter WHERE guild_id = $1 AND allow != 0`,
                [guild.id]
            )
        ).rows;
        const tags = new Set(tagnames);
        var allowed = false;
        for (const { tagname, allow } of relevant) {
            if (tags.has(tagname)) {
                tags.delete(tagname);
                if (allow > 0) allowed = true;
                else return false;
            }
        }
        return allowed || tags.size > 0;
    };

    exports.filter_config = async function (guild) {
        return (
            await client.query(
                `SELECT tagname, allow FROM filter WHERE guild_id = $1 ORDER BY tagname ASC`,
                [guild.id]
            )
        ).rows;
    };
}

// pushes
{
    (async () => {
        await client.query(
            `CREATE TABLE IF NOT EXISTS pushes (
                id SERIAL PRIMARY KEY,
                author VARCHAR(32),
                summary VARCHAR(4096),
                details VARCHAR(65536),
                recommendations VARCHAR(1024)
            )`
        );

        await client.query(
            `CREATE TABLE IF NOT EXISTS push_tags (
                push_id INTEGER REFERENCES pushes (id) ON DELETE CASCADE,
                tagname VARCHAR(16)
            )`
        );

        await client.query(
            `DO $$ BEGIN IF NOT EXISTS (
                SELECT * FROM pg_type typ
                INNER JOIN pg_namespace nsp ON nsp.oid = typ.typnamespace
                WHERE nsp.nspname = current_schema() AND typ.typname = 'action_type'
            ) THEN CREATE TYPE action_type AS ENUM ('mute', 'kick', 'ban'); END IF; END; $$`
        );

        await client.query(
            `CREATE TABLE IF NOT EXISTS push_action_list (
                push_id INTEGER REFERENCES pushes (id) ON DELETE CASCADE,
                type action_type,
                user_id VARCHAR(32)
            )`
        );

        await client.query(
            `CREATE TABLE IF NOT EXISTS push_reports (
                id SERIAL PRIMARY KEY,
                origin VARCHAR(32),
                author VARCHAR(32),
                published BOOLEAN,
                deleted BOOLEAN,
                last_push INTEGER REFERENCES pushes (id) ON DELETE CASCADE
            )`
        );

        await client.query(
            `CREATE TABLE IF NOT EXISTS push_link (
                report_id INTEGER REFERENCES push_reports (id) ON DELETE CASCADE,
                push_id INTEGER REFERENCES pushes (id) ON DELETE CASCADE
            )`
        );

        await client.query(
            `CREATE TABLE IF NOT EXISTS push_messages (
                report_id INTEGER REFERENCES push_reports (id) ON DELETE CASCADE
            )`
        );
    })();

    exports.publish_report = async function (id) {
        await client.query(
            `UPDATE push_reports SET published = TRUE WHERE id = $1`,
            [id]
        );
    };

    exports.is_published = async function (id) {
        return (
            await client.query(
                `SELECT published FROM push_reports WHERE id = $1`,
                [id]
            )
        ).rows[0].published;
    };

    exports.release_edit = async function (id, pid) {
        await client.query(
            `UPDATE push_reports SET last_push = $1 WHERE id = $2`,
            [pid, id]
        );
    };

    exports.last_edit = async function (id, pid) {
        return (
            await client.query(
                `SELECT last_push FROM push_reports WHERE id = $1`,
                [id]
            )
        ).rows[0].last_push;
    };

    exports.purge_report = async function (id) {
        await client.query(`DELETE FROM push_reports WHERE id = $1`, [id]);
    };

    exports.delete_report = async function (id) {
        await client.query(
            `UPDATE push_reports SET deleted = true WHERE id = $1`,
            [id]
        );
    };

    exports.edit_report = async function (
        id,
        tags,
        author,
        summary,
        details,
        recommendations,
        actions
    ) {
        const push_id = await create_push(
            tags,
            author,
            summary,
            details,
            recommendations,
            actions
        );
        await client.query(
            `INSERT INTO push_link (report_id, push_id) VALUES ($1, $2)`,
            [id, push_id]
        );
        return id;
    };

    exports.create_report = async function (
        tags,
        guild,
        author,
        summary,
        details,
        recommendations,
        actions
    ) {
        const push_id = await create_push(
            tags,
            author,
            summary,
            details,
            recommendations,
            actions
        );
        const id = (
            await client.query(
                `INSERT INTO push_reports (origin, author) VALUES ($1, $2) RETURNING id`,
                [guild.id, author.id]
            )
        ).rows[0].id;
        await client.query(
            `INSERT INTO push_link (report_id, push_id) VALUES ($1, $2)`,
            [id, push_id]
        );
        return id;
    };

    async function create_push(
        tags,
        author,
        summary,
        details,
        recommendations,
        actions
    ) {
        if (summary.length > 4096) {
            throw new ArgumentError(
                "Push report summary must be at most 4096 characters long."
            );
        }
        if (details.length > 65536) {
            throw new ArgumentError(
                "Push report details must be at most 65536 characters long."
            );
        }
        if (recommendations.length > 2048) {
            throw new ArgumentError(
                "Push report recommendations must be at most 1024 characters long."
            );
        }
        for (const action of actions) {
            if (
                action.type != "mute" &&
                action.type != "kick" &&
                action.type != "ban"
            ) {
                throw new ArgumentError(
                    "Push report action list must contain only mutes, kicks, or bans."
                );
            }
            if (!action.id.match(/^\d+$/)) {
                throw new ArgumentError(
                    "Push report action list IDs must be valid user IDs."
                );
            }
        }
        const id = (
            await client.query(
                `INSERT INTO pushes (author, summary, details, recommendations) VALUES ($1, $2, $3, $4) RETURNING id`,
                [author.id, summary, details, recommendations].flat()
            )
        ).rows[0].id;
        for (const tag of tags) {
            await client.query(
                `INSERT INTO push_tags (push_id, tagname) VALUES ($1, $2)`,
                [id, tag]
            );
        }
        for (const action of actions) {
            await client.query(
                `INSERT INTO push_action_list (push_id, type, user_id) VALUES ($1, $2, $3)`,
                [id, action.type, action.id]
            );
        }
        return id;
    }

    exports.get_report = async function (id) {
        const push_id = (
            await client.query(
                `SELECT push_id FROM push_link WHERE report_id = $1 ORDER BY push_id DESC LIMIT 1`,
                [id]
            )
        ).rows[0].push_id;
        return {
            tags: new Set(
                (
                    await client.query(
                        `SELECT tagname FROM push_tags WHERE push_id = $1`,
                        [push_id]
                    )
                ).rows.map(({ tagname }) => tagname)
            ),
            report: (
                await client.query(`SELECT * FROM push_reports WHERE id = $1`, [
                    id,
                ])
            ).rows[0],
            body: (
                await client.query(`SELECT * FROM pushes WHERE id = $1`, [
                    push_id,
                ])
            ).rows[0],
            actions: (
                await client.query(
                    `SELECT type, user_id FROM push_action_list WHERE push_id = $1`,
                    [push_id]
                )
            ).rows,
        };
    };

    exports.get_report_ids = async function () {
        return (
            await client.query(
                `SELECT id FROM push_reports ORDER BY id DESC LIMIT 10`
            )
        ).rows.map(({ id }) => id);
    };
}
