// Public API — types and interfaces
export { ConfigSourceType, ConfigSourceOptions, ConfigurationSource } from "./configsource.interface.js";
export type { ConfigSource } from "./configsource.interface.js";
export type { ConfigStore } from "./configstore.interface.js";

// Public API — implementation
export { ConfigStoreImpl } from "./configstore.js";

// Public API — source options (consumers need these to configure sources)
export type { EnvConfigSourceOptions } from "./sources/envconfigsource.options.js";
export type { AzureAppConfigSourceOptions } from "./sources/azureappconfigsource.options.js";
