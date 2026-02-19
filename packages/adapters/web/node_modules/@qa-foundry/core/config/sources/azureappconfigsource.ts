import { ConfigSource, GetResult, ListResult } from "../configsource.interface.js";
import { AzureAppConfigSourceOptions } from "./azureappconfigsource.options.js";

/**
 * Loads configuration values from Azure App Configuration.
 * Placeholder — full implementation to follow.
 */
export class AzureAppConfigSource
  implements ConfigSource<AzureAppConfigSourceOptions>
{
  connect(options: AzureAppConfigSourceOptions): Promise<void> {
      throw new Error("Method not implemented.");
  }
  close(): Promise<void> {
      throw new Error("Method not implemented.");
  }
  get(key: string): Promise<GetResult> {
      throw new Error("Method not implemented.");
  }
  getAll(): Promise<ListResult> {
      throw new Error("Method not implemented.");
  }
  create(key: string, value: string): Promise<void> {
      throw new Error("Method not implemented.");
  }
  update(key: string, value: string): Promise<void> {
      throw new Error("Method not implemented.");
  }
  set(key: string, value: string): Promise<void> {
      throw new Error("Method not implemented.");
  }
  delete(key: string): Promise<void> {
      throw new Error("Method not implemented.");
  }
  async load(
    _options: AzureAppConfigSourceOptions
  ): Promise<Record<string, string>> {
    throw new Error(
      "AzureAppConfigSource is not yet implemented. This is a placeholder for future Azure App Configuration support."
    );
  }
}
