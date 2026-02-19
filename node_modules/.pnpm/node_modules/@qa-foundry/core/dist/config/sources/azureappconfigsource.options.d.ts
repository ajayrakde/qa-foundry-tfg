import { ConfigSourceOptions } from "../configsource.interface.js";
/**
 * Options specific to the Azure App Configuration source.
 * Placeholder — full implementation to follow.
 */
export interface AzureAppConfigSourceOptions extends ConfigSourceOptions {
    /** Azure App Configuration endpoint URL. */
    endpoint?: string;
    /** Connection string for Azure App Configuration. */
    connectionString?: string;
    /** Credential mode (e.g., "managedIdentity", "connectionString"). */
    credentialMode?: string;
    /** Label filter for configuration keys. */
    label?: string;
    /** Key filter/prefix for configuration keys. */
    keyFilter?: string;
}
//# sourceMappingURL=azureappconfigsource.options.d.ts.map