# Config Module

Single, consistent configuration access layer for all consumers of the QA-Foundry SDK.

## Quick Start

```typescript
import { ConfigStoreImpl, ConfigSourceType } from "@qa-foundry/core";

// Default: reads .env at repository root, process.env overrides
const config = new ConfigStoreImpl();
await config.initialize();

const value = config.get("MY_KEY");           // string | undefined
const required = config.getRequired("MY_KEY"); // string (throws if missing)
const exists = config.has("MY_KEY");           // boolean
```

## Selecting a Source

### ENV (default)

```typescript
const config = new ConfigStoreImpl({
  sourceType: ConfigSourceType.ENV,
  options: {
    envFilePath: "/custom/path/.env",
    encoding: "utf-8",
    allowMissingFile: true,
    processEnvOverrides: true,
  },
});
await config.initialize();
```

### Azure App Configuration (placeholder)

```typescript
const config = new ConfigStoreImpl({
  sourceType: ConfigSourceType.AZURE_APP_CONFIG,
  options: {
    endpoint: "https://my-config.azconfig.io",
    credentialMode: "managedIdentity",
  },
});
await config.initialize();
```

> **Note:** Azure App Configuration source is not yet implemented.

## Precedence Rules (ENV source)

1. Values loaded from `.env` file
2. `process.env` values override `.env` values (when `processEnvOverrides` is `true`, the default)

This ensures CI environment variables always take priority over local `.env` files.

## Error Handling

- **Missing `.env` file:** Treated as empty by default (`allowMissingFile: true`). Set to `false` to throw.
- **Missing required key:** `getRequired()` throws a descriptive error including the key name, source type, and file path or endpoint.
- **Uninitialized store:** All retrieval methods throw if `initialize()` has not been called.

## Extension

To add a new configuration source:

1. Add a new value to `ConfigSourceType`
2. Create a new options interface extending `ConfigSourceOptions`
3. Implement `ConfigSource<TOptions>`
4. Extend the `ConfigSelection` union
5. Add a case in `ConfigStoreImpl` source resolution logic

Consumer API remains unchanged.
