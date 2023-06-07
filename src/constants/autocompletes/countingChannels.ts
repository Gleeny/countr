import type { CategoryChannel } from "discord.js";
import { matchSorter } from "match-sorter";
import { fitText } from "../../utils/text";
import type { CountingChannelAllowedChannelType, CountingChannelRootChannel } from "../discord";
import type { Autocomplete } from ".";

const autocomplete: Autocomplete = {
  execute(query, interaction, document) {
    const search = String(query);

    const countingChannels = Array.from(document.channels.entries());
    const countingChannelsFilteredAndSortedByRelevance = matchSorter(countingChannels.map(([id, countingChannel]) => {
      const channel = interaction.guild.channels.resolve(id) as CountingChannelAllowedChannelType | null;
      return {
        id,
        name: channel?.name,
        parent: (countingChannel.isThread ? channel?.parent?.parent : channel?.parent as CategoryChannel | null) ?? null,
        root: countingChannel.isThread && channel?.parent as CountingChannelRootChannel | null || null,
      };
    }), search, { keys: ["id", "name"] });

    return countingChannelsFilteredAndSortedByRelevance.map(({ id, name, parent, root }) => ({
      name: fitText([
        name ? `#${name} (${id})` : `configured counting channel with ID ${id} (channel was not found)`,
        root && `thread in #${root.name}`,
        parent && `child of category "${parent.name}"`,
      ].filter(Boolean).join(", "), 100),
      value: id,
    }));
  },
};

export default { ...autocomplete } as const;
