import { loadEnvConfig, type EnvConfig } from './env.js';

export const config: EnvConfig = loadEnvConfig();
export type { EnvConfig };
