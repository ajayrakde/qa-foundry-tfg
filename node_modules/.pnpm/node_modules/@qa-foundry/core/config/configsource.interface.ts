import { EnvConfigSourceOptions } from "./sources/envconfigsource.options.js";
import { AzureAppConfigSourceOptions } from "./sources/azureappconfigsource.options.js";

/**
 * Finite list of supported configuration source types.
 * New backends must be added here as enum values.
 */
export enum ConfigSourceType {
  ENV = "ENV",
  AZURE_APP_CONFIG = "AZURE_APP_CONFIG",
}

/**
 * Base interface for all source-specific options.
 * Reserved for shared options such as timeoutMs, cacheTtlMs, strictMode.
 */
export interface ConfigSourceOptions {}

/**
 * Result of a single key lookup.
 * Includes the value and optional metadata the backend may provide.
 */
export interface GetResult {
  /** The configuration value, or undefined if the key was not found. */
  value: string | undefined;

  /** Optional version identifier (e.g., etag) provided by the backend. */
  version?: string;

  /** Optional etag for concurrency control. */
  etag?: string;
}

/**
 * Result of listing all configuration values.
 * Includes the full key-value map and optional metadata.
 */
export interface ListResult {
  /** Flat map of all resolved configuration key-value pairs. */
  values: Record<string, string>;

  /** Optional version or snapshot identifier for the entire result set. */
  version?: string;
}

/**
 * Contract for any configuration backend.
 *
 * A ConfigSource represents a connected client to a config backend.
 * Consumers interact with ConfigStore; ConfigStore delegates to ConfigSource.
 *
 * Lifecycle:
 *   connect → get / getAll / create / update / set / delete → close
 */
export interface ConfigSource<TOptions extends ConfigSourceOptions> {
  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Establishes connection or initialises the source.
   *
   * - ENV: resolves file path, ensures readable.
   * - Azure: creates the App Configuration client.
   *
   * Must be called before any read/write operation.
   */
  connect(options: TOptions): Promise<void>;

  /**
   * Releases resources held by the source (optional).
   * Implementations that have nothing to clean up may no-op.
   */
  close(): Promise<void>;

  // ---------------------------------------------------------------------------
  // Read
  // ---------------------------------------------------------------------------

  /**
   * Returns the value (and optional metadata) for a single key.
   *
   * - Returns `{ value: undefined }` if the key does not exist.
   * - Does not throw for missing keys.
   * - Throws only for unrecoverable source errors.
   */
  get(key: string): Promise<GetResult>;

  /**
   * Returns all key-value pairs from the source.
   *
   * - Returns a flat map plus optional metadata.
   * - Does not merge process.env.
   * - Throws only for unrecoverable source errors.
   */
  getAll(): Promise<ListResult>;

  // ---------------------------------------------------------------------------
  // Write
  // ---------------------------------------------------------------------------

  /**
   * Creates a new configuration entry.
   * Fails if the key already exists (where the backend supports it).
   */
  create(key: string, value: string): Promise<void>;

  /**
   * Updates an existing configuration entry.
   * Fails if the key does not exist (where the backend supports it).
   */
  update(key: string, value: string): Promise<void>;

  /**
   * Upsert convenience — sets the value regardless of whether the key exists.
   */
  set(key: string, value: string): Promise<void>;

  /**
   * Deletes a configuration entry.
   */
  delete(key: string): Promise<void>;
}

/**
 * Discriminated union enforcing correct options per source type.
 */
export type ConfigurationSource =
  | {
      sourceType: ConfigSourceType.ENV;
      options?: EnvConfigSourceOptions;
    }
  | {
      sourceType: ConfigSourceType.AZURE_APP_CONFIG;
      options: AzureAppConfigSourceOptions;
    };
