import { ConfigSource, GetResult, ListResult } from "../configsource.interface.js";
import { AzureAppConfigSourceOptions } from "./azureappconfigsource.options.js";
/**
 * Loads configuration values from Azure App Configuration.
 * Placeholder — full implementation to follow.
 */
export declare class AzureAppConfigSource implements ConfigSource<AzureAppConfigSourceOptions> {
    connect(options: AzureAppConfigSourceOptions): Promise<void>;
    close(): Promise<void>;
    get(key: string): Promise<GetResult>;
    getAll(): Promise<ListResult>;
    create(key: string, value: string): Promise<void>;
    update(key: string, value: string): Promise<void>;
    set(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
    load(_options: AzureAppConfigSourceOptions): Promise<Record<string, string>>;
}
//# sourceMappingURL=azureappconfigsource.d.ts.map