/*
        INFBOT is a discord.js bot. It helps discord users create voice channels
        automatically then delete them when they are no longer required.
        The server owner just needs to initialize the bot then everything
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

            // Basic commands
            case "help": COMMAND_HELP(sentMessage); break;
            case "bot": COMMAND_BOT(sentMessage); break;
            case "user": COMMAND_USER(sentMessage); break;
            case "server": COMMAND_SERVER(sentMessage); break;
            case "prefix": COMMAND_PREFIX(sentMessage); break;
            case "setprefix": COMMAND_SETPREFIX(sentMessage); break;

            // Automatic voice channel commands
            case "status": COMMAND_STATUS(sentMessage); break;
            case "setup": COMMAND_SETUP(sentMessage); break;
            case "unsetup": COMMAND_UNSETUP(sentMessage); break;
            case "channelinfo": COMMAND_CHANNELINFO(sentMessage); break;
            case "setbitrate": COMMAND_SETBITRATE(sentMessage); break;
            case "setuserlimit": COMMAND_SETUSERLIMIT(sentMessage); break;
            case "lock": COMMAND_LOCK(sentMessage); break;
            case "unlock": COMMAND_UNLOCK(sentMessage); break;

        };

    };

});

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

        try {

            consoleLoggingAutoVoice("creating");

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

            consoleLoggingAutoVoice("created");

        } catch (err) {
            console.log(err);
        };
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

                consoleLoggingAutoVoice("deleting");

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
                };

                consoleLoggingAutoVoice("deleted");

            };
        };
    };

});

client.on("messageReactionAdd", async (reaction, user) => {         // Only the Infernal Discord Server currently supports Reaction Roles

    if (reaction.message.partial) await reaction.message.fetch();
    if (reaction.partial) await reaction.fetch();

    if (user.bot || !reaction.message.guild) return;

    if (reaction.message.channel.id === config.INFERNAL.REACTION_ROLES_CHANNEL) {

        switch (reaction.emoji.id) {

            case "650436228059234313": await reaction.message.guild.members.cache.get(user.id).roles.add("649915251470630912"); break;
            case "687941410019737745": await reaction.message.guild.members.cache.get(user.id).roles.add("687926881752055808"); break;
            case "655107911374209066": await reaction.message.guild.members.cache.get(user.id).roles.add("649917383900790805"); break;
            case "655106909472292874": await reaction.message.guild.members.cache.get(user.id).roles.add("649915298303967233"); break;
            case "728612521581215804": await reaction.message.guild.members.cache.get(user.id).roles.add("728612618612244513"); break;
            case "726857979047182357": await reaction.message.guild.members.cache.get(user.id).roles.add("726852875426201650"); break;
            case "687941409919074358": await reaction.message.guild.members.cache.get(user.id).roles.add("687640075512840196"); break;
            case "726855950614397011": await reaction.message.guild.members.cache.get(user.id).roles.add("726852871974551643"); break;

        };

    };

});

client.on("messageReactionRemove", async (reaction, user) => {      // Only the Infernal Discord Server currently supports Reaction Roles

    if (reaction.message.partial) await reaction.message.fetch();
    if (reaction.partial) await reaction.fetch();

    if (user.bot || !reaction.message.guild) return;

    if (reaction.message.channel.id === config.INFERNAL.REACTION_ROLES_CHANNEL) {

        switch (reaction.emoji.id) {

            case "650436228059234313": await reaction.message.guild.members.cache.get(user.id).roles.remove("649915251470630912"); break;
            case "687941410019737745": await reaction.message.guild.members.cache.get(user.id).roles.remove("687926881752055808"); break;
            case "655107911374209066": await reaction.message.guild.members.cache.get(user.id).roles.remove("649917383900790805"); break;
            case "655106909472292874": await reaction.message.guild.members.cache.get(user.id).roles.remove("649915298303967233"); break;
            case "728612521581215804": await reaction.message.guild.members.cache.get(user.id).roles.remove("728612618612244513"); break;
            case "726857979047182357": await reaction.message.guild.members.cache.get(user.id).roles.remove("726852875426201650"); break;
            case "687941409919074358": await reaction.message.guild.members.cache.get(user.id).roles.remove("687640075512840196"); break;
            case "726855950614397011": await reaction.message.guild.members.cache.get(user.id).roles.remove("726852871974551643"); break;

        };

    };

});

async function COMMAND_HELP(sentMessage) {

    let help1Embed = new MessageEmbed()
        .setColor(config.COLOR.EVENT)
        .setTitle("INFBOT | Help Menu")
        .addFields(
            {name: "Thank you for using INFBOT!", value: "*GLOBAL* prefix is `" + config.PREFIX.GLOBAL + "`.\nFind your local prefix by typing `" + config.PREFIX.GLOBAL + "prefix` in a server I'm in (default: `" + config.PREFIX.LOCAL + "`).\nRemember that all commands below can use both the *GLOBAL* & *LOCAL* prefixes", inline: false},
            {name: "\u200b", value: "\u200b", inline: false},
            {name: "General Commands", value: "These commands help you manage INFBOT and most importantly, setup INFBOT Voice Channels.", inline: false},

            {name: `${config.PREFIX.GLOBAL}help`, value: "```ini\n[Shows the help menu.]```", inline: false},
            
            {name: `${config.PREFIX.GLOBAL}bot`, value: "```ini\n[Shows you INFBOT info and updates.]\n\u200b\n\u200b```", inline: true},
            {name: `${config.PREFIX.GLOBAL}user`, value: "```ini\n[Shows you some info about you or a user you mentionned.]```", inline: true},
            {name: `${config.PREFIX.GLOBAL}server`, value: "```ini\n[Shows you some info about a server.]\n\u200b```", inline: true},

            {name: `${config.PREFIX.GLOBAL}setup [Owner]`, value: "```ini\n[Sets up INFBOT's Automatic Voice Channels.]\n\u200b```", inline: true},
            {name: `${config.PREFIX.GLOBAL}unsetup [Owner]`, value: "```ini\n[Gets rid of INFBOT's Automatic Voice Channels.]\n\u200b```", inline: true},
            {name: `${config.PREFIX.GLOBAL}status`, value: "```ini\n[Shows you if INFBOT's Automatic Voice Channels are active or not.]```", inline: true},

            {name: `${config.PREFIX.GLOBAL}prefix`, value: "```ini\n[Shows you the current prefixes (GLOBAL & LOCAL).]```", inline: true},
            {name: `${config.PREFIX.GLOBAL}setprefix [Owner]`, value: "```ini\n[Allows you to change the LOCAL prefix.]```", inline: true},
            {name: "\u200b", value: "\u200b", inline: false},

            {name: "Channel Controls", value: "These are commands that can be used when you've in a regular VC or in a INFVC (INFBOT Voice Channel). Commands marked with asterisks (*) can only be used in INFVCs.", inline: false},
            
            {name: `${config.PREFIX.GLOBAL}channelinfo`, value: "```ini\n[View some info about the VC you're currently in.]```", inline: true},
            {name: `${config.PREFIX.GLOBAL}setbitrate *`, value: "```ini\n[Change the bitrate of the INFVC you're currently in.]```", inline: true},
            {name: `${config.PREFIX.GLOBAL}setuserlimit *`, value: "```ini\n[Change the user limit of the INFVC you're currently in.]```", inline: true},

            {name: `${config.PREFIX.GLOBAL}lock *`, value: "```ini\n[Make the INFVC you're currently in private (users can no longer join).]```", inline: true},
            {name: `${config.PREFIX.GLOBAL}unlock *`, value: "```ini\n[Make the INFVC you're currently in public (default behavior).]```", inline: true},

            // template:  {name: `${config.PREFIX.GLOBAL}`, value: "```ini\n[]```", inline: },
        );

    let help2Embed = new MessageEmbed()
        .setColor(config.COLOR.EVENT)
        .setTitle("INFBOT | Additionnal Help")
        .setDescription("Do you need any additionnal help? Do you have any questions?")
        .addField("Head over to our Discord Server:", "[Infernal Discord Server](https://discord.gg/jwEp6VX)");

    let help3Embed = new MessageEmbed()
        .setColor(config.COLOR.EVENT)
        .setTitle("INFBOT | Invite & Vote")
        .setDescription("Don't forget to add this bot to your server or upvote it if you like it!")
        .addField("Want to use INFBOT on your own server?", "[Invite INFBOT to your server](https://discord.com/oauth2/authorize?client_id=732316684496404521&scope=bot&permissions=17047568)")
        .addField("Head over to our Top.gg page:", "[Vote on Top.gg](https://top.gg/bot/732316684496404521)")
        .setTimestamp()
        .setFooter(`INFBOT by Zenyth#0001 • V${config.VERSION.INFBOT}`, config.BOT_AVATAR);
    await sentMessage.message.author.send({embeds: [help1Embed, help2Embed, help3Embed]});

        consoleLoggingCommands(sentMessage);
        
    let helpEmbed = new MessageEmbed()
        .setColor(config.COLOR.EVENT)
        .setTitle("Check your private messages!");
    return sentMessage.message.reply({embeds: [helpEmbed]});

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
        return message.reply({embeds: [botEmbed]});
    });

};

function COMMAND_USER(sentMessage) {

    consoleLoggingCommands(sentMessage)

    let member = sentMessage.message.mentions.members.first() || sentMessage.message.member
    let user = sentMessage.message.mentions.users.first() || sentMessage.message.author

    let userEmbed = new MessageEmbed()
        .setColor(config.COLOR.EVENT)
        .setThumbnail(user.avatarURL())
        .setTitle("User Information:")
        .setDescription("Here's some information about this user")
        .addFields(
            {name: "Username:", value: `${user.username}#${user.discriminator}`},
            {name: "ID:", value: `${user.id}`},
            {name: "Joined this server:", value: `${formatFullDate(member.joinedAt)}`},
            {name: "Joined Discord:", value: `${formatFullDate(user.createdAt)}`},
        );
    return sentMessage.message.reply({embeds: [userEmbed]})

};

function COMMAND_SERVER(sentMessage) {

    consoleLoggingCommands(sentMessage)

    let guild = sentMessage.message.guild;

    let guildEmbed = new MessageEmbed()
        .setColor(config.COLOR.EVENT)
        .setThumbnail(guild.iconURL())
        .setTitle(`Server Information: ${guild.name}`)
        .setDescription("Here's some information about this server")
        .addFields(
            {name: "Members:", value: `${guild.memberCount}`},
            {name: "Channel Count:", value: `${guild.channels.cache.filter((c) => c.type !== "GUILD_CATEGORY").size}`},
            {name: "Created:", value: `${formatFullDate(guild.createdAt)}`},
            {name: "INFBOT LOCAL prefix:", value: `${guildLocalPrefixes.get(guild.id)}`},
        );
    return sentMessage.message.reply({embeds: [guildEmbed]});

};

function COMMAND_PREFIX(sentMessage) {

    consoleLoggingCommands(sentMessage)

    let prefixEmbed = new MessageEmbed()
        .setColor(config.COLOR.EVENT)
        .setTitle("INFBOT Command Prefixes")
        .setDescription("Prefixes are used when you want to execute INFBOT commands. There is a *GLOBAL* one which is manually set by the developer and a *LOCAL* one that admins can change on a server-to-server basis with the `" + config.PREFIX.GLOBAL + "setprefix` command.")
        .addFields(
            {name: "GLOBAL", value: config.PREFIX.GLOBAL, inline: true},
            {name: "LOCAL", value: guildLocalPrefixes.get(sentMessage.message.guild.id), inline: true}
        );
    return sentMessage.message.reply({embeds: [prefixEmbed]});

};

async function COMMAND_SETPREFIX(sentMessage) {

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

        let setPrefixEmbed = new MessageEmbed()
            .setColor(config.COLOR.ERROR)
            .setTitle("Error!")
            .setDescription("You need to be the owner of this server to change the *LOCAL* prefix.")
        return sentMessage.message.reply({embeds: [setPrefixEmbed]});

    };

    if (sentMessage.args.length !== 1) {

        consoleLoggingCommands(sentMessage, "ERROR: ARGS");

        let setPrefixEmbed = new MessageEmbed()
            .setColor(config.COLOR.ERROR)
            .setTitle("Error!")
            .setDescription("Please provide a valid prefix.\n\n*A prefix is a series of characters without any spaces.*\nExample: `" + config.PREFIX.GLOBAL + "setprefix newprefix!`");
        return sentMessage.message.reply({embeds: [setPrefixEmbed]});

    };

    await connection.query(
        `
        UPDATE guildconfig
        SET guildLocalPrefix = '${sentMessage.args[0]}'
        WHERE guildId = '${sentMessage.message.guild.id}'
        `
    );

    guildLocalPrefixes.set(sentMessage.message.guild.id, sentMessage.args[0]);

    consoleLoggingCommands(sentMessage, "SUCCESS");
    
    let setPrefixEmbed = new MessageEmbed()
        .setColor(config.COLOR.SUCCESS)
        .setTitle("Success!")
        .setDescription("You've successfully set your *LOCAL* prefix to `" + sentMessage.args[0] + "`.");
    return sentMessage.message.reply({embeds: [setPrefixEmbed]});

};

async function COMMAND_STATUS(sentMessage) {

    let guildCreatorChannel;
    let guildCreatorChannelCategory;
    await connection.query(
        `
        SELECT guildChannelCreator, guildChannelCreatorCategory
        FROM guildconfig
        WHERE guildId = '${sentMessage.message.guild.id}'
        `
    ).then(result => {

        guildCreatorChannel = result[0][0].guildChannelCreator;
        guildCreatorChannelCategory = result[0][0].guildChannelCreatorCategory;

    });

    if (guildCreatorChannel !== "None" && guildCreatorChannelCategory !== "None") {
        
        let statusEmbed = new MessageEmbed()
            .setColor(config.COLOR.EVENT)
            .setTitle("INFBOT Voice Channels are up and running!")
            .setDescription("Enter the `" + config.AUTO_VC.CHANNEL_NAME + "` channel to get started.")
        return sentMessage.message.reply({embeds: [statusEmbed]});

    } else if (guildCreatorChannel === "None" && guildCreatorChannelCategory === "None") {

        let statusEmbed = new MessageEmbed()
            .setColor(config.COLOR.EVENT)
            .setTitle("INFBOT Voice Channels aren't running on this server.")
            .setDescription("If your an admin, use `" + config.PREFIX.GLOBAL + "setup` to initialize INFBOT Voice Channels.");
        return sentMessage.message.reply({embeds: [statusEmbed]});

    } else {

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

        let statusEmbed = new MessageEmbed()
            .setColor(config.COLOR.WARNING)
            .setTitle("We've found an issue with your setup...")
            .setDescription("It seems that INFBOT Voice Channels were partially setup on this server. This shouldn't happen. We've reset the setup process, therefore, if you're the server owner, use `" + config.PREFIX.GLOBAL + "setup` to re-initialize INFBOT Voice Channels. You may delete any residual channels if there are any.");
        return sentMessage.message.reply({embeds: [statusEmbed]});

    };

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

        let setupEmbed = new MessageEmbed()
            .setColor(config.COLOR.ERROR)
            .setTitle("You need to be the server owner to setup INFBOT Voice Channels.")
        return sentMessage.message.reply({embeds: [setupEmbed]});

    };

    let channelCreator;
    let channelCreatorCategory;
    await connection.query(
        `
        SELECT guildChannelCreator, guildChannelCreatorCategory
        FROM guildconfig
        WHERE guildId = '${sentMessage.message.guild.id}'
        `
    ).then(result => {
        channelCreator = result[0][0].guildChannelCreator;
        channelCreatorCategory = result[0][0].guildChannelCreatorCategory;
    });

    if (channelCreator !== "None" && channelCreatorCategory !== "None") {

        consoleLoggingCommands(sentMessage, "WARN: ACTIVE");

        let setupEmbed = new MessageEmbed()
            .setColor(config.COLOR.WARNING)
            .setTitle("INFBOT Voice Channels are already setup on this server.")
        return sentMessage.message.reply({embeds: [setupEmbed]});

    } else if (channelCreator === "None" && channelCreatorCategory === "None") {

        try {

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

            let setupEmbed = new MessageEmbed()
                .setColor(config.COLOR.SUCCESS)
                .setTitle("INFBOT Voice Channels are now up and running!")
                .setDescription("Enter the `" + config.AUTO_VC.CHANNEL_NAME + "` channel to get started.")
            return sentMessage.message.reply({embeds: [setupEmbed]});
    
        } catch (err) {
            console.log(err);
        };

    } else {

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

        consoleLoggingCommands(sentMessage, "WARN: PARTIAL ACTIVE")

        let setupEmbed = new MessageEmbed()
            .setColor(config.COLOR.WARNING)
            .setTitle("We've found an issue with your setup...")
            .setDescription("It seems that INFBOT Voice Channels were partially setup on this server. This shouldn't happen. We've reset the setup process, therefore, please use `" + config.PREFIX.GLOBAL + "setup` to re-initialize INFBOT Voice Channels.");
        return sentMessage.message.reply({embeds: [setupEmbed]});

    };
};

async function COMMAND_UNSETUP(sentMessage) {

    let ownerId = sentMessage.message.guild.ownerId;

    if (sentMessage.message.author.id != ownerId) {

        consoleLoggingCommands(sentMessage, "ERROR: PERMS");

        let unsetupEmbed = new MessageEmbed()
            .setColor(config.COLOR.ERROR)
            .setTitle("You need to be the server owner to remove INFBOT Voice Channels.")
        return sentMessage.message.reply({embeds: [unsetupEmbed]});

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

        consoleLoggingCommands(sentMessage, "WARN: INACTIVE");

        let unsetupEmbed = new MessageEmbed()
            .setColor(config.COLOR.EVENT)
            .setTitle("INFBOT Voice Channels aren't running on this server.");
        return sentMessage.message.reply({embeds: [unsetupEmbed]});

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

    let unsetupEmbed = new MessageEmbed()
        .setColor(config.COLOR.SUCCESS)
        .setTitle("INFBOT Voice Channels have been removed from this server.");
    return sentMessage.message.reply({embeds: [unsetupEmbed]});
            
};

function COMMAND_CHANNELINFO(sentMessage) {

    
    if (!sentMessage.message.member.voice.channel) {
        
        consoleLoggingCommands(sentMessage, "WARN: NO VC");
        
        let channelInfoEmbed = new MessageEmbed()
        .setColor(config.COLOR.WARNING)
        .setTitle("You need to be in a voice channel.");
        return sentMessage.message.reply({embeds: [channelInfoEmbed]});
        
    };
    
    let channel = sentMessage.message.member.voice.channel

    consoleLoggingCommands(sentMessage)

    let userLimit;
    if (channel.userLimit === 0) userLimit = "Unlimited";
    else userLimit = channel.userLimit;

    let channelInfoEmbed = new MessageEmbed()
        .setColor(config.COLOR.EVENT)
        .setThumbnail(sentMessage.message.guild.iconURL)
        .setTitle("Here's some information about this voice channel.")
        .addFields(
            {name: "Name:", value: `${channel.name}`},
            {name: "ID:", value: `${channel.id}`},
            {name: "Bitrate:", value: `${Math.round(channel.bitrate / 1000)}kbps`},
            {name: "User Limit:", value: `${channel.userLimit}`},
        );
    return sentMessage.message.reply({embeds: [channelInfoEmbed]});

};

async function COMMAND_SETBITRATE(sentMessage) {

    let autoChannels = [];
    await connection.query(
        `
        SELECT channelId
        FROM guildchannels
        WHERE guildId = '${sentMessage.message.guild.id}'
        `
    ).then(result => {

        result[0].forEach((c) => {
            autoChannels.push(c.channelId);
        })

    });

    if (!sentMessage.message.member.voice.channel || !autoChannels.includes(sentMessage.message.member.voice.channel.id)) {
        
        consoleLoggingCommands(sentMessage, "WARN: NO INFVC");
        
        let setBitrateEmbed = new MessageEmbed()
            .setColor(config.COLOR.WARNING)
            .setTitle("You need to be in an INFBOT Voice Channel.");
        return sentMessage.message.reply({embeds: [setBitrateEmbed]});
        
    };

    let maxBitrate = 96;
    switch (sentMessage.message.guild.premiumTier) {
        case "NONE": maxBitrate = 96; break;
        case "TIER_1": maxBitrate = 128; break;
        case "TIER_2": maxBitrate = 256; break;
        case "TIER_3": maxBitrate = 384; break;
    };

    if (sentMessage.args.length !== 1 || isNaN(sentMessage.args[0]) || sentMessage.args[0] < 8 || sentMessage.args[0] > maxBitrate) {

        consoleLoggingCommands(sentMessage, "ERROR: ARGS");

        let setBitrateEmbed = new MessageEmbed()
            .setColor(config.COLOR.ERROR)
            .setTitle("Error!")
            .setDescription("Please provide a valid bitrate.\n\n*The bitrate is a number between `8`kbps and `" + maxBitrate + "`kbps.*\nExample: `" + config.PREFIX.GLOBAL + "setbitrate 96`");
        return sentMessage.message.reply({embeds: [setBitrateEmbed]});

    };

    await sentMessage.message.member.voice.channel.setBitrate(Math.round(sentMessage.args[0]) * 1000);
    
    consoleLoggingCommands(sentMessage, `SUCCESS: ${sentMessage.message.member.voice.channel.bitrate / 1000}KBPS`);

    let setBitrateEmbed = new MessageEmbed()
        .setColor(config.COLOR.SUCCESS)
        .setTitle(`Your channel's bitrate is now set to ${sentMessage.message.member.voice.channel.bitrate / 1000}kbps.`);
    return sentMessage.message.reply({embeds: [setBitrateEmbed]});

};

async function COMMAND_SETUSERLIMIT(sentMessage) {

    let autoChannels = [];
    await connection.query(
        `
        SELECT channelId
        FROM guildchannels
        WHERE guildId = '${sentMessage.message.guild.id}'
        `
    ).then(result => {

        result[0].forEach((c) => {
            autoChannels.push(c.channelId);
        })

    });

    if (!sentMessage.message.member.voice.channel || !autoChannels.includes(sentMessage.message.member.voice.channel.id)) {
        
        consoleLoggingCommands(sentMessage, "WARN: NO INFVC");
        
        let setUserLimitEmbed = new MessageEmbed()
            .setColor(config.COLOR.WARNING)
            .setTitle("You need to be in an INFBOT Voice Channel.");
        return sentMessage.message.reply({embeds: [setUserLimitEmbed]});
        
    };

    if (sentMessage.args.length !== 1 || isNaN(sentMessage.args[0]) || sentMessage.args[0] < 0 || sentMessage.args[0] > 99) {

        consoleLoggingCommands(sentMessage, "ERROR: ARGS");

        let setUserLimitEmbed = new MessageEmbed()
            .setColor(config.COLOR.ERROR)
            .setTitle("Error!")
            .setDescription("Please provide a valid userlimit.\n\n*The userlimit is a number between `0` (unlimited) and `99` users.*\nExample: `" + config.PREFIX.GLOBAL + "setuserlimit 5`");
        return sentMessage.message.reply({embeds: [setUserLimitEmbed]});

    };

    await sentMessage.message.member.voice.channel.setUserLimit(Math.round(sentMessage.args[0]));
    
    consoleLoggingCommands(sentMessage, `SUCCESS: ${sentMessage.message.member.voice.channel.userLimit} USERS`);
    
    let userLimit = "";
    if (sentMessage.message.member.voice.channel.userLimit == 0) userLimit = "an unlimited amount of users";
    else if (sentMessage.message.member.voice.channel.userLimit == 1) userLimit = "1 user";
    else userLimit = `${sentMessage.message.member.voice.channel.userLimit} users`;
    
    let setUserLimitEmbed = new MessageEmbed()
        .setColor(config.COLOR.SUCCESS)
        .setTitle(`Your channel's userlimit is now set to ${userLimit}.`);
    return sentMessage.message.reply({embeds: [setUserLimitEmbed]});

};

async function COMMAND_LOCK(sentMessage) {

    let autoChannels = [];
    await connection.query(
        `
        SELECT channelId
        FROM guildchannels
        WHERE guildId = '${sentMessage.message.guild.id}'
        `
    ).then(result => {

        result[0].forEach((c) => {
            autoChannels.push(c.channelId);
        })

    });

    if (!sentMessage.message.member.voice.channel || !autoChannels.includes(sentMessage.message.member.voice.channel.id)) {
        
        consoleLoggingCommands(sentMessage, "WARN: NO INFVC");
        
        let lockEmbed = new MessageEmbed()
            .setColor(config.COLOR.WARNING)
            .setTitle("You need to be in an INFBOT Voice Channel.");
        return sentMessage.message.reply({embeds: [lockEmbed]});
        
    };

    await sentMessage.message.guild.channels.cache.get(sentMessage.message.member.voice.channel.id).permissionOverwrites.edit(
        sentMessage.message.guild.id, {
            CONNECT: false
        }
    );

    consoleLoggingCommands(sentMessage, "SUCCESS");

    let lockEmbed = new MessageEmbed()
        .setColor(config.COLOR.SUCCESS)
        .setTitle("You've successfully locked your channel.")
        .setDescription("Use `" + config.PREFIX.GLOBAL + "unlock` to unlock it.");
    return sentMessage.message.reply({embeds: [lockEmbed]});

};

async function COMMAND_UNLOCK(sentMessage) {

    let autoChannels = [];
    await connection.query(
        `
        SELECT channelId
        FROM guildchannels
        WHERE guildId = '${sentMessage.message.guild.id}'
        `
    ).then(result => {

        result[0].forEach((c) => {
            autoChannels.push(c.channelId);
        })

    });

    if (!sentMessage.message.member.voice.channel || !autoChannels.includes(sentMessage.message.member.voice.channel.id)) {
        
        consoleLoggingCommands(sentMessage, "WARN: NO INFVC");
        
        let unlockEmbed = new MessageEmbed()
            .setColor(config.COLOR.WARNING)
            .setTitle("You need to be in an INFBOT Voice Channel.");
        return sentMessage.message.reply({embeds: [unlockEmbed]});
        
    };

    await sentMessage.message.guild.channels.cache.get(sentMessage.message.member.voice.channel.id).permissionOverwrites.edit(
        sentMessage.message.guild.id, {
            CONNECT: true
        }
    );

    consoleLoggingCommands(sentMessage, "SUCCESS");

    let unlockEmbed = new MessageEmbed()
        .setColor(config.COLOR.SUCCESS)
        .setTitle("You've successfully unlocked your channel.");
    return sentMessage.message.reply({embeds: [unlockEmbed]});

};

function consoleLoggingCommands(sentMessage, result = "") {

    if (result.startsWith("SUCCESS")) result = `[${colors.green(result)}]`;
    else if (result.startsWith("ERROR")) result = `[${colors.red(result)}]`;
    else if (result.startsWith("WARN")) result = `[${colors.yellow(result)}]`;
    return console.log(colors.white(`${getDateTime()} >>> A user executed the ${colors.magenta(sentMessage.command)} command. ${result}`));

};

function consoleLoggingAutoVoice(state) {

    let result = "";
    switch (state) {
        case "creating": result = "A user is creating a new voice channel..."; break;
        case "created": result = "Voice channel created successfully."; break;
        case "deleting": result = "Deleting an empty voice channel..."; break;
        case "deleted": result = "Voice channel deleted successfully."; break;
    };
    return console.log(colors.yellow(`${getDateTime()} >>> ${result}`));

};

function getDateTime() {

    let getDate = new Date();
    return `${getDate.toLocaleString()}`;

};

function formatFullDate(date) {

    let options = {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        timeZoneName: "short"
    };
    return date.toLocaleDateString(undefined, options);

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