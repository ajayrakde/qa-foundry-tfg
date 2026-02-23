# @qa-foundry/core — Logger Module (Design + Templates)

## Scope

This document defines the **logger** package for QA‑Foundry Core.

* Keep the public API **minimal**: `LogWriter` + `createLogWriter` + `createTestLogWriter` + `LogData`.
* Support **console** and **file** outputs.
* Enable **per-test log files** (1 file per testcase) to be later attached to:

  * Playwright HTML report (via web adapter)
  * Zephyr execution (via a future connector)
* Avoid exporting internal plumbing (outputs, file helpers, formatting internals).

---

## Goals & Non‑Goals

### Goals

1. **Simple consumer experience**

   * Consumer logs via `log.trace/event/exception`.
   * Consumer never deals with outputs/sinks.

2. **Deterministic artifact layout**

   * Run-level optional log file.
   * Test-level log file always available when `createTestLogWriter()` is used.

3. **Resilient logging**

   * Logging must never crash tests.
   * File failures should not stop console logging.

4. **Structured context via `LogData`**

   * Optional object attached to each log.
   * Should serialize safely.

5. **ESM/NodeNext friendly**

   * Relative imports use `.js` extension in TS source.

### Non‑Goals (for now)

* No separate `LogRecord` type in public surface.
* No advanced filtering pipelines.
* No JSONL structured logs as primary format (can be added later).
* No HTML report generation.

---

## Public API (Export Contract)

### Public Exports (logger module level)

From `@qa-foundry/core/logger` (and re-exported at `@qa-foundry/core`):

* `type LogData`
* `class LogWriter`
* `function createLogWriter(options?)`
* `function createTestLogWriter(options)`

### Public Imports (expected usage)

Consumers should be able to do:

* `import { LogWriter, createLogWriter, createTestLogWriter } from "@qa-foundry/core";`

### Strict rule

Do **not** export:

* `ConsoleOutput`, `FileOutput`
* any internal path helpers
* any internal formatting helpers

---

## Artifact & File Layout (Locked Contract)

### Base directory

* Base artifacts directory comes from env var:

  * `FOUNDRY_ARTIFACTS_DIR`
* Default if not set:

  * `artifacts`

### Run-level

* Optional run log path:

  * `artifacts/run/run.log.txt`

### Test-level (required capability)

* Per-test log path:

  * `artifacts/tests/<testId>/test.log.txt`

### Folder creation

* The logger must ensure directories exist before writing.
* `<testId>` is assumed filesystem-safe (Playwright `testInfo.testId`).

---

## Configuration Rules (Minimal)

### Output defaults

* `createLogWriter()` default behavior:

  * Console output: **enabled**
  * File output: **disabled** unless explicitly enabled

### Test log behavior

* `createTestLogWriter(...)` default behavior:

  * File output to test log path: **enabled**
  * Optional forwarding to parent `LogWriter` outputs: configurable

### Level filtering (optional)

* If implemented now, keep it simple:

  * Accept `minLevel` and drop lower priority messages.
  * If not implemented now, document as future.

---

## Error Handling Requirements

1. **Never throw from log calls**

   * `trace/event/exception` must never throw.
   * If an internal write fails, swallow and optionally write an internal fallback message to console.

2. **File write failures**

   * If file output fails:

     * continue console output
     * record an internal once-per-run warning to console (avoid spamming)

3. **Circular structures in LogData**

   * Must serialize safely.
   * If serialization fails, replace with a safe placeholder string like `"[Unserializable LogData]"`.

4. **Error object logging**

   * For `exception(error)`:

     * always capture message
     * capture stack if available
     * include any passed `LogData`

---

## Performance Considerations

* Keep operations lightweight:

  * Avoid expensive deep clones.
  * Avoid synchronous heavy parsing.
* File output:

  * Append mode.
  * Line-based text format.
  * Prefer buffering behavior managed by Node streams.

---

## Threading/Concurrency Considerations

* Node is single-threaded but tests may run in parallel processes.
* Per-test log file is unique per testId, reducing contention.
* Run-level log can have concurrent writes; acceptable for appended text.

---

## Files, Classes, Methods, Variables (Templates)

> **No function implementations below**—only templates and expected behavior.

### 1) `packages/core/logger/index.ts`

**Purpose**: Logger module barrel export.

**Exports**:

* `LogWriter`
* `createLogWriter`
* `createTestLogWriter`
* `LogData`

**Notes**:

* Use explicit `.js` extensions in re-exports (NodeNext).

---

### 2) `packages/core/logger/logwriter.ts`

**Purpose**: Defines the `LogWriter` public class and core logging behavior.

#### Public Type

* `type LogData = Record<string, unknown>`

  * Must allow nested objects.
  * Must be safe-serialized.

#### Public Class: `LogWriter`

**Constructor inputs (internal; prefer factories for creation)**:

* outputs enabled flags and/or output instances (internal)
* optional default context fields:

  * `runId?: string`
  * `activityId?: string`
  * `testId?: string` (when used for per-test)
  * `testName?: string`
* optional defaults:

  * `defaultData?: LogData`

**Public methods**:

1. `trace(message: string, data?: LogData): void`

   * writes a TRACE message

2. `event(message: string, data?: LogData): void`

   * writes a meaningful event message

3. `exception(error: Error | string, data?: LogData): void`

   * writes an exception message
   * must include stack if available

4. `with(data: LogData): LogWriter` *(optional but useful)*

   * returns a child writer with merged `defaultData`
   * must not mutate the original writer

5. `close(): void | Promise<void>` *(optional)*

   * flush/close file outputs if any

**Internal variables (suggested)**:

* `private outputs: Array<{ write(...): void; close?(): void }>`
* `private defaultData: LogData`
* `private context: { runId?: string; activityId?: string; testId?: string; testName?: string }`
* `private warnedFileFailure: boolean` (to prevent console spam)

**Internal helper responsibilities** (text):

* Normalize inputs into a consistent line format
* Merge `defaultData` and per-call `data`
* Serialize `LogData` safely
* Route exceptions to stderr when console output is enabled

---

### 3) `packages/core/logger/testlogwriter.ts`

**Purpose**: Create a per-test `LogWriter` that writes to a deterministic test log file.

#### Public function: `createTestLogWriter(options)`

**Options type**: `TestLogWriterOptions`

**Expected fields**:

* `testId: string` *(required)*
* `testName?: string` *(optional but recommended)*
* `artifactsDir?: string` *(optional; default via env var)*
* `alsoToParent?: boolean` *(optional; default false)*
* `parent?: LogWriter` *(optional; if alsoToParent true, forward logs)*
* `runId?: string` *(optional)*
* `activityId?: string` *(optional)*

**Behavior (text)**:

* Resolve `artifactsDir` using the same rule as run logger
* Compute test log path: `artifacts/tests/<testId>/test.log.txt`
* Ensure directory exists
* Create a LogWriter configured with:

  * File output enabled to test log path
  * Optional forwarding to parent outputs
  * Default context includes `testId` and `testName`

---

### 4) `packages/core/logger/outputs/consoleoutput.ts` *(internal)*

**Purpose**: Internal console writer.

#### Class: `ConsoleOutput`

**Constructor**:

* optional config:

  * whether to write trace/event to stdout
  * whether to write exception to stderr

**Methods**:

* `write(level, line): void`

**Behavior (text)**:

* Trace/event: write to stdout
* Exception: write to stderr

---

### 5) `packages/core/logger/outputs/fileoutput.ts` *(internal)*

**Purpose**: Internal file appender.

#### Class: `FileOutput`

**Constructor inputs**:

* `filePath: string`
* optional:

  * encoding
  * ensureDir boolean

**Methods**:

* `write(line: string): void`
* `close(): void`

**Behavior (text)**:

* Ensure directory exists before first write
* Append line with newline
* Should be safe under parallel writes (best-effort)

---

### 6) `packages/core/logger/paths/logpaths.ts` *(internal, optional but recommended)*

**Purpose**: Canonical path generation.

**Functions**:

* `resolveArtifactsDir(): string`

  * reads `FOUNDRY_ARTIFACTS_DIR` else `artifacts`

* `resolveRunLogPath(artifactsDir: string): string`

  * returns `<artifactsDir>/run/run.log.txt`

* `resolveTestLogPath(artifactsDir: string, testId: string): string`

  * returns `<artifactsDir>/tests/<testId>/test.log.txt`

---

## Factory Functions (Recommended API Style)

### `createLogWriter(options?)`

**Purpose**: Creates a run/global log writer.

**Options** (minimal):

* `enableConsole?: boolean` (default true)
* `enableFile?: boolean` (default false)
* `artifactsDir?: string` (default resolved)
* `runId?: string` (optional)
* `activityId?: string` (optional)
* `defaultData?: LogData` (optional)

**Behavior (text)**:

* If file enabled, write to run log path under artifacts
* Return a `LogWriter` instance

---

## Formatting Requirements (Text, Minimal)

Each log line should include at least:

* timestamp (ISO)
* level (TRACE/EVENT/EXCEPTION)
* message
* context fields if present (runId/testId)
* serialized LogData if provided

Example shape (illustrative):

* `2026-02-20T12:34:56.789Z [EVENT] [testId=abc] User logged in | data={...}`

---

## Integration Notes (Consumers call in teardown/after-test)

### Core idea

The logger module produces **files**. Attaching those files (or derived snippet/html) to different reporters is performed by a **thin attachment blueprint** that the **consumer** calls from teardown / after-test hooks.

* Logger produces: `artifacts/tests/<testId>/test.log.txt`
* Attachment blueprint consumes that file and attaches it to a target report/tool using the tool’s **native mechanisms**.

This keeps `LogWriter` independent of any specific test runner.

---

# Attachment Blueprint (Add-on to Logger)

## Goal

Given a per-test log file that already exists (`.log` / `.txt`), attach it to one or more targets with one or more display modes:

* **href / file attachment**: downloadable/clickable file
* **inline text**: snippet shown inside report UI
* **expandable section**: collapsible panel (or HTML `<details>` fallback)

The consumer chooses:

* `reporterName` (e.g., Playwright, JUnit, Karate, Extent, Allure, Zephyr)
* `logDisplay` modes (one or more: `href`, `inline`, `expandable`)

The blueprint uses **native reporter functionality** when available and falls back to safe approximations only when needed.

---

## Where it runs

The consumer calls the attach function from teardown / after-test:

* Playwright: `afterEach` / fixture teardown
* JUnit: test end hook or post-processing step before writing XML
* Karate: post-report generation step or scenario teardown if custom hooks exist
* Extent: after-test node finalize
* Allure: after-test (attachment API)
* Zephyr: result publish step after execution id is known

**Key rule:** attachment must not fail the test; errors are best-effort and reported as warnings.

---

## Inputs (Standard Context Contract)

All reporter-specific attachers receive a standard context object.

### `AttachContext`

Required:

* `testId: string` — unique id used for artifact folder and stable mapping
* `testName?: string` — human readable name/title path
* `logFilePath: string` — absolute or workspace-relative path to `test.log.txt`

Optional (recommended for richer metadata):

* `status?: "passed" | "failed" | "skipped"`
* `durationMs?: number`
* `runId?: string`
* `activityId?: string`
* `externalCaseId?: string` — e.g., Zephyr testcase key
* `executionId?: string` — e.g., Zephyr execution/run id

### `ReporterName`

Finite predefined values:

* `playwright`
* `allure`
* `extent`
* `karate`
* `junit`
* `zephyr`

### `LogDisplayMode`

One or more of:

* `href`
* `inline`
* `expandable`

---

## Derived Artifacts (to support inline + expandable)

To implement all display modes consistently, the attachment layer may derive additional artifacts from the full log file.

### Required base artifact

* Full log file: `test.log.txt`

### Optional derived artifacts

* Snippet file: `test.log.snippet.txt`

  * bounded size: e.g., first 200 lines or first 32KB
  * ends with: `... truncated; see full log attachment`

* Expandable HTML: `test.log.expand.html`

  * contains a `<details><summary>Test Log</summary><pre>...</pre></details>` wrapper
  * uses the same bounded snippet content

**Rule:** full log remains source-of-truth; snippet/html are convenience views.

---

## Public Attachment API (Template)

### Function: `attachTestLog(context, options)`

Purpose: one entrypoint the consumer calls.

#### `AttachOptions`

* `reporterName: ReporterName`
* `display: LogDisplayMode[]` (e.g., `["href","inline","expandable"]`)
* `reportOutputDir?: string`

  * needed for reporters that require files to be inside the report folder for clickable hrefs (Extent/Karate)
* `artifactNamePrefix?: string`

  * default: `"Test Log"`
* `snippetPolicy?: { maxLines?: number; maxBytes?: number }`
* `failOnAttachError?: boolean` (default false)

#### Expected behavior (text)

1. Validate `logFilePath` exists; if not, create an empty file (best effort) and continue.
2. For each requested display mode:

   * ensure derived artifact exists if needed (snippet/html)
   * call reporter-specific attacher implementation
3. Never throw unless `failOnAttachError` is true.

---

## Reporter-specific behavior (Native first)

### Playwright (`reporterName=playwright`)

Native capability: Attachments list per test.

* `href`: attach the full file as `text/plain` attachment named `Test Log (full)`.
* `inline`: attach snippet as `text/plain` named `Test Log (snippet)`.
* `expandable`: attach html as `text/html` named `Test Log (expand)`.

Notes:

* Playwright doesn’t provide a dedicated expandable UI, so expandable is achieved by attaching an HTML file that contains `<details>`.

### Allure (`reporterName=allure`)

Native capability: Attachments viewer.

* `href`: attach full file as `text/plain`.
* `inline`: attach snippet as `text/plain`.
* `expandable`: attach html as `text/html`.

Notes:

* Allure renders attachments within its UI; expandable works via HTML attachment.

### Extent (`reporterName=extent`)

Native capability: Nodes/log sections; supports links/markup.

* `href`: copy full file into `reportOutputDir` (e.g., `logs/<testId>.txt`) and add a hyperlink.
* `inline`: add snippet text into the test’s log area (preformatted).
* `expandable`: create a node/section titled `Test Log (expand)` and put snippet inside.

Notes:

* Extent href requires the file to exist under the report folder for portable links.

### Karate (`reporterName=karate`)

Native capability: limited attachment UI in default report.

* `href`: copy full file into `reportOutputDir` and inject a link into the report HTML.
* `inline`: inject a `<pre>` snippet block.
* `expandable`: inject `<details>` HTML.

Notes:

* Karate typically requires a post-processing step on generated HTML.

### JUnit (`reporterName=junit`)

Native capability: no standard attachments in XML; CI UI may render sections.

* `href`: ensure full file is present as CI artifact; write a `logPath` property (relative path) per testcase.
* `inline`: write snippet into `<system-out>`.
* `expandable`: typically provided by the CI UI (GitLab/others) where `system-out` becomes collapsible.

Notes:

* JUnit “expandable” cannot be guaranteed by XML alone; it depends on the viewer.

### Zephyr (`reporterName=zephyr`)

Native capability: file attachments to execution.

* `href`: upload full file as attachment to execution id.
* `inline`: write snippet into execution comment/notes (if supported by chosen Zephyr API).
* `expandable`: upload html attachment `Test Log (expand)`; user opens it in browser.

Notes:

* Zephyr UI usually doesn’t render inline attachments; inline is best represented via comment/notes.

---

## Reliability Rules

1. Attachment is **best-effort** by default.
2. Never fail tests due to attachment issues.
3. Use bounded snippets to avoid huge reports.
4. Always keep a full file attachment/href as the source-of-truth.

---

## Naming Standard (Consistency across reporters)

For uniform UX, use these display names:

* `Test Log (full)`  → `test.log.txt`
* `Test Log (snippet)` → `test.log.snippet.txt`
* `Test Log (expand)` → `test.log.expand.html`

---

## Implementation Roadmap (Phased, build-from-scratch)

This roadmap is ordered by your priorities:

1. **Playwright**, **Extent**, **Karate**, **Zephyr** (most important)
2. **JUnit**, **Allure** (also required)

Each phase is small, additive, and avoids rewrites.

---

### Phase 0 — Foundations (repo hygiene)

**Outcome:** package compiles; empty exports exist.

* Create `packages/core/logger/` and the listed files.
* Define artifacts base dir rule:

  * `FOUNDRY_ARTIFACTS_DIR` else `artifacts/`.

---

### Phase 1 — Minimal `LogWriter` (console only)

**Outcome:** `trace/event/exception` work reliably with no file I/O.

* Implement `LogWriter` methods.
* Implement safe serialization for `LogData`.
* Hard rule: log methods never throw.

---

### Phase 2 — Run-level file output

**Outcome:** optional `artifacts/run/run.log.txt` writing.

* Add internal `FileOutput`.
* Add `createLogWriter(options)` factory.
* Ensure file errors do not break console logging.

---

### Phase 3 — Per-test log file

**Outcome:** deterministic per-test log file exists.

* Add `createTestLogWriter(options)`.
* Ensure directories exist and file is created early.
* Optional forwarding to parent writer.

---

### Phase 4 — Attachment layer skeleton (generic)

**Outcome:** one entrypoint + derived artifacts, no reporter specifics.
Add `packages/core/logger/attach/`:

* `attachTestLog` entrypoint
* shared types: `ReporterName`, `LogDisplayMode`, `AttachContext`, `AttachOptions`
* derived artifacts:

  * snippet: `test.log.snippet.txt`
  * expandable html: `test.log.expand.html`

---

### Phase 5 — Playwright attacher (priority #1)

**Outcome:** all requested display modes in Playwright report.

* Implement native attachments:

  * href → full txt
  * inline → snippet txt
  * expandable → html with `<details>`

---

### Phase 6 — Extent attacher (priority #2)

**Outcome:** link + inline snippet + expandable node/section.

* Copy artifacts under report output folder for stable href.
* Add hyperlink entry for full file.
* Add inline snippet block.
* Add expandable node/section with snippet.

---

### Phase 7 — Karate post-processor (priority #3)

**Outcome:** link + inline snippet + expandable details in Karate HTML.

* Copy artifacts under Karate report folder.
* Post-process generated HTML to inject:

  * href link
  * inline `<pre>`
  * expandable `<details>`

---

### Phase 8 — Zephyr uploader (priority #4)

**Outcome:** attachments uploaded to execution.

* href → upload full txt as attachment
* inline → snippet text into execution comment/notes (if supported)
* expandable → upload html attachment

---

### Phase 9 — JUnit emitter (required)

**Outcome:** file discoverable + snippet visible in CI.

* href → add `logPath` testcase property (relative path) + publish artifacts in CI
* inline → write snippet into `<system-out>`
* expandable → typically provided by CI viewer (GitLab) for system-out

---

### Phase 10 — Allure attacher (required)

**Outcome:** attachments visible per test.

* href → full txt
* inline → snippet txt
* expandable → html attachment

---

## Notes to keep implementation smooth

* Each phase adds a thin layer; avoid refactors.
* Keep logger core independent of reporters; attachments live under `logger/attach/`.
* All attachment operations are best-effort by default (never fail tests).
