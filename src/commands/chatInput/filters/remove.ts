import { ApplicationCommandOptionType } from "discord.js";
import type { ChatInputCommand } from "..";
import regex from "../../../constants/properties/regex";

const command: ChatInputCommand = {
  description: "Remove a regex filter",
  options: [
    {
      type: ApplicationCommandOptionType.String,
      name: "regex",
      description: "The regex to remove",
      required: true,
      autocomplete: true,
    },
  ],
  autocompletes: {
    regex: {
      requireSelectedCountingChannel: true,
      execute(query, _, __, [, countingChannel]) {
        return countingChannel.filters.filter(filter => filter.includes(String(query))).map(filter => ({ name: filter, value: filter }));
      },
    },
  },
  requireSelectedCountingChannel: true,
  async execute(interaction, ephemeral, document, [, countingChannel]) {
    const input = interaction.options.getString("regex", true);

    if (!countingChannel.filters.includes(input)) {
      return void interaction.reply({
        content: `❌ Filter ${await regex.format(input, interaction.guild)} doesn't exist.`,
        ephemeral,
      });
    }

    countingChannel.filters.splice(countingChannel.filters.indexOf(input), 1);
    document.safeSave();

    return void interaction.reply({ content: `✅ Removed filter ${await regex.format(input, interaction.guild)}.`, ephemeral });
  },
};

export default { ...command } as ChatInputCommand;
