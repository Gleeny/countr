import type { Snowflake } from "discord.js";
import { snowflakeRegex } from "../discord";
import { rolesInput } from "./inputs";
import type { Property } from ".";

const roles: Property<Snowflake[]> = {
  name: "Role(s)",
  description: "Any role or list of roles. Make sure Countr is above the role(s).",
  schema: { type: "array", items: { type: "string", pattern: snowflakeRegex.source }, minItems: 1, uniqueItems: true },
  input: rolesInput,
  convert: userInput => userInput.filter((entry, index, arr) => arr.indexOf(entry) === index),
  format: roleIds => roleIds.map(roleId => `<@&${roleId}>`).join(", "),
};

export default roles;
