import { ConfigSourceOptions } from "../configsource.interface.js";
/**
 * Options specific to the ENV configuration source.
 *
 * These options control how the source connects to and reads the .env file.
 * Precedence/merging with process.env is handled by ConfigStore, not here.
 */
export interface EnvConfigSourceOptions extends ConfigSourceOptions {
    /** Path to the .env file. Defaults to `process.cwd() + "/.env"`. */
    envFilePath?: string;
    /** File encoding. Defaults to `"utf-8"`. */
    encoding?: string;
    /** If true, a missing .env file is treated as empty rather than throwing. Defaults to true. */
    allowMissingFile?: boolean;
}
//# sourceMappingURL=envconfigsource.options.d.ts.map