/*
        INFBOT is a discord.js bot. It helps discord users create voice channels
        automatically then delete them when they are no longer required.
        A server admin just needs to initialize the bot then everything
        is handled automatically by INFBOT.
*/

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
const config = require("./config.json");
const guildLocalPrefixes = new Map();

function getDateTime() {
    let getDate = new Date();
    return `${getDate.toLocaleString()}`;
};

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

        connection.query(
            `SELECT guildLocalPrefix FROM guildconfig WHERE guildId = '${guild.id}'`
        ).then(result => {
            guildLocalPrefixes.set(guild.id, result[0][0].guildLocalPrefix);
        });
    });

    function Server(id, name, members, channels) {
        this.Guild_ID = id;
        this.Guild_Name = name;
        this.Member_Count = members - 1; // Not counting INFBOT
        this.Channel_Count = channels;
    }

    console.table(allGuildInfo, ["Guild_ID", "Guild_Name", "Member_Count", "Channel_Count"]);
    console.log(colors.cyan(`${getDateTime()} >>> The current GLOBAL prefix is set to ${colors.white(config.GLOBAL_PREFIX)}.`));

    // FOR FIRST INITIALIZATION ONLY AND TO BE USED ONCE (this will add the guilds that your bot is already in to the database)
    // client.guilds.cache.forEach((guild) => {
    //     try {
    //         connection.query(
    //             `INSERT INTO guilds VALUES('${guild.id}', '${guild.ownerId}')`
    //         );
    //         connection.query(
    //             `INSERT INTO guildconfig (guildId) VALUES('${guild.id}')`
    //         );
    //     } catch (err) {
    //         console.log(`${colors.red(`${getDateTime()} >>> Error detected:`)}`);
    //         console.log(err);
    //     };
    // });

});

client.on("guildCreate", async (guild) => {

    try {
        await connection.query(
            `INSERT INTO guilds VALUES('${guild.id}', '${guild.ownerId}')`
        );
        await connection.query(
            `INSERT INTO guildconfig (guildId) VALUES('${guild.id}')`
        );
    } catch (err) {
        console.log(`${colors.red(`${getDateTime()} >>> Error detected:`)}`);
        console.log(err);
    };

});

client.on("guildDelete", async (guild) => {

    try {
        await connection.query(
            `DELETE FROM guilds WHERE guildId = '${guild.id}'`
        );
        await connection.query(
            `DELETE FROM guildconfig WHERE guildId = '${guild.id}'`
        );
        await connection.query(
            `DELETE FROM guildchannels WHERE guildId = '${guild.id}'`
        );
    } catch (err) {
        console.log(`${colors.red(`${getDateTime()} >>> Error detected:`)}`);
        console.log(err);
    };

});

(async () => {

    connection = await require("./database/db");
    await client.login(process.env.DISCORD_AUTH_TOKEN).catch(err => {
        console.log(`${colors.red(`\n\n\n${getDateTime()} >>> Couldn't log into Discord. Please check your token in the .env file.`)}\n${err}`);
    });

})();