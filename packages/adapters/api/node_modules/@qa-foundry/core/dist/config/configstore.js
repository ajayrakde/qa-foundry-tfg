import { ConfigSourceType, } from "./configsource.interface.js";
import { EnvConfigSource } from "./sources/envconfigsource.js";
import { AzureAppConfigSource } from "./sources/azureappconfigsource.js";
/**
 * Concrete implementation of ConfigStore.
 *
 * Acts as a read-only, cached wrapper around a ConfigSource.
 *
 * Handles:
 * - Source selection based on ConfigSourceType enum
 * - Connecting to the selected source on initialize()
 * - Fetching and caching all key-value pairs from the source
 * - Serving cached values via get / getRequired / has / getAll
 * - Refresh-and-read via refreshAndGet / refreshAndGetRequired / refreshAndGetAll
 * - Implicit cache refresh after internal source mutations
 * - Default ENV behavior (.env at cwd, process.env overrides)
 *
 * Does NOT expose ConfigSource write operations (create/update/set/delete)
 * to consumers. Write access is internal only and triggers implicit refresh.
 */
export class ConfigStoreImpl {
    selection;
    storeOptions;
    values = {};
    sourceInstance = null;
    loaded = false;
    /**
     * @param selection - Optional source selection. Defaults to ENV with standard options.
     * @param storeOptions - Optional store-level options (e.g., processEnvOverrides).
     */
    constructor(selection, storeOptions) {
        this.selection = selection ?? {
            sourceType: ConfigSourceType.ENV,
        };
        this.storeOptions = storeOptions ?? {};
    }
    // ---------------------------------------------------------------------------
    // Lifecycle
    // ---------------------------------------------------------------------------
    /**
     * Connects to the selected source, fetches all values, and populates the cache.
     * Must be called once before any retrieval method.
     * Subsequent calls are no-ops (values are cached).
     */
    async initialize() {
        if (this.loaded) {
            return;
        }
        this.sourceInstance = this.resolveSource();
        await this.connectSource();
        await this.refresh();
        this.loaded = true;
    }
    // ---------------------------------------------------------------------------
    // Cached reads (no round-trip to source)
    // ---------------------------------------------------------------------------
    /**
     * Returns the cached value for the given key, or undefined if not present.
     */
    get(key) {
        this.assertLoaded();
        return this.values[key];
    }
    /**
     * Returns the cached value for the given key.
     * Throws a descriptive error if the key is missing.
     */
    getRequired(key) {
        this.assertLoaded();
        const value = this.values[key];
        if (value === undefined) {
            throw new Error(`Required configuration key "${key}" is missing. ` +
                `Source type: ${this.selection.sourceType}. ` +
                this.getSourceDetail());
        }
        return value;
    }
    /**
     * Returns true if the key exists in the cached configuration.
     */
    has(key) {
        this.assertLoaded();
        return key in this.values;
    }
    /**
     * Returns a shallow copy of all cached key-value pairs.
     */
    getAll() {
        this.assertLoaded();
        return { ...this.values };
    }
    // ---------------------------------------------------------------------------
    // Refresh-and-read (re-fetches from source, then returns)
    // ---------------------------------------------------------------------------
    /**
     * Re-fetches all values from the source, updates the cache,
     * and returns the value for the given key (or undefined).
     */
    async refreshAndGet(key) {
        this.assertLoaded();
        await this.refresh();
        return this.values[key];
    }
    /**
     * Re-fetches all values from the source, updates the cache,
     * and returns the value for the given key.
     * Throws a descriptive error if the key is missing after refresh.
     */
    async refreshAndGetRequired(key) {
        this.assertLoaded();
        await this.refresh();
        const value = this.values[key];
        if (value === undefined) {
            throw new Error(`Required configuration key "${key}" is missing after refresh. ` +
                `Source type: ${this.selection.sourceType}. ` +
                this.getSourceDetail());
        }
        return value;
    }
    /**
     * Re-fetches all values from the source, updates the cache,
     * and returns a shallow copy of all key-value pairs.
     */
    async refreshAndGetAll() {
        this.assertLoaded();
        await this.refresh();
        return { ...this.values };
    }
    // ---------------------------------------------------------------------------
    // Private helpers
    // ---------------------------------------------------------------------------
    /**
     * Re-fetches all values from the connected source and applies
     * precedence rules. Called during initialize() and on every
     * refreshAndGet* call. Also called implicitly after any internal
     * source mutation to keep the cache consistent.
     */
    async refresh() {
        const listResult = await this.sourceInstance.getAll();
        this.values = { ...listResult.values };
        // Apply process.env overrides (store-level concern)
        const processEnvOverrides = this.storeOptions.processEnvOverrides ?? true;
        if (processEnvOverrides) {
            for (const [key, value] of Object.entries(process.env)) {
                if (value !== undefined) {
                    this.values[key] = value;
                }
            }
        }
    }
    assertLoaded() {
        if (!this.loaded) {
            throw new Error("ConfigStore has not been initialized. Call initialize() before accessing configuration values.");
        }
    }
    /**
     * Instantiates the correct ConfigSource implementation based on the enum.
     */
    resolveSource() {
        switch (this.selection.sourceType) {
            case ConfigSourceType.ENV:
                return new EnvConfigSource();
            case ConfigSourceType.AZURE_APP_CONFIG:
                return new AzureAppConfigSource();
            default:
                throw new Error(`Unsupported config source type: ${this.selection.sourceType}`);
        }
    }
    /**
     * Connects the source instance with the correct options type.
     */
    async connectSource() {
        switch (this.selection.sourceType) {
            case ConfigSourceType.ENV: {
                const opts = this.selection.options ?? {};
                await this.sourceInstance.connect(opts);
                break;
            }
            case ConfigSourceType.AZURE_APP_CONFIG: {
                await this.sourceInstance.connect(this.selection.options);
                break;
            }
            default:
                throw new Error(`Unsupported config source type: ${this.selection.sourceType}`);
        }
    }
    /**
     * Returns a human-readable detail string for error messages,
     * including the file path or endpoint relevant to the current source.
     */
    getSourceDetail() {
        switch (this.selection.sourceType) {
            case ConfigSourceType.ENV: {
                const filePath = this.selection.options?.envFilePath ?? process.cwd() + "/.env";
                return `File: "${filePath}".`;
            }
            case ConfigSourceType.AZURE_APP_CONFIG: {
                const endpoint = this.selection.options?.endpoint ?? "(no endpoint specified)";
                return `Endpoint: "${endpoint}".`;
            }
            default:
                return "";
        }
    }
}
//# sourceMappingURL=configstore.js.map