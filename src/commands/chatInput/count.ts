import type { ChatInputCommand } from ".";
import numberSystems from "../../constants/numberSystems";

const command: ChatInputCommand = {
  description: "Get the current count",
  requireSelectedCountingChannel: true,
  execute(interaction, ephemeral, _, [countingChannelId, countingChannel]) {
    const { format } = numberSystems[countingChannel.type];
    return void interaction.reply({
      content: `📊 Current count for <#${countingChannelId}> is \`${format(countingChannel.count.number)}\`${countingChannel.type === "decimal" ? "" : ` (decimal: \`${countingChannel.count.number}\`)`}, next up is \`${format(countingChannel.count.number + countingChannel.increment)}\`.`,
      ephemeral,
    });
  },
};

export default { ...command } as ChatInputCommand;
