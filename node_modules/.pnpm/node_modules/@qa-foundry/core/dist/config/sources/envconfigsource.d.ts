import { ConfigSource, GetResult, ListResult } from "../configsource.interface.js";
import { EnvConfigSourceOptions } from "./envconfigsource.options.js";
/**
 * Loads key-value pairs from a .env file.
 * Does not merge process.env — that is handled by the store.
 */
export declare class EnvConfigSource implements ConfigSource<EnvConfigSourceOptions> {
    connect(options: EnvConfigSourceOptions): Promise<void>;
    close(): Promise<void>;
    get(key: string): Promise<GetResult>;
    getAll(): Promise<ListResult>;
    create(key: string, value: string): Promise<void>;
    update(key: string, value: string): Promise<void>;
    set(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
    load(options: EnvConfigSourceOptions): Promise<Record<string, string>>;
    private parse;
}
//# sourceMappingURL=envconfigsource.d.ts.map