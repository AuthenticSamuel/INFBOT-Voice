require("dotenv").config();
const { Client, Intents, Options } = require("discord.js");
const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_VOICE_STATES,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS
    ],
    partials: [
        "MESSAGE",
        "CHANNEL",
        "REACTION"
    ]
});
const colors = require("colors");
const mysql = require("mysql2/promise");
const config = require("./config.json");

client.on("ready", () => {

    let totalMembers = 0;
    let totalChannels = 0;
    client.guilds.cache.forEach((guild) => {
        if (guild.memberCount != NaN) {
            totalMembers += guild.memberCount;
        };
        totalChannels += guild.channels.cache.filter((c) => c.type !== "GUILD_CATEGORY").size;
    });
    
    console.log(`${colors.cyan(`\n\n\n${getDateTime()} >>> INFBOT ${colors.white("V" + config.INFBOT_VERSION)} Online • ${colors.white(client.guilds.cache.size)} guilds • ${colors.white(totalMembers)} members • ${colors.white(totalChannels)} channels`)}`);
    
    let allGuildInfo = [];
    client.guilds.cache.forEach((guild) => {
        allGuildInfo.push(new Server(guild.id, guild.name, guild.memberCount, guild.channels.cache.filter((c) => c.type !== "GUILD_CATEGORY").size));
    });

    function Server(id, name, members, channels) {
        this.id = id;
        this.name = name;
        this.members = members - 1; // Not counting INFBOT
        this.channels = channels;
    }

    console.table(allGuildInfo, ["id", "name", "members", "channels"]);
    console.log(colors.cyan(`The current GLOBAL prefix is set to ${colors.white(config.GLOBAL_PREFIX)}.`));

})

client.login(process.env.DISCORD_AUTH_TOKEN).catch(err => {
    console.log(`${colors.red(`\n\n\n${getDateTime()} >>> Couldn't log into Discord. Please check your token in the .env file.`)}\n${err}`);
    // process.uptime();
});

function getDateTime() {
    let getDate = new Date();
    return `${getDate.toLocaleString()}`;
};