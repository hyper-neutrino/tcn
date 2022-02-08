const { client } = require("./client");
const { discord_token } = require("../config.json");

client.on("messageCreate", async (message) => {});
client.login(discord_token);
