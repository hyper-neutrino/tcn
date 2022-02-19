const { Util } = require("discord.js");
const { add_server, remove_server } = require("../db");
const { Usage, ArgumentError } = require("../errors");

exports.names = ["server", "guild"];

exports.permission = "observer";

exports.execute = async function (ctx, args, body, command, prefix) {
    const usage = new Usage(
        `\`${prefix}server <add | remove | rm> <server id> <server id> ...\` ` +
            " - add or remove a server from the list of approved TCN servers."
    );

    if (
        args.length >= 2 &&
        (args[0] == "add" || args[0] == "remove" || args[0] == "rm")
    ) {
        for (var x = 1; x < args.length; x++) {
            if (!args[x].match(/^\d+$/)) {
                throw new ArgumentError(
                    `${Util.escapeMarkdown(
                        args[x]
                    )} is not a server ID (should be a number).`
                );
            }
        }
        for (var x = 1; x < args.length; x++) {
            if (args[0] == "add") {
                await add_server({ id: args[x] });
            } else {
                await remove_server({ id: args[x] });
            }
        }
        return;
    }

    throw usage;
};
