import type { Client, GuildTextBasedChannel } from "discord.js";
import config from "../config";
import createLeaderboard from "../constants/scores";
import { getGuildDocument } from "../database";

export default function handleLiveboard(client: Client<true>): void {
  if (config.isPremium) {
    setInterval(() => void (async () => {
      const guilds = Array.from(client.guilds.cache.values());

      for (const guild of guilds) {
        const document = await getGuildDocument(guild.id);
        const countingChannels = Array.from(document.channels.entries());
        for (const [countingChannelId, countingChannel] of countingChannels) {
          if (countingChannel.liveboard) {
            const channel = client.channels.resolve(countingChannel.liveboard.channelId) as GuildTextBasedChannel | null;
            const message = await channel?.messages.fetch(countingChannel.liveboard.messageId).catch(() => null) ?? null;
            if (message?.author.id === client.user.id) {
              await message.edit({
                content: `📊 Leaderboard of <#${countingChannelId}>, as of <t:${Math.floor(Date.now() / 1000)}:R>.`,
                embeds: [
                  {
                    author: {
                      name: `${guild.name} Leaderboard`,
                      icon_url: // eslint-disable-line camelcase
                          guild.iconURL({ size: 128 }) ??
                          guild.members.me?.displayAvatarURL({ size: 128 }) ??
                          client.user.displayAvatarURL({ size: 128 }),
                    },
                    description: createLeaderboard(Array.from(countingChannel.scores.entries())),
                    color: config.colors.primary,
                  },
                ],
              }).catch();
            }
          }
        }
      }
    })(), 30000);
  }
}
