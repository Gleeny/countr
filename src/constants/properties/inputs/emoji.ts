import type { APIEmoji } from "discord.js";
import { parseEmoji, TextInputStyle } from "discord.js";
import { createModalTextInput, getModalTextInput, modals } from "../../../handlers/interactions/modals";
import type { PropertyInput } from ".";

const emojiInput: PropertyInput<APIEmoji> = interaction => new Promise(resolve => {
  void interaction.showModal({
    title: "Insert an emoji below",
    customId: `${interaction.id}:modalSubmit`,
    components: [
      createModalTextInput({
        style: TextInputStyle.Short,
        customId: "query",
        label: "Enter a Unicode emoji or server emoji",
        placeholder: "😁 or :smile: or <:custom:1234567890123456789>",
        minLength: 1,
        required: true,
      }),
    ],
  });

  modals.set(`${interaction.id}:modalSubmit`, {
    callback(modalInteraction) {
      const query = String(getModalTextInput(modalInteraction.components, "query"));
      const emoji = parseEmoji(query);
      return resolve([emoji ?? null, modalInteraction]);
    },
  });
});

export default emojiInput;
