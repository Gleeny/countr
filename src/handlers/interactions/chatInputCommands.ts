import { inspect } from "util";
import type { ChatInputCommandInteraction, Snowflake } from "discord.js";
import type { ChatInputCommand } from "../../commands/chatInput";
import { docsUrl } from "../../constants/links";
import selectedCountingChannels from "../../constants/selectedCountingChannel";
import type { CountingChannelSchema, GuildDocument } from "../../database/models/Guild";
import { legacyImportDefault } from "../../utils/import";
import commandsLogger from "../../utils/logger/commands";
import { setSafeTimeout } from "../../utils/safe";

const cooldowns = new Set<`${Snowflake}:${string}`>();

export default async function chatInputCommandHandler(interaction: ChatInputCommandInteraction<"cached">, document: GuildDocument): Promise<void> {
  const commandSegments = [
    interaction.commandName,
    interaction.options.getSubcommandGroup(false),
    interaction.options.getSubcommand(false),
  ].filter(Boolean);

  try {
    const command = await legacyImportDefault<ChatInputCommand>(require.resolve(`../../commands/chatInput/${commandSegments.join("/")}`));

    if (command.serverCooldown) {
      const key = `${interaction.guildId}:${commandSegments.join(" ")}` as const;
      if (cooldowns.has(key)) {
        return void interaction.reply({
          content: `♨ This command is on cooldown! Please wait <t:${Math.floor(Date.now() / 1000) + command.serverCooldown}:R> before using it again.`,
          ephemeral: true,
        });
      }
      cooldowns.add(key);
      void setSafeTimeout(() => cooldowns.delete(key), command.serverCooldown * 1000);
    }

    const countingChannel = document.channels.get(interaction.channelId);
    if (command.disableInCountingChannel && countingChannel) return void interaction.reply({ content: "❌ This command is disabled in counting channels.", ephemeral: true });

    if (command.requireSelectedCountingChannel && document.channels.size === 0) return void interaction.reply({ content: `💥 No counting channel is set up in this server! Create a new one by using \`/channels new\` or link an existing one with \`/channels link\`. New to Countr? Check out the [documentation](<${docsUrl}>) to get started!`, ephemeral: true });

    const selectedCountingChannelId = countingChannel ? interaction.channelId : selectedCountingChannels.get(interaction.user.id);
    const selectedCountingChannel: [Snowflake, CountingChannelSchema] | undefined = selectedCountingChannelId && document.channels.has(selectedCountingChannelId) ? [selectedCountingChannelId, document.channels.get(selectedCountingChannelId)!] : document.getDefaultCountingChannel() ?? undefined; // eslint-disable-line no-undefined

    if (command.requireSelectedCountingChannel && !selectedCountingChannel) return void interaction.reply({ content: "💥 You need a counting channel selected to run this command. Type `/select` to select a counting channel and then run this command again.", ephemeral: true });

    return await command.execute(interaction, Boolean(countingChannel), document, (selectedCountingChannel ?? [null, null]) as never);
  } catch (err) {
    commandsLogger.debug(`Failed to run interaction command /${commandSegments.join(" ")} on interaction ${interaction.id}, channel ${interaction.channelId}, guild ${interaction.guildId}, member ${interaction.user.id}: ${inspect(err)}`);
  }
}
