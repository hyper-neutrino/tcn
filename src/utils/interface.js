const { ButtonInteraction } = require("discord.js");
const { Canceled } = require("../errors");

const confirm = (exports.confirm = async function (
    ctx,
    embed,
    confirm_button,
    cancel_button,
    timeout
) {
    const message = await ctx.reply({
        embeds: [embed],
        components: [
            {
                type: "ACTION_ROW",
                components: [
                    {
                        type: "BUTTON",
                        style: "SUCCESS",
                        customId: "interface.confirm",
                        label: confirm_button || "Confirm",
                    },
                    {
                        type: "BUTTON",
                        style: "DANGER",
                        customId: "interface.cancel",
                        label: cancel_button || "Cancel",
                    },
                ],
            },
        ],
    });
    try {
        const interaction = await ctx.channel.awaitMessageComponent({
            filter: (interaction) =>
                interaction instanceof ButtonInteraction &&
                interaction.message.id == message.id &&
                interaction.user.id == ctx.author.id &&
                interaction.customId.startsWith("interface."),
            time: timeout || 60_000,
        });
        return interaction.customId == "interface.confirm";
    } catch {
        return undefined;
    } finally {
        await message.delete();
    }
});

exports.confirmOrCancel = async function (
    ctx,
    embed,
    confirm_button,
    cancel_button,
    timeout
) {
    const response = await confirm(
        ctx,
        embed,
        confirm_button,
        cancel_button,
        timeout
    );
    if (response) {
        return;
    } else if (response === undefined) {
        throw new Canceled("This operation timed out.");
    } else {
        throw new Canceled("This operation was canceled by the user.");
    }
};
