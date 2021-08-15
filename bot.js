/*
        INFBOT is a discord.js bot. It helps discord users create voice channels
        automatically then delete them when they are no longer required.
        A server admin just needs to initialize the bot then everything
        is handled automatically by INFBOT.
*/

require("dotenv").config();
const { Client, Intents, Options, MessageReaction, MessageEmbed, Message } = require("discord.js");
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
const guildCreatorChannels = new Map();
const guildAutoChannels = new Map();
const temporary = [];

for (let i = 0; i < 10; i++) console.log("");
console.log(colors.cyan(`${getDateTime()} >>> Starting INFBOT...`));

client.on("ready", () => {

    let totalMembers = 0;
    let totalChannels = 0;
    client.guilds.cache.forEach((guild) => {
        if (guild.memberCount != NaN) {
            totalMembers += guild.memberCount - 1;
        };
        totalChannels += guild.channels.cache.filter((c) => c.type !== "GUILD_CATEGORY").size;
    });
    
    console.log(`${colors.cyan(`${getDateTime()} >>> INFBOT ${colors.white(config.VERSION.INFBOT)} Online • ${colors.white(client.guilds.cache.size)} guilds • ${colors.white(totalMembers)} members • ${colors.white(totalChannels)} channels`)}`);
    
    // FOR FIRST INITIALIZATION ONLY AND TO BE USED ONCE (this will add the guilds that your bot is already in to the database)

    // client.guilds.cache.forEach((guild) => {
    //     try {
    //         connection.query(
    //             `
    //             INSERT INTO guilds
    //             VALUES('${guild.id}', '${guild.ownerId}')
    //             `
    //         );
    //         connection.query(
    //             `
    //             INSERT INTO guildconfig (guildId)
    //             VALUES('${guild.id}')
    //             `
    //         );
    //     } catch (err) {
    //         console.log(`${colors.red(`${getDateTime()} >>> Error detected:`)}`);
    //         console.log(err);
    //     };
    // });

    // END OF ONE-USE SECTION

    let allGuildInfo = [];
    client.guilds.cache.forEach((guild) => {
        allGuildInfo.push(new Server(guild.id, guild.name, guild.memberCount, guild.channels.cache.filter((c) => c.type !== "GUILD_CATEGORY").size));

        connection.query(
            `
            SELECT guildLocalPrefix
            FROM guildconfig
            WHERE guildId = '${guild.id}'
            `
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
    console.log(colors.cyan(`${getDateTime()} >>> The current GLOBAL prefix is set to ${colors.white(config.PREFIX.GLOBAL)}.`));

    const status = [
        `${client.guilds.cache.size} servers | ${config.PREFIX.GLOBAL}help`,
        `${client.channels.cache.filter((c) => c.type !== "GUILD_CATEGORY").size} channels | ${config.PREFIX.GLOBAL}help`,
        `${totalMembers} users | ${config.PREFIX.GLOBAL}help`,
        `${config.PREFIX.GLOBAL}bot for updates`,
    ];

    let x = 0;
    setInterval(() => {

        client.user.setActivity(status[x], {type: "WATCHING"});
        x = x + 1;
        if (x == status.length) {
            x = 0;
        }

    }, config.DELAY.STATUS);

});

client.on("guildCreate", async (guild) => {

    try {
        await connection.query(
            `
            INSERT INTO guilds
            VALUES('${guild.id}', '${guild.ownerId}')
            `
        );
        await connection.query(
            `
            INSERT INTO guildconfig (guildId)
            VALUES('${guild.id}')
            `
        );
    } catch (err) {
        console.log(`${colors.red(`${getDateTime()} >>> Error detected:`)}`);
        console.log(err);
    };

});

client.on("guildDelete", async (guild) => {

    try {
        await connection.query(
            `
            DELETE
            FROM guilds
            WHERE guildId = '${guild.id}'
            `
        );
        await connection.query(
            `
            DELETE
            FROM guildconfig
            WHERE guildId = '${guild.id}'
            `
        );
        await connection.query(
            `
            DELETE
            FROM guildchannels
            WHERE guildId = '${guild.id}'
            `
        );
    } catch (err) {
        console.log(`${colors.red(`${getDateTime()} >>> Error detected:`)}`);
        console.log(err);
    };

});

client.on("messageCreate", async (message) => {

    if (message.author.bot || !message.guild) return;
    
    let localPrefix = guildLocalPrefixes.get(message.guild.id);

    if (message.content.startsWith(config.PREFIX.GLOBAL) || message.content.startsWith(localPrefix)) {
        
        if (message.content.startsWith(localPrefix)) usedPrefix = localPrefix;
        else usedPrefix = config.PREFIX.GLOBAL;

        let [ usedCommand, ...args ] = message.content.split(usedPrefix).pop().split(" ");

        let MessageProperties = function(message, usedPrefix, usedCommand, providedArgs = "") {
            this.message = message,
            this.prefix = usedPrefix,
            this.command = usedCommand.toLowerCase(),
            this.args = providedArgs
        };

        let sentMessage = new MessageProperties(message, usedPrefix, usedCommand, args);

        switch (sentMessage.command) {
            case "help": COMMAND_HELP(sentMessage); break;
            case "bot": COMMAND_BOT(sentMessage); break;
            case "prefix": COMMAND_PREFIX(sentMessage); break;
            case "changeprefix": COMMAND_CHANGEPREFIX(sentMessage); break;
            case "setup": COMMAND_SETUP(sentMessage); break;
            case "unsetup": COMMAND_UNSETUP(sentMessage); break;
        };

    };

});

function COMMAND_HELP(sentMessage) {

    sentMessage.message.reply("help");
    consoleLoggingCommands(sentMessage);

};

function COMMAND_BOT(message) {

    let totalSeconds = (client.uptime / 1000);
    let totalDays = Math.floor(totalSeconds / 86400);
    totalSeconds %= 86400;
    let totalHours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    let totalMinutes = Math.floor(totalSeconds / 60);
    let seconds = Math.floor(totalSeconds % 60);
    let uptime = `${totalDays}:${leadingZeroes(totalHours)}:${leadingZeroes(totalMinutes)}:${leadingZeroes(seconds)}`;
    
    message.channel.send("Getting latency values...").then(async (msg) => {
        msg.delete();
        let botEmbed = new MessageEmbed()
            .setColor(config.COLOR.EVENT)
            .setTitle("INFBOT")
            .setThumbnail(config.BOT_AVATAR)
            .addFields(
                {name: "Uptime", value: uptime, inline: true},
                {name: "Developer", value: "Zenyth#0001", inline: true},
                {name: "Latency", value: `Bot: ${msg.createdTimestamp - message.createdTimestamp}ms\nAPI: ${Math.round(client.ws.ping)}ms`, inline: true},
                {name: "Version", value: config.VERSION.INFBOT, inline: true},
                {name: "Node JS", value: config.VERSION.NODEJS, inline: true},
                {name: "Discord JS", value: config.VERSION.DISCORDJS, inline: true},
                {name: "Users", value: `${client.guilds.cache.reduce((a, g) => a + g.memberCount - 1, 0)} users`, inline: true},
                {name: "Servers", value: `${client.guilds.cache.size} servers`, inline: true},
                {name: "Channels", value: `${client.channels.cache.filter((c) => c.type !== "GUILD_CATEGORY").size} channels`, inline: true},
                {name: "Support Server", value: config.SUPPORT_DISCORD_SERVER, inline: false},
                {name: `Last Update [${config.PATCH.DATE}]`, value: config.PATCH.NOTES, inline: false}
            );
            message.reply({embeds: [botEmbed]});
    })

};

function COMMAND_PREFIX(sentMessage) {

    let prefixEmbed = new MessageEmbed()
        .setColor(config.COLOR.EVENT)
        .setTitle("INFBOT Command Prefixes")
        .setDescription("Prefixes are used when you want to execute INFBOT commands. There is a *GLOBAL* one which is manually set by the developer and a *LOCAL* one that admins can change on a server-to-server basis with the **infbot/changeprefix** command.")
        .addFields(
            {name: "GLOBAL", value: config.PREFIX.GLOBAL, inline: true},
            {name: "LOCAL", value: guildLocalPrefixes.get(sentMessage.message.guild.id), inline: true}
        );
    return sentMessage.message.reply({embeds: [prefixEmbed]});

};

async function COMMAND_CHANGEPREFIX(sentMessage) {

    let ownerId;
    await connection.query(
        `
        SELECT guildOwner
        FROM guilds
        WHERE guildId = '${sentMessage.message.guild.id}'
        `
    ).then(result => {
        ownerId = result[0][0].guildOwner;
    });

    if (sentMessage.message.author.id != ownerId) {
        consoleLoggingCommands(sentMessage, "ERROR: PERMS");
        let errorEmbed = new MessageEmbed()
            .setColor(config.COLOR.ERROR)
            .setTitle("Error!")
            .setDescription("You need to be the owner of this server to change the *LOCAL* prefix.")
        return sentMessage.message.reply({embeds: [errorEmbed]});
    };

    if (sentMessage.args.length !== 1) {
        consoleLoggingCommands(sentMessage, "ERROR: ARGS");
        let errorEmbed = new MessageEmbed()
            .setColor(config.COLOR.ERROR)
            .setTitle("Error!")
            .setDescription("Please provide a valid prefix.\n\n*A prefix is a series of characters without any spaces.\nExample: **infbot/changeprefix newprefix!***")
        return sentMessage.message.reply({embeds: [errorEmbed]});
    };

    await connection.query(
        `
        UPDATE guildconfig
        SET guildLocalPrefix = '${sentMessage.args[0]}'
        WHERE guildId = '${sentMessage.message.guild.id}'
        `
    );

    consoleLoggingCommands(sentMessage, "SUCCESS");
    guildLocalPrefixes.set(sentMessage.message.guild.id, sentMessage.args[0]);

    let changePrefixEmbed = new MessageEmbed()
        .setColor(config.COLOR.SUCCESS)
        .setTitle("Success!")
        .setDescription(`You've successfully changed your *LOCAL* prefix to **${sentMessage.args[0]}**.`);
    return sentMessage.message.reply({embeds: [changePrefixEmbed]});

};

async function COMMAND_SETUP(sentMessage) {

    let ownerId;
    await connection.query(
        `
        SELECT guildOwner
        FROM guilds
        WHERE guildId = '${sentMessage.message.guild.id}'
        `
    ).then(result => {
        ownerId = result[0][0].guildOwner;
    });

    if (sentMessage.message.author.id != ownerId) {
        consoleLoggingCommands(sentMessage, "ERROR: PERMS");
        return sentMessage.message.reply("You are not the owner of this server.");
    };

    let channelCreator;
    await connection.query(
        `
        SELECT guildChannelCreator
        FROM guildconfig
        WHERE guildId = '${sentMessage.message.guild.id}'
        `
    ).then(result => {
        channelCreator = result[0][0].guildChannelCreator;
    });

    if (channelCreator !== "None") {
        consoleLoggingCommands(sentMessage, "ERROR: ACTIVE");
        return sentMessage.message.reply("INFBOT Voice Channels are already setup on this server.");
    };

    try {

        let channelCreatorCategory;
        await sentMessage.message.guild.channels.create(
            config.AUTO_VC.CATEGORY_NAME,
            {
                type: "GUILD_CATEGORY",
            }
        ).then(async (c) => {
            await connection.query(
                `
                UPDATE guildconfig
                SET guildChannelCreatorCategory = '${c.id}'
                WHERE guildId = '${c.guildId}'
                `
            );
            channelCreatorCategory = c.id;
        });

        await sentMessage.message.guild.channels.create(
            config.AUTO_VC.CHANNEL_NAME,
            {
                type: "GUILD_VOICE",
                parent: channelCreatorCategory,
            }
        ).then(async (c) => {
            await connection.query(
                `
                UPDATE guildconfig
                SET guildChannelCreator = '${c.id}'
                WHERE guildId = '${c.guildId}'
                `
            );
        });

        consoleLoggingCommands(sentMessage, "SUCCESS");

    } catch (err) {

        console.log(err);

    }

};

async function COMMAND_UNSETUP(sentMessage) {

    let ownerId;
    await connection.query(
        `
        SELECT guildOwner
        FROM guilds
        WHERE guildId = '${sentMessage.message.guild.id}'
        `
    ).then(result => {
        ownerId = result[0][0].guildOwner;
    });

    if (sentMessage.message.author.id != ownerId) {
        consoleLoggingCommands(sentMessage, "ERROR: PERMS");
        return sentMessage.message.reply("You are not the owner of this server.");
    };

    let channelCreatorCategory;
    await connection.query(
        `
        SELECT guildChannelCreatorCategory
        FROM guildconfig
        WHERE guildId = '${sentMessage.message.guild.id}'
        `
    ).then(result => {
        channelCreatorCategory = result[0][0].guildChannelCreatorCategory;
    });

    let channelCreator;
    await connection.query(
        `
        SELECT guildChannelCreator
        FROM guildconfig
        WHERE guildId = '${sentMessage.message.guild.id}'
        `
    ).then(result => {
        channelCreator = result[0][0].guildChannelCreator;
    });

    if (channelCreator === "None" && channelCreatorCategory === "None") {
        consoleLoggingCommands(sentMessage, "ERROR: INACTIVE");
        return sentMessage.message.reply("INFBOT Voice Channels aren't setup on this server.");
    };

    if ((channelCreator === "None" && channelCreatorCategory !== "None") || (channelCreator !== "None" && channelCreatorCategory === "None")) {
        consoleLoggingCommands(sentMessage, "ERROR: PARTIAL ACTIVE");
        await connection.query(
            `
            UPDATE guildconfig
            SET guildChannelCreatorCategory = 'None'
            WHERE guildId = '${sentMessage.message.guild.id}'
            `
        );
        await connection.query(
            `
            UPDATE guildconfig
            SET guildChannelCreator = 'None'
            WHERE guildId = '${sentMessage.message.guild.id}'
            `
        );
        await connection.query(
            `
            DELETE
            FROM guildchannels
            WHERE guildId = '${sentMessage.message.guild.id}'
            `
        );
        return sentMessage.message.reply("INFBOT found that your server was partially setup for INFVCs. We've reset the setup process to avoid future bugs.");
    };

    await connection.query(
        `
        UPDATE guildconfig
        SET guildChannelCreatorCategory = 'None'
        WHERE guildId = '${sentMessage.message.guild.id}'
        `
    );
    await connection.query(
        `
        UPDATE guildconfig
        SET guildChannelCreator = 'None'
        WHERE guildId = '${sentMessage.message.guild.id}'
        `
    );
    await connection.query(
        `
        DELETE
        FROM guildchannels
        WHERE guildId = '${sentMessage.message.guild.id}'
        `
    );
    
    sentMessage.message.guild.channels.cache.get(channelCreator).delete();
    sentMessage.message.guild.channels.cache.get(channelCreatorCategory).delete();
    consoleLoggingCommands(sentMessage, "SUCCESS");
    return sentMessage.message.reply("INFBOT Voice Channels have been removed from this server.");
            
};

client.on("voiceStateUpdate", async (oldState, newState) => {

    if (newState.channelId === oldState.channelId) return;

    let channelCreator;
    let channelCreatorCategory;
    await connection.query(
        `
        SELECT *
        FROM guildconfig
        WHERE guildId = '${newState.guild.id}'
        `
    ).then(result => {
        channelCreator = result[0][0].guildChannelCreator;
        channelCreatorCategory = result[0][0].guildChannelCreatorCategory;
    });

    if (newState.channelId === channelCreator) {
        await newState.guild.channels.create(
            newState.member.user.username,
            {
                type: "GUILD_VOICE",
                parent: channelCreatorCategory,
            }
        ).then(async (c) => {
            newState.member.voice.setChannel(c.id);
            await connection.query(
                `
                INSERT INTO guildchannels (guildId, channelId)
                VALUES ('${newState.guild.id}', '${c.id}')
                `
            );
        });
    };
    
    let autoChannels = [];
    await connection.query(
        `
        SELECT channelId
        FROM guildchannels
        WHERE guildId = '${newState.guild.id}'
        `
    ).then(result => {
        for (let i = 0; i < result[0].length; i++) {
            autoChannels.push(result[0][i].channelId);
        }
    });

    for (let i = 0; i < autoChannels.length; i++) {
        if (oldState.channelId === autoChannels[i]) {
            let autoChannel = oldState.guild.channels.cache.get(autoChannels[i]);
            if (autoChannel.members.size < 1) {
                try {
                    autoChannel.delete();
                    await connection.query(
                        `
                        DELETE
                        FROM guildchannels
                        WHERE channelId = '${autoChannel.id}'
                        `
                    );
                } catch (err) {
                    console.log(err);
                }
            };
        };
    };

});
        
function consoleLoggingCommands(sentMessage, result = "") {

    if (result.startsWith("SUCCESS")) result = `[${colors.green(result)}]`;
    else if (result.startsWith("ERROR")) result = `[${colors.red(result)}]`;
    return console.log(colors.white(`${getDateTime()} >>> A user executed the ${colors.magenta(sentMessage.command)} command. ${result}`));

};

function getDateTime() {

    let getDate = new Date();
    return `${getDate.toLocaleString()}`;

};

function leadingZeroes(value) {

    let valueString = value + "";
    if (valueString.length < 2) return "0" + valueString;
    else return valueString;
    
};

(async () => {

    connection = await require("./database/db");
    await client.login(process.env.DISCORD_AUTH_TOKEN).catch(err => {
        console.log(`${colors.red(`\n\n\n${getDateTime()} >>> Couldn't log into Discord. Please check your token in the .env file.`)}\n${err}`);
    });

})();