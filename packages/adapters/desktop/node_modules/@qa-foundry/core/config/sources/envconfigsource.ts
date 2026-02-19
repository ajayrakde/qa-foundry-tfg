import { ConfigSource, GetResult, ListResult } from "../configsource.interface.js";
import { EnvConfigSourceOptions } from "./envconfigsource.options.js";
import * as fs from "fs";
import * as path from "path";

/**
 * Loads key-value pairs from a .env file.
 * Does not merge process.env — that is handled by the store.
 */
export class EnvConfigSource implements ConfigSource<EnvConfigSourceOptions> {
  connect(options: EnvConfigSourceOptions): Promise<void> {
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
  async load(options: EnvConfigSourceOptions): Promise<Record<string, string>> {
    const filePath = options.envFilePath ?? path.join(process.cwd(), ".env");
    const encoding = (options.encoding ?? "utf-8") as BufferEncoding;
    const allowMissing = options.allowMissingFile ?? true;

    if (!fs.existsSync(filePath)) {
      if (allowMissing) {
        return {};
      }
      throw new Error(
        `ENV config source: .env file not found at "${filePath}".`
      );
    }

    const content = fs.readFileSync(filePath, { encoding });
    return this.parse(content);
  }

  private parse(content: string): Record<string, string> {
    const result: Record<string, string> = {};

    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) {
        continue;
      }

      const key = trimmed.substring(0, eqIndex).trim();
      let value = trimmed.substring(eqIndex + 1).trim();

      // Remove surrounding quotes (single or double)
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (key) {
        result[key] = value;
      }
    }

    return result;
  }
}
