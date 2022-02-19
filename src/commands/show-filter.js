const { Util } = require("discord.js");
const { filter_config, get_tags } = require("../db");
const { Usage, Info } = require("../errors");
const { pagify } = require("../utils/pages");

exports.permission = "moderator";

exports.execute = async function (ctx, args, body, command, prefix) {
    if (args.length > 0) {
        throw new Usage(
            "This command does not take any arguments. It shows your server's filter configuration except allowed tags (as that is the default)."
        );
    }
    const filter = new Map();
    for (const { tagname, allow } of await filter_config(ctx.guild)) {
        filter.set(tagname, allow);
    }
    const fields = [];
    for (const tag of await get_tags()) {
        const allow = filter.has(tag) ? filter.get(tag) : 1;
        fields.push(
            `${
                allow > 0 ? "✅" : allow < 0 ? "❌" : "➖"
            } ${Util.escapeMarkdown(tagname)}`
        );
    }
    if (fields.length == 0) {
        throw new Info(
            "Your server does not have a filter configuration, so all tags are allowed by default.",
            "Tag Filter"
        );
    }
    await pagify(
        ctx,
        { title: "Tag Filter", color: "GREY" },
        fields,
        10,
        300_000,
        true
    );
};
