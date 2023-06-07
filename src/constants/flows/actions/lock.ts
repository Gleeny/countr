import { TextChannel } from "discord.js";
import type { Action } from ".";

const lock: Action<never> = {
  name: "Lock the counting channel",
  description: "This will lock the counting channel for the everyone-role. This action won't work in threads as of right now.",
  explanation: () => "Lock the counting channel",
  run: async ({ channel }) => {
    if (channel instanceof TextChannel) await channel.permissionOverwrites.edit(channel.guild.roles.everyone, { SendMessages: false });
    return false;
  },
  limitPerFlow: 1,
};

export default lock;
