const { ButtonInteraction } = require("discord.js");

function merge(embed, fields, mini) {
    if (mini) {
        embed.description = fields.join("\n");
    } else {
        embed.fields = fields;
    }
    return embed;
}

exports.pagify = async function (ctx, embed, fields, page_size, timeout, mini) {
    if (fields.length <= page_size) {
        merge(embed, fields, mini);
        embed.footer = "Page 1 / 1";
        await ctx.reply({ embeds: [embed] });
        return;
    }
    const end = new Date();
    end.setMilliseconds(end.getMilliseconds() + timeout);
    const page_count = Math.ceil(fields.length / page_size);
    var page = 0;
    merge(embed, fields.slice(0, page_size), mini);
    embed.footer = { text: `Page 1 / ${page_count}` };
    const message = await ctx.reply({
        embeds: [embed],
        components: [
            {
                type: "ACTION_ROW",
                components: [
                    {
                        type: "BUTTON",
                        style: "PRIMARY",
                        customId: "pages.first",
                        emoji: "⏪",
                    },
                    {
                        type: "BUTTON",
                        style: "SECONDARY",
                        customId: "pages.previous",
                        emoji: "◀️",
                    },
                    {
                        type: "BUTTON",
                        style: "DANGER",
                        customId: "pages.stop",
                        emoji: "🛑",
                    },
                    {
                        type: "BUTTON",
                        style: "SECONDARY",
                        customId: "pages.next",
                        emoji: "▶️",
                    },
                    {
                        type: "BUTTON",
                        style: "PRIMARY",
                        customId: "pages.last",
                        emoji: "⏩",
                    },
                ],
            },
        ],
    });
    while (true) {
        try {
            const interaction = await ctx.channel.awaitMessageComponent({
                filter: (interaction) =>
                    interaction instanceof ButtonInteraction &&
                    interaction.message.id == message.id &&
                    interaction.user.id == ctx.author.id &&
                    interaction.customId.startsWith("pages."),
                time: end - new Date(),
            });
            if (interaction.customId == "pages.first") {
                page = 0;
            } else if (interaction.customId == "pages.previous") {
                page--;
            } else if (interaction.customId == "pages.stop") {
                break;
            } else if (interaction.customId == "pages.next") {
                page++;
            } else if (interaction.customId == "pages.last") {
                page = page_count - 1;
            }
            page = ((page % page_count) + page_count) % page_count;
            merge(
                embed,
                fields.slice(page_size * page, page_size * page + page_size),
                mini
            );
            embed.footer.text = `Page ${page + 1} / ${page_count}`;
            await interaction.update({
                embeds: [embed],
            });
        } catch (error) {
            console.error(error);
            break;
        }
    }
    await message.edit({ components: [] });
};
