const fs = require("fs");
const path = require("path");
const { client } = require("./client");
const {
    get_prefix,
    client: db_client,
    has_permission,
    is_admin,
    has_server,
} = require("./db");
const config = require("../config.json");
const {
    InternalError,
    StatusError,
    PermissionError,
    Success,
} = require("./errors");
const { Context } = require("./context");
const { ButtonInteraction } = require("discord.js");
const { push } = require("./website");

process.on("uncaughtException", (error) => {
    console.error("UNEXPECTED UNCAUGHT EXCEPTION");
    console.error("=============================");
    console.error(error);
});

const commands = new Map();

fs.readdir(path.join(__dirname, "commands"), function (error, items) {
    for (const item of items) {
        if (item.endsWith(".js")) {
            const module = require(`./commands/${item}`);
            for (const name of module.names || [
                item.substring(0, item.length - 3),
            ]) {
                commands.set(name, require(`./commands/${item}`));
            }
        }
    }
});

client.on("ready", async () => {
    await db_client.connect();
    console.log("TCN Bot Ready.");
});

const hierarchy = new Map();
hierarchy.set("observer", ["observer"]);
hierarchy.set("owner", ["owner"]);
hierarchy.set("advisor", ["owner", "advisor"]);
hierarchy.set("admin", ["owner", "advisor", "admin"]);
hierarchy.set("moderator", ["owner", "advisor", "admin", "moderator"]);

client.on("interactionCreate", async (interaction) => {
    if (
        interaction instanceof ButtonInteraction &&
        interaction.customId.startsWith("push.")
    ) {
        await push(parseInt(interaction.customId.substring(5)));
        await interaction.reply({ content: "Success!", ephemeral: true });
        await interaction.message.edit({ components: [] });
    }
});

client.on("messageCreate", async (message) => {
    if (!message.guild) return;
    if (message.webhookId) return;
    if (message.author.bot) return;
    if (message.guild.id != config.hq && !(await has_server(message.guild))) {
        return;
    }
    const prefix = await get_prefix(message.guild);
    if (message.content.startsWith(prefix)) {
        const ctx = new Context(client, message);
        const full = message.content.substring(prefix.length).trim();
        const command = full.split(/\s+/)[0].toLowerCase();
        if (!commands.has(command)) return;
        try {
            const entry = commands.get(command);
            if (
                entry.permission !== undefined &&
                message.author.id != config.owner &&
                !(
                    await Promise.all(
                        hierarchy
                            .get(entry.permission)
                            .map((permission) =>
                                has_permission(message.member, permission)
                            )
                    )
                ).some((x) => x)
            ) {
                throw new PermissionError(
                    "You do not have permission to use this command."
                );
            }
            const body = full.substring(command.length).trim();
            const args = body ? body.split(/\s+/) : [];
            const response =
                (await entry.execute(ctx, args, body, command, prefix)) || {};
            if (typeof response == "string" || response instanceof String) {
                throw new Success(response);
            } else {
                throw new Success(
                    response.message || "",
                    response.title || "",
                    response.fields || []
                );
            }
        } catch (error) {
            if (!(error instanceof StatusError)) {
                console.error(error);
                error = new InternalError("Unknown internal error!");
            }
            if (error.title || error.message) {
                await ctx.reply({
                    embeds: [
                        {
                            title: error.title,
                            description: error.message,
                            color: error.color,
                            fields: error.fields,
                        },
                    ],
                });
            }
            if (error.emoji) {
                try {
                    await message.react(error.emoji);
                } catch {}
            }
        }
    }
});

require("./website");

client.login(config.discord_token);
