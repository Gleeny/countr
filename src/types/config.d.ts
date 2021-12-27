import { CacheWithLimitsOptions } from "discord.js";
import { ClientCluster } from "./cluster";

export interface Config {
  client: {
    id: string,
    secret: string,
    token: string,
    caches: CacheWithLimitsOptions
  },
  cluster: ClientCluster,
  databaseUri: string,
  isPremium?: boolean,

  admins: Array<string>,
  guild?: string | null,

  apiPort?: number | null,
  apiUri?: string | null,

  colors: {
    primary: number,
    success: number,
    error: number,
    warning: number,
    info: number,
  },

  integration: {
    webhookUrl?: string | null,
  },

  access: {
    enabled: boolean,
    interval: number,
    webhookLog?: string,
  },

  progressIcons: {
    complete: string,
    selected: string,
    incomplete: string,
  },

  statusPage?: string | null,
}
