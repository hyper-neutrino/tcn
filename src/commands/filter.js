const { Util } = require("discord.js");
const { tag_exists, set_filter } = require("../db");
const { Usage, ArgumentError } = require("../errors");

exports.permission = "admin";

exports.execute = async function (ctx, args, body, command, prefix) {
    const usage = new Usage(
        `\`${prefix}filter <allow | block | ignore> <tag> <tag> ...\` ` +
            "- `allow`, the default option, will cause posts with that tag that are not blocked to be sent." +
            " `block` will cause posts with that tag to never be sent no matter what." +
            " `ignore` will disregard this tag when deciding whether or not to send a post." +
            " A post is sent if and only if at least one tag is allowed and no tags are blocked."
    );

    if (
        args.length >= 2 &&
        (args[0] == "allow" || args[0] == "block" || args[0] == "ignore")
    ) {
        for (var x = 1; x < args.length; x++) {
            if (!(await tag_exists((args[x] = args[x].toLowerCase())))) {
                throw new ArgumentError(
                    `The tag ${Util.escapeMarkdown(args[x])} does not exist.`
                );
            }
        }
        const allow = args[0] == "allow" ? 1 : args[0] == "block" ? -1 : 0;
        for (var x = 1; x < args.length; x++) {
            await set_filter(ctx.guild, args[x], allow);
        }
        return;
    }

    throw usage;
};
