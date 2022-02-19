const { delete_tag, tag_exists } = require("../db");
const { Usage, ArgumentError } = require("../errors");

exports.permission = "observer";

exports.execute = async function (ctx, args, body, command, prefix) {
    const usage = new Usage(`\`${prefix}delete-tag <name>\` - delete a tag`);
    if (args.length == 1) {
        const tagname = args[0].toLowerCase();
        if (tagname.length > 16 || tagname.length < 1) {
            throw new ArgumentError(
                "Tag name must be between 1 and 16 characters."
            );
        }
        if (!(await tag_exists(tagname))) {
            throw new ArgumentError("That tag does not exist.");
        }
        await delete_tag(tagname);
        return;
    }
    throw usage;
};
