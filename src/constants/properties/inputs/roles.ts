import type { Snowflake } from "discord.js";
import { ComponentType } from "discord.js";
import { selectMenuComponents } from "../../../handlers/interactions/components";
import type { PropertyInput } from ".";

const roleInput: PropertyInput<Snowflake[]> = interaction => new Promise(resolve => {
  void interaction.update({
    content: "🔻 What roles would you like to use?",
    components: [
      {
        type: ComponentType.ActionRow,
        components: [
          {
            type: ComponentType.RoleSelect,
            customId: `${interaction.id}:select`,
            placeholder: "Select roles",
            minValues: 1,
            maxValues: 10,
          },
        ],
      },
    ],
  });

  selectMenuComponents.set(`${interaction.id}:select`, {
    selectType: "role",
    allowedUsers: [interaction.user.id],
    callback(selectInteraction) {
      const roleIds = selectInteraction.values;
      return resolve([roleIds.length ? roleIds : null, selectInteraction]);
    },
  });
});

export default roleInput;
