/**
 * Public contract for configuration access.
 *
 * ConfigStore is a read-only, cached wrapper around a ConfigSource.
 * It connects to the source once, fetches all values, and serves them
 * from cache for the lifetime of the store.
 *
 * Consumers interact only with this interface — never with ConfigSource directly.
 *
 * Read strategies:
 *   - get / getRequired / getAll         → return cached values (fast, no network)
 *   - refreshAndGet / refreshAndGetRequired / refreshAndGetAll
 *                                         → re-fetch from source, update cache, then return
 */
export interface ConfigStore {
    /**
     * Connects to the backing source, fetches all values, and populates the cache.
     * Must be called once before any retrieval method.
     * Subsequent calls are no-ops.
     */
    initialize(): Promise<void>;
    /**
     * Returns the cached value for the given key, or undefined if not present.
     */
    get(key: string): string | undefined;
    /**
     * Returns the cached value for the given key.
     * Throws a descriptive error if the key is missing, including:
     *   - The missing key name
     *   - The source type
     *   - Relevant file path or endpoint info
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
}
//# sourceMappingURL=configstore.interface.d.ts.map