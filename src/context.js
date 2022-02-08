exports.Context = class {
    constructor(client, message) {
        this.client = client;
        this.message = message;
        this.author = message.member;
        this.channel = message.channel;
        this.guild = message.guild;
        this.url = message.url;
    }

    async reply(item) {
        if (typeof item == "string" || item instanceof String) {
            item = { content: item };
        }
        item.allowedMentions ||= {};
        item.allowedMentions.repliedUser = false;
        return await this.message.reply(item);
    }

    async send(item) {
        return await this.channel.send(item);
    }

    async dm(item) {
        return await this.author.send(item);
    }

    async delete() {
        await this.message.delete();
    }

    async edit(item) {
        return await this.message.edit(item);
    }
};
