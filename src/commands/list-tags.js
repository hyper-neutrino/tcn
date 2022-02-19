const { Util } = require("discord.js");
const { get_tags } = require("../db");
const { Info, Usage } = require("../errors");
const { pagify } = require("../utils/pages");

exports.execute = async function (ctx, args, body, command, prefix) {
    if (args.length > 0)
        throw new Usage(
            "This command does not take arguments. It lists all available tags for incident reports and logs."
        );
    const tags = await get_tags();
    if (tags.length == 0) {
        throw new Info("There are no tags yet.", "Tags");
    }
    const pages = [tags.shift()];
    for (const tag of tags) {
        const next =
            pages[pages.length - 1] +
            (pages[pages.length - 1].length ? ", " : "") +
            tag;
        if (next.length <= 2096) {
            pages[pages.length - 1] = next;
        } else {
            pages.push(tag);
        }
    }
    await pagify(
        ctx,
        { title: "Tags", color: "GREY" },
        pages,
        1,
        300_000,
        true
    );
    throw new Info();
};
