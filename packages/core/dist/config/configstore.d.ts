import { ConfigurationSource } from "./configsource.interface.js";
import { ConfigStore } from "./configstore.interface.js";
/**
 * Store-level options that control merging behavior.
 * These are not part of ConfigSourceOptions because they are
 * a store concern, not a source concern.
 */
export interface ConfigStoreOptions {
    /** If true, process.env values override source values. Defaults to true. */
    processEnvOverrides?: boolean;
}
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
export declare class ConfigStoreImpl implements ConfigStore {
    private readonly selection;
    private readonly storeOptions;
    private values;
    private sourceInstance;
    private loaded;
    /**
     * @param selection - Optional source selection. Defaults to ENV with standard options.
     * @param storeOptions - Optional store-level options (e.g., processEnvOverrides).
     */
    constructor(selection?: ConfigurationSource, storeOptions?: ConfigStoreOptions);
    /**
     * Connects to the selected source, fetches all values, and populates the cache.
     * Must be called once before any retrieval method.
     * Subsequent calls are no-ops (values are cached).
     */
    initialize(): Promise<void>;
    /**
     * Returns the cached value for the given key, or undefined if not present.
     */
    get(key: string): string | undefined;
    /**
     * Returns the cached value for the given key.
     * Throws a descriptive error if the key is missing.
     */
    getRequired(key: string): string;
    /**
     * Returns true if the key exists in the cached configuration.
     */
    has(key: string): boolean;
    /**
     * Returns a shallow copy of all cached key-value pairs.
     */
    getAll(): Record<string, string>;
    /**
     * Re-fetches all values from the source, updates the cache,
     * and returns the value for the given key (or undefined).
     */
    refreshAndGet(key: string): Promise<string | undefined>;
    /**
     * Re-fetches all values from the source, updates the cache,
     * and returns the value for the given key.
     * Throws a descriptive error if the key is missing after refresh.
     */
    refreshAndGetRequired(key: string): Promise<string>;
    /**
     * Re-fetches all values from the source, updates the cache,
     * and returns a shallow copy of all key-value pairs.
     */
    refreshAndGetAll(): Promise<Record<string, string>>;
    /**
     * Re-fetches all values from the connected source and applies
     * precedence rules. Called during initialize() and on every
     * refreshAndGet* call. Also called implicitly after any internal
     * source mutation to keep the cache consistent.
     */
    private refresh;
    private assertLoaded;
    /**
     * Instantiates the correct ConfigSource implementation based on the enum.
     */
    private resolveSource;
    /**
     * Connects the source instance with the correct options type.
     */
    private connectSource;
    /**
     * Returns a human-readable detail string for error messages,
     * including the file path or endpoint relevant to the current source.
     */
    private getSourceDetail;
}
//# sourceMappingURL=configstore.d.ts.map