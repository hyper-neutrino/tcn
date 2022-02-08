const fs = require("fs");
const path = require("path");
const { client } = require("./client");
const {
    get_prefix,
    client: db_client,
    has_permission,
    is_admin,
} = require("./db");
const { discord_token, owner } = require("../config.json");
const {
    InternalError,
    StatusError,
    PermissionError,
    Success,
} = require("./errors");
const { Context } = require("./context");

process.on("uncaughtException", (error) => {
    console.error("UNEXPECTED UNCAUGHT EXCEPTION");
    console.error("=============================");
    console.error(error);
});

const commands = new Map();

fs.readdir(path.join(__dirname, "commands"), function (error, items) {
    for (const item of items) {
        if (item.endsWith(".js")) {
            const name = item.substring(0, item.length - 3);
            commands.set(name, require(`./commands/${item}`));
        }
    }
});

client.on("ready", async () => {
    await db_client.connect();
    console.log("TCN Bot Ready.");
});

client.on("messageCreate", async (message) => {
    if (!message.guild) return;
    if (message.webhookId) return;
    if (message.author.bot) return;
    const prefix = await get_prefix(message.guild);
    if (message.content.startsWith(prefix)) {
        const ctx = new Context(client, message);
        const full = message.content.substring(prefix.length).trim();
        const command = full.split()[0].toLowerCase();
        if (!commands.has(command)) return;
        try {
            const entry = commands.get(command);
            if (
                entry.permission !== undefined &&
                message.author.id != owner &&
                !(await is_admin(message.author)) &&
                !(await has_permission(message.member, entry.permission))
            ) {
                throw new PermissionError(
                    "You do not have permission to use this command."
                );
            }
            if (
                entry.admin_only &&
                message.author.id != owner &&
                !(await is_admin(message.author))
            ) {
                throw new PermissionError(
                    "This command is only available to approved TCN admins."
                );
            }
            const body = full.substring(command.length).trim();
            const args = body.split();
            const response =
                (await entry.execute(ctx, args, body, command)) || {};
            throw new Success(response.message || "", response.title || "");
        } catch (error) {
            if (!(error instanceof StatusError)) {
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

client.login(discord_token);
