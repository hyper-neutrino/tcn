const { set_prefix } = require("../db");
const config = require("../../config.json");

exports.permission = "admin";

exports.execute = async function (ctx, args, body, command, prefix) {
    await set_prefix(ctx.guild, body || config.default_prefix);
    if (!body) return `Prefix has been reset to \`${config.default_prefix}\`.`;
};
