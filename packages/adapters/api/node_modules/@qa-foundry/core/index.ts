// Public enums and base types
export {
    ConfigSourceType,
    type ConfigSourceOptions,
    type ConfigurationSource,
  } from "./config/configsource.interface.js";
  
  // Public store contract and implementation
  export {
    type ConfigStore,
  } from "./config/configstore.interface.js";
    export { ConfigStoreImpl } from "./config/configstore.js";