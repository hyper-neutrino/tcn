const { Success } = require("../errors");

exports.permission = "server-settings";

exports.execute = async function (ctx, args) {
    throw new Success("Hello, World!");
};
