import {
  ConfigurationSource,
  ConfigSource,
  ConfigSourceOptions,
  ConfigSourceType,
} from "./configsource.interface.js";
import { ConfigStore } from "./configstore.interface.js";
import { EnvConfigSource } from "./sources/envconfigsource.js";
import { EnvConfigSourceOptions } from "./sources/envconfigsource.options.js";
import { AzureAppConfigSource } from "./sources/azureappconfigsource.js";
import { AzureAppConfigSourceOptions } from "./sources/azureappconfigsource.options.js";

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
export class ConfigStoreImpl implements ConfigStore {
  private readonly selection: ConfigurationSource;
  private readonly storeOptions: ConfigStoreOptions;
  private values: Record<string, string> = {};
  private sourceInstance: ConfigSource<ConfigSourceOptions> | null = null;
  private loaded = false;

  /**
   * @param selection - Optional source selection. Defaults to ENV with standard options.
   * @param storeOptions - Optional store-level options (e.g., processEnvOverrides).
   */
  constructor(selection?: ConfigurationSource, storeOptions?: ConfigStoreOptions) {
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
  async initialize(): Promise<void> {
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
  get(key: string): string | undefined {
    this.assertLoaded();
    return this.values[key];
  }

  /**
   * Returns the cached value for the given key.
   * Throws a descriptive error if the key is missing.
   */
  getRequired(key: string): string {
    this.assertLoaded();
    const value = this.values[key];
    if (value === undefined) {
      throw new Error(
        `Required configuration key "${key}" is missing. ` +
          `Source type: ${this.selection.sourceType}. ` +
          this.getSourceDetail()
      );
    }
    return value;
  }

  /**
   * Returns true if the key exists in the cached configuration.
   */
  has(key: string): boolean {
    this.assertLoaded();
    return key in this.values;
  }

  /**
   * Returns a shallow copy of all cached key-value pairs.
   */
  getAll(): Record<string, string> {
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
  async refreshAndGet(key: string): Promise<string | undefined> {
    this.assertLoaded();
    await this.refresh();
    return this.values[key];
  }

  /**
   * Re-fetches all values from the source, updates the cache,
   * and returns the value for the given key.
   * Throws a descriptive error if the key is missing after refresh.
   */
  async refreshAndGetRequired(key: string): Promise<string> {
    this.assertLoaded();
    await this.refresh();
    const value = this.values[key];
    if (value === undefined) {
      throw new Error(
        `Required configuration key "${key}" is missing after refresh. ` +
          `Source type: ${this.selection.sourceType}. ` +
          this.getSourceDetail()
      );
    }
    return value;
  }

  /**
   * Re-fetches all values from the source, updates the cache,
   * and returns a shallow copy of all key-value pairs.
   */
  async refreshAndGetAll(): Promise<Record<string, string>> {
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
  private async refresh(): Promise<void> {
    const listResult = await this.sourceInstance!.getAll();
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

  private assertLoaded(): void {
    if (!this.loaded) {
      throw new Error(
        "ConfigStore has not been initialized. Call initialize() before accessing configuration values."
      );
    }
  }

  /**
   * Instantiates the correct ConfigSource implementation based on the enum.
   */
  private resolveSource(): ConfigSource<ConfigSourceOptions> {
    switch (this.selection.sourceType) {
      case ConfigSourceType.ENV:
        return new EnvConfigSource();
      case ConfigSourceType.AZURE_APP_CONFIG:
        return new AzureAppConfigSource();
      default:
        throw new Error(
          `Unsupported config source type: ${(this.selection as ConfigurationSource).sourceType}`
        );
    }
  }

  /**
   * Connects the source instance with the correct options type.
   */
  private async connectSource(): Promise<void> {
    switch (this.selection.sourceType) {
      case ConfigSourceType.ENV: {
        const opts: EnvConfigSourceOptions = this.selection.options ?? {};
        await (this.sourceInstance as ConfigSource<EnvConfigSourceOptions>).connect(opts);
        break;
      }
      case ConfigSourceType.AZURE_APP_CONFIG: {
        await (
          this.sourceInstance as ConfigSource<AzureAppConfigSourceOptions>
        ).connect(this.selection.options);
        break;
      }
      default:
        throw new Error(
          `Unsupported config source type: ${(this.selection as ConfigurationSource).sourceType}`
        );
    }
  }

  /**
   * Returns a human-readable detail string for error messages,
   * including the file path or endpoint relevant to the current source.
   */
  private getSourceDetail(): string {
    switch (this.selection.sourceType) {
      case ConfigSourceType.ENV: {
        const filePath =
          this.selection.options?.envFilePath ?? process.cwd() + "/.env";
        return `File: "${filePath}".`;
      }
      case ConfigSourceType.AZURE_APP_CONFIG: {
        const endpoint =
          this.selection.options?.endpoint ?? "(no endpoint specified)";
        return `Endpoint: "${endpoint}".`;
      }
      default:
        return "";
    }
  }
}
