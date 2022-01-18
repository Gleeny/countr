import { Message, MessageOptions } from "discord.js";
import { SelectedCountingChannel, selectedCountingChannels } from "../constants/selectedCountingChannels";
import { getPermissionLevel, ladder } from "../constants/permissions";
import { GuildDocument } from "../database/models/Guild";
import { MentionCommand } from "../@types/command";
import basics from "../commands/mention/_basic";
import config from "../config";
import { countrLogger } from "../utils/logger/countr";
import fs from "fs";
import { join } from "path";
import permissions from "../commands/mention/_permissions";
import { queueDelete } from "./counting";

export default (message: Message, document: GuildDocument): Promise<void> => {
  const existingReply = replies.get(message.id);
  if (!existingReply && message.editedTimestamp) return Promise.resolve(); // ignore editing into a command, but allow editing from command to a new command

  const args = message.content.split(" ").slice(1);
  const commandOrAlias = (args.shift() || "").toLowerCase();

  const basic = basics.find(b => b.triggers.includes(commandOrAlias));
  if (basic) return Promise.resolve(void reply(basic.message, message, existingReply));

  const commandName = aliases.get(commandOrAlias) || commandOrAlias;
  const command = commands.get(commandName);
  const inCountingChannel = document.channels.has(message.channel.id);

  if (!command) {
    return message.react("❓").then(() => {
      if (inCountingChannel) setTimeout(message.delete, 5000);
    }).catch();
  }

  return new Promise<Message>(resolve => {
    try {
      if (inCountingChannel && command.disableInCountingChannel) {
        message.react("💢").catch();
        resolve(message);
        return;
      }

      message.guild?.members.fetch(message.author).then(member => {
        const permissionLevel = getPermissionLevel(member);
        if (permissionLevel < ladder[permissions[commandName] || "ALL"]) {
          message.react("⛔").catch();
          return resolve(message);
        }


        let selectedCountingChannel: SelectedCountingChannel | undefined = inCountingChannel ?
          {
            channel: message.channelId,
            expires: Date.now(),
          } :
          selectedCountingChannels.get([message.guildId, message.author.id].join("."));

        if (selectedCountingChannel?.expires && selectedCountingChannel.expires < Date.now()) {
          selectedCountingChannel = undefined;
          selectedCountingChannels.delete([message.guildId, message.author.id].join("."));
        }

        if (command.requireSelectedCountingChannel && (
          !selectedCountingChannel ||
          selectedCountingChannel.expires && selectedCountingChannel.expires < Date.now()
        )) {
          if (document.channels.size === 1) selectedCountingChannel = { channel: document.channels.values().next().value, expires: Date.now() + 1000 * 60 * 60 * 24 };
          else if (document.channels.has(message.channelId)) selectedCountingChannel = { channel: message.channelId, expires: Date.now() + 1000 * 60 * 60 * 24 };
          else return resolve(message.reply("💥 You need a counting channel selected to run this command. Type `/select` to select a counting channel and then run this command again."));
          selectedCountingChannels.set([message.guildId, message.author.id].join("."), selectedCountingChannel);
        }

        if (args.length < (command.minArguments || 0)) {
          message.react("📏").catch();
          return resolve(message);
        }

        command.execute(message, options => reply(options, message, existingReply), args, document, selectedCountingChannel?.channel).then(resolve);
      });
    } catch (e) {
      message.react("💥").catch();
      resolve(message);
    }
  }).then(response => {
    if (inCountingChannel) {
      setTimeout(() => {
        if (document.channels.has(message.channel.id)) queueDelete([message, response]);
      }, 5000);
    }
  });
};

const replies = new Map<string, Message>();
function reply(optionsOrContent: string | MessageOptions, message: Message, existingReply?: Message) {
  const options: MessageOptions = {
    allowedMentions: { repliedUser: false },
    ...typeof optionsOrContent === "string" ? { content: optionsOrContent } : optionsOrContent,
  };
  if (existingReply) return existingReply.edit(options);
  return message.reply(options).then(newReply => {
    replies.set(message.id, newReply);
    return newReply;
  });
}

// loading commands
const commands = new Map<string, MentionCommand>(), aliases = new Map<string, string>();
fs.readdir(join(__dirname, "../commands/mention"), (err, files) => {
  if (err || !files) return countrLogger.error(err);
  for (const file of files) if (file.endsWith(".js") && !file.startsWith("_")) loadCommand(file.replace(".js", ""));
});

const loadCommand = async (command: string): Promise<void> => {
  const commandFile: MentionCommand = (await import(`../commands/mention/${command}`)).default;
  if (!commandFile.premiumOnly || config.isPremium) {
    commands.set(command, commandFile);
    if (commandFile.aliases) for (const alias of commandFile.aliases) aliases.set(alias, command);
  }
};

export const reloadCommand = (command: string): void => {
  delete require.cache[require.resolve(`../commands/mention/${command}`)];
  loadCommand(command);
};
