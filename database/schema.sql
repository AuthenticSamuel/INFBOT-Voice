-- CREATE DATABASE

CREATE DATABASE IF NOT EXISTS infbotAlpha;
USE infbotAlpha;

-- CREATE TABLES

CREATE TABLE IF NOT EXISTS guilds (
    guildId VARCHAR(32) PRIMARY KEY NOT NULL,
    guildOwner VARCHAR(32) NOT NULL
);

CREATE TABLE IF NOT EXISTS guildconfig (
    id INT PRIMARY KEY AUTO_INCREMENT,
    guildId VARCHAR(32) NOT NULL,
    guildLocalPrefix VARCHAR(16) DEFAULT "inf/",
    guildChannelCreator VARCHAR(32) DEFAULT "None",
    guildChannelCreatorCategory VARCHAR(32) DEFAULT "None"
);

CREATE TABLE IF NOT EXISTS guildchannels (
    id INT PRIMARY KEY AUTO_INCREMENT,
    guildId VARCHAR(32) NOT NULL,
    channelId VARCHAR(32) NOT NULL
);

-- RESET TABLES

DROP TABLE guilds;
DROP TABLE guildconfig;
DROP TABLE guildchannels;

-- DESCRIBE TABLES

DESCRIBE guilds;
DESCRIBE guildconfig;
DESCRIBE guildchannels;