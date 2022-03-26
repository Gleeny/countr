import * as guilds from "./database/guilds";
import { Client, Options } from "discord.js";
import { askForPermissionToInitialize, markClusterAsReady } from "./utils/cluster";
import accessHandler from "./handlers/access";
import config from "./config";
import { connection } from "./database";
import countingHandler from "./handlers/counting";
import { countrLogger } from "./utils/logger/countr";
import { discordLogger } from "./utils/logger/discord";
import { getPresence } from "./utils/cluster/presence";
import { inspect } from "util";
import interactionsHandler from "./handlers/interactions";
import { inviteUrl } from "./constants/links";
import messageCommandHandler from "./handlers/messageCommands";
import { postStats } from "./utils/cluster/stats";
import prepareGuild from "./handlers/prepareGuild";
import replaceMessage from "./handlers/counting/lastMessageReplacement";
import updateLiveboards from "./handlers/liveboard";

const client = new Client({
  makeCache: Options.cacheWithLimits({
    ...config.client.caches,
  }),
  partials: ["USER", "CHANNEL", "GUILD_MEMBER", "MESSAGE", "REACTION"],
  userAgentSuffix: [],
  presence: { status: "dnd" },
  intents: ["GUILDS", "GUILD_MESSAGES"],
  shards: config.cluster.shards,
  shardCount: config.cluster.shardCount,
});

let disabledGuilds = new Set();

client.once("ready", async client => {
  countrLogger.info(`Ready as ${client.user.tag} on shards ${config.cluster.shards.join(", ")}! Caching guilds...`);
  markClusterAsReady();

  // stats
  setInterval(() => postStats(client, Boolean(disabledGuilds.size)), 10000);

  // prepare guilds
  if (client.guilds.cache.size) {
    disabledGuilds = new Set(client.guilds.cache.map(g => g.id)); // cache guilds

    const cacheStart = Date.now();
    await guilds.touch(client.guilds.cache.map(g => g.id));
    countrLogger.info(`${client.guilds.cache.size} guilds cached in ${Math.ceil((Date.now() - cacheStart) / 1000)}s. Processing available guilds...`);

    // process guilds
    const processingStart = Date.now();
    await Promise.all(client.guilds.cache.map(async guild => {
      await prepareGuild(guild);
      disabledGuilds.delete(guild.id);
    }));
    countrLogger.info(`${client.guilds.cache.size} guilds processed in ${Math.ceil((Date.now() - processingStart) / 1000)}s.`);

    // finish up
    disabledGuilds = new Set();
  } else countrLogger.warn(`Add the bot with this link: ${inviteUrl}`);

  // presence
  updatePresence();
  setInterval(updatePresence, 300_000);

  // premium
  if (config.isPremium) {
    updateLiveboards(client);
    setInterval(() => updateLiveboards(client), 1000 * 60);
  }

  // interactions
  interactionsHandler(client).then(() => countrLogger.info("Now listening to interactions."));

  // access handler
  if (config.access.enabled) accessHandler(client);
});

async function updatePresence() {
  const presence = await getPresence(client);
  return client.user?.setPresence(presence);
}

client.on("messageCreate", async message => {
  if (
    !message.guildId ||
    disabledGuilds?.has(message.guildId) ||
    message.author.bot ||
    message.type !== "DEFAULT"
  ) return;

  const document = await guilds.get(message.guildId);
  const channel = document.channels.get(message.channelId);
  if (channel) return countingHandler(message, document, channel);

  if (message.content.match(`^<@!?${client.user?.id}> `)) return messageCommandHandler(message, document);

  if (message.content.match(`^<@!?${client.user?.id}>`)) {
    return void message.reply({
      content: "hello",
    });
  }
});

client.on("messageDelete", async message => {
  if (
    !message.guildId ||
    disabledGuilds?.has(message.guildId) ||
    message.author?.bot ||
    message.type !== "DEFAULT"
  ) return;

  const document = await guilds.get(message.guildId);
  const channel = document.channels.get(message.channelId);
  if (channel) replaceMessage(message, document, channel);
});

client.on("messageUpdate", async (old, message) => {
  if (
    !message.guildId ||
    disabledGuilds?.has(message.guildId) ||
    message.author?.bot ||
    message.type !== "DEFAULT"
  ) return;

  const document = await guilds.get(message.guildId);
  if (message.content.match(`^<@!?${client.user?.id}> `)) return messageCommandHandler(message, document);

  const channel = document.channels.get(message.channelId);
  if (channel && (
    channel.modules.includes("talking") ?
      (old.content || `${channel.count.number}`).split(" ")[0] !== message.content.split(" ")[0] :
      (old.content || `${channel.count.number}`) !== message.content
  )) replaceMessage(message, document, channel);
});

client
  .on("debug", info => void discordLogger.debug(info))
  .on("error", error => void discordLogger.error(`Cluster errored. ${inspect(error)}`))
  .on("rateLimit", rateLimitData => void discordLogger.warn(`Rate limit ${inspect(rateLimitData)}`))
  .on("ready", () => void discordLogger.info("All shards have been connected."))
  .on("shardDisconnect", (event, id) => void discordLogger.warn(`Shard ${id} disconnected. ${inspect(event)}`))
  .on("shardError", (error, id) => void discordLogger.error(`Shard ${id} errored. ${inspect(error)}`))
  .on("shardReady", id => void discordLogger.info(`Shard ${id} is ready.`))
  .on("shardReconnecting", id => void discordLogger.warn(`Shard ${id} is reconnecting.`))
  .on("shardResume", (id, replayed) => void discordLogger.info(`Shard ${id} resumed. ${replayed} events replayed.`))
  .on("warn", info => void discordLogger.warn(info));

Promise.all([
  connection,
  new Promise(resolve => {
    const timeout = setInterval(() => askForPermissionToInitialize().then(greenLight => {
      if (greenLight) {
        resolve(void 0);
        clearInterval(timeout);
      }
    }), 1000);
  }),
]).then(() => {
  countrLogger.info("Green light received and connected to the database. Logging in to Discord.");
  client.login(config.client.token);
}).catch(error => {
  countrLogger.error(`Failed to connect to database: ${inspect(error)}`);
  process.exit(1);
});

setInterval(() => postStats(client, Boolean(disabledGuilds.size)), 10000);

process.on("unhandledRejection", error => countrLogger.error(`Unhandled rejection: ${inspect(error)}`));
