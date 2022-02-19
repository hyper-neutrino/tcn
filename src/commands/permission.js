const { Util } = require("discord.js");
const {
    set_user_override,
    remove_user_override,
    allow_role,
    disallow_role,
} = require("../db");
const { Usage, ArgumentError } = require("../errors");

exports.permission = "advisor";

const _p = ["advisor", "admin", "moderator"];
const permissions = new Set(_p);
const ph = _p.join(" | ");

exports.execute = async function (ctx, args, body, command, prefix) {
    const usage = new Usage(
        `\`${prefix}permission <grant | deny | remove> <${ph}> <user/role> <user/role> ...\` ` +
            "- `grant` adds permissions, `deny` removes role permissions and explicitly blocks user " +
            "permissions, and `remove` restores the default (removes role permissions, removes user overrides)."
    );

    if (
        args.length >= 3 &&
        (args[0] == "grant" || args[0] == "deny" || args[0] == "remove") &&
        permissions.has(args[1])
    ) {
        const users = [];
        const roles = [];
        for (var x = 2; x < args.length; x++) {
            var failed = true;
            if (args[x].match(/^(\d+|<@!?\d+>)$/)) {
                try {
                    const user = await ctx.guild.members.fetch(
                        args[x].match(/\d+/)[0]
                    );
                    if (user) {
                        users.push(user);
                        failed = false;
                    }
                } catch {}
            }
            if (failed && args[x].match(/^(\d+|<@&\d+>)$/)) {
                try {
                    const role = await ctx.guild.roles.fetch(
                        args[x].match(/\d+/)[0]
                    );
                    if (role) {
                        roles.push(role);
                        failed = false;
                    }
                } catch {}
            }
            if (failed) {
                throw new ArgumentError(
                    `${Util.escapeMarkdown(
                        args[x]
                    )} is not a valid representation of a member or role that exists within this server.`
                );
            }
        }
        for (const user of users) {
            if (args[0] == "remove") {
                await remove_user_override(user, args[1]);
            } else {
                await set_user_override(user, args[1], args[0] == "grant");
            }
        }
        for (const role of roles) {
            if (args[0] == "grant") {
                await allow_role(role, args[1]);
            } else {
                await disallow_role(role, args[1]);
            }
        }
        return;
    }

    throw usage;
};
