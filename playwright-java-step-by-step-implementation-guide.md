# Playwright Java + TestNG Framework — Step-by-Step Implementation Guide

## Purpose of this document

This document is the **implementation guide** for the Playwright Java automation framework that emerged from our consolidated discussion.

It is intentionally written as a **practical build guide**, not as a high-level concept note.

The framework described here is based on the decisions we converged on:

- **Web automation stack:** Playwright Java only
- **Test runner:** TestNG
- **Reporting:** Extent Reports
- **Test management integration:** Zephyr
- **Execution model:** Browser shared at run level, **BrowserContext per test**
- **Framework design style:** clean code, OOP, SOLID, low accidental complexity
- **Test design style:** tests are readable, pages are thin, flows own journeys, helpers are utilities
- **Lifecycle ownership:** TestNG runner + listeners + TestBase
- **Context strategy:** one per-test `TestContext`, stored in a thread-safe context holder

This guide is detailed because the framework should be easy to implement, easy to maintain, and easy for other engineers to understand.

---

# 1. Final design decisions

Before implementation starts, the team should be clear on the final design decisions. These are the guardrails for the whole framework.

We are **not** building Selenium and Playwright together.  
We are **not** building a generic multi-engine SDK right now.  
We are **not** trying to mimic the Playwright TypeScript runner inside Java.

We are building a **Java-first Playwright framework** where responsibilities are split cleanly:

- **Playwright** is the browser automation engine
- **TestNG** is the execution and lifecycle engine
- **Listeners** manage reporting and result publication
- **TestBase** manages browser context and page lifecycle
- **TestContext** holds per-test runtime objects
- **Page Objects** model screens
- **Flows** model user journeys
- **Helpers** provide support utilities
- **Tests** express intent and assertions

This means the framework remains simple and predictable.

---

# 2. What this framework should and should not do

The framework should:

- support clean UI automation for modern web applications
- isolate each test using a fresh Playwright `BrowserContext`
- support TestNG groups, listeners, retries, and suite control
- capture screenshots and traces for debugging
- publish rich execution details to Extent Reports
- update Zephyr in a controlled way
- remain understandable for a Java automation team

The framework should not:

- become a giant universal automation platform on day one
- hide Playwright behind too many wrappers
- place business logic inside listeners
- place assertions inside page objects
- create random utility classes that own state
- use static mutable state for per-test data

These negative rules are just as important as the positive ones.

---

# 3. Architecture in one view

The final architecture is shown below.

```text
Tests
  │
  ▼
Flows / Page Objects / Helpers
  │
  ▼
Playwright runtime (Browser / BrowserContext / Page)
  │
  ▼
Framework Core (Context / Logging / Reporting / Config / Zephyr)
  │
  ▼
TestNG Runner (TestBase / Listeners / Retry / Groups / XML)
```

The direction is important.

Tests should depend on pages and flows.

Pages and flows should depend on Playwright runtime objects and framework abstractions such as logging.

Listeners should observe and publish. They should not drive the application.

---

# 4. Folder and package structure

The structure below is deliberately simple.

```text
qa-playwright-java/
├── pom.xml
├── testng.xml
├── README.md
├── docs/
│   ├── framework-architecture.md
│   ├── framework-implementation-guide.md
│   └── test-writing-guidelines.md
│
├── src/
│   ├── main/
│   │   └── java/
│   │       └── com/company/qaframework/
│   │           ├── core/
│   │           │   ├── annotations/
│   │           │   ├── config/
│   │           │   ├── context/
│   │           │   ├── logging/
│   │           │   ├── reporting/
│   │           │   └── zephyr/
│   │           │
│   │           ├── playwright/
│   │           │   ├── browser/
│   │           │   ├── factory/
│   │           │   ├── tracing/
│   │           │   └── screenshots/
│   │           │
│   │           ├── runner/
│   │           │   ├── base/
│   │           │   ├── listeners/
│   │           │   ├── retry/
│   │           │   └── suite/
│   │           │
│   │           └── automation/
│   │               ├── base/
│   │               ├── flows/
│   │               ├── helpers/
│   │               └── pages/
│   │
│   └── test/
│       └── java/
│           └── com/company/tests/
│               ├── smoke/
│               ├── regression/
│               └── features/
│
└── src/test/resources/
    ├── config/
    ├── testdata/
    └── log4j2.xml
```

Why this matters:

- `core` contains reusable infrastructure
- `playwright` contains Playwright-specific runtime utilities
- `runner` contains TestNG-specific execution components
- `automation` contains page objects, flows, and helpers
- `tests` contains only test classes

This is a maintainable split.

---

# 5. Step 1 — Create the Maven project

Start with a plain Maven Java project.

The initial `pom.xml` should include:

- Playwright Java
- TestNG
- Extent Reports
- Jackson or Gson if needed for config/test data
- Apache Commons utilities if genuinely required
- a logging library if you want file logging in addition to report logging

A minimal dependency set is enough in the beginning.

Example:

```xml
<dependencies>
    <dependency>
        <groupId>com.microsoft.playwright</groupId>
        <artifactId>playwright</artifactId>
        <version>1.53.0</version>
    </dependency>

    <dependency>
        <groupId>org.testng</groupId>
        <artifactId>testng</artifactId>
        <version>7.11.0</version>
        <scope>test</scope>
    </dependency>

    <dependency>
        <groupId>com.aventstack</groupId>
        <artifactId>extentreports</artifactId>
        <version>5.1.2</version>
    </dependency>
</dependencies>
```

The exact versions can be updated later, but the principle stays the same: keep the dependency surface small.

---

# 6. Step 2 — Implement configuration management first

Configuration should be implemented before browser code and before tests. Otherwise, every class starts inventing its own configuration lookup.

Create a `ConfigManager` that exposes clearly named methods.

Example responsibilities:

- `getBaseUrl()`
- `getBrowserName()`
- `isHeadless()`
- `getTraceMode()`
- `getVideoMode()`
- `getScreenshotMode()`
- `getEnvironmentName()`
- `getZephyrProjectKey()`
- `getZephyrCycleName()`

A simple initial implementation can read from:

- Java system properties
- environment variables
- a properties file for defaults

Example skeleton:

```java
package com.company.qaframework.core.config;

import java.util.Properties;

public final class ConfigManager {

    private static final Properties PROPERTIES = new Properties();

    static {
        // load defaults if desired
    }

    private ConfigManager() {
    }

    public static String getBaseUrl() {
        return get("base.url", "https://example.com");
    }

    public static boolean isHeadless() {
        return Boolean.parseBoolean(get("headless", "true"));
    }

    public static String getBrowserName() {
        return get("browser", "chromium");
    }

    public static String getTraceMode() {
        return get("trace.mode", "on-failure");
    }

    public static String getVideoMode() {
        return get("video.mode", "retain-on-failure");
    }

    public static String getEnvironmentName() {
        return get("env", "qa");
    }

    private static String get(String key, String defaultValue) {
        String system = System.getProperty(key);
        if (system != null && !system.isBlank()) {
            return system;
        }

        String env = System.getenv(key.replace('.', '_').toUpperCase());
        if (env != null && !env.isBlank()) {
            return env;
        }

        return PROPERTIES.getProperty(key, defaultValue);
    }
}
```

Do not over-engineer this class. It should be boring and stable.

---

# 7. Step 3 — Define the per-test context model

This is one of the most important steps.

The framework needs a **single source of truth** for data that belongs to one test execution.

Create `TestContext` with only the data that is genuinely per-test.

Recommended fields:

- `Browser`
- `BrowserContext`
- `Page`
- `String executionId`
- `String testName`
- `Logger logger`
- `Path screenshotPath`
- `Path tracePath`
- `Map<String, Object> data`

Example:

```java
package com.company.qaframework.core.context;

import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserContext;
import com.microsoft.playwright.Page;
import com.company.qaframework.core.logging.Logger;

import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;

public class TestContext {

    private Browser browser;
    private BrowserContext browserContext;
    private Page page;
    private Logger logger;
    private String executionId;
    private String testName;
    private Path screenshotPath;
    private Path tracePath;
    private final Map<String, Object> data = new HashMap<>();

    public Browser getBrowser() {
        return browser;
    }

    public void setBrowser(Browser browser) {
        this.browser = browser;
    }

    public BrowserContext getBrowserContext() {
        return browserContext;
    }

    public void setBrowserContext(BrowserContext browserContext) {
        this.browserContext = browserContext;
    }

    public Page getPage() {
        return page;
    }

    public void setPage(Page page) {
        this.page = page;
    }

    public Logger getLogger() {
        return logger;
    }

    public void setLogger(Logger logger) {
        this.logger = logger;
    }

    public String getExecutionId() {
        return executionId;
    }

    public void setExecutionId(String executionId) {
        this.executionId = executionId;
    }

    public String getTestName() {
        return testName;
    }

    public void setTestName(String testName) {
        this.testName = testName;
    }

    public Path getScreenshotPath() {
        return screenshotPath;
    }

    public void setScreenshotPath(Path screenshotPath) {
        this.screenshotPath = screenshotPath;
    }

    public Path getTracePath() {
        return tracePath;
    }

    public void setTracePath(Path tracePath) {
        this.tracePath = tracePath;
    }

    public Map<String, Object> getData() {
        return data;
    }
}
```

Keep this class focused. Do not turn it into a dumping ground.

---

# 8. Step 4 — Add a thread-safe ContextManager

Because TestNG may run tests in parallel, per-test context must not be stored in a shared static field.

Use `ThreadLocal<TestContext>`.

```java
package com.company.qaframework.core.context;

public final class ContextManager {

    private static final ThreadLocal<TestContext> CURRENT = new ThreadLocal<>();

    private ContextManager() {
    }

    public static void set(TestContext context) {
        CURRENT.set(context);
    }

    public static TestContext get() {
        return CURRENT.get();
    }

    public static void clear() {
        CURRENT.remove();
    }
}
```

This class is intentionally tiny.

This is the safest and simplest place to retrieve the current test context from listeners and utilities.

---

# 9. Step 5 — Create the logging abstraction

Do not scatter Extent API calls throughout page objects and flows.

Create a small `Logger` interface.

```java
package com.company.qaframework.core.logging;

public interface Logger {
    void info(String message);
    void pass(String message);
    void warn(String message);
    void fail(String message);
    void debug(String message);
}
```

Then create `ExtentLogger` that implements this interface.

```java
package com.company.qaframework.core.logging;

import com.aventstack.extentreports.ExtentTest;

public class ExtentLogger implements Logger {

    private final ExtentTest extentTest;

    public ExtentLogger(ExtentTest extentTest) {
        this.extentTest = extentTest;
    }

    @Override
    public void info(String message) {
        extentTest.info(message);
    }

    @Override
    public void pass(String message) {
        extentTest.pass(message);
    }

    @Override
    public void warn(String message) {
        extentTest.warning(message);
    }

    @Override
    public void fail(String message) {
        extentTest.fail(message);
    }

    @Override
    public void debug(String message) {
        extentTest.info("[DEBUG] " + message);
    }
}
```

This design ensures that page objects depend on `Logger`, not on Extent itself.

That is cleaner and more extensible.

---

# 10. Step 6 — Implement the report manager

The report manager owns the Extent report lifecycle at run level.

Responsibilities:

- initialize the report once
- create a per-test node
- attach screenshots/traces
- flush at run end

Example:

```java
package com.company.qaframework.core.reporting;

import com.aventstack.extentreports.ExtentReports;
import com.aventstack.extentreports.ExtentTest;
import com.aventstack.extentreports.reporter.ExtentSparkReporter;

public final class ReportManager {

    private static ExtentReports extentReports;

    private ReportManager() {
    }

    public static void init(String reportPath) {
        if (extentReports == null) {
            ExtentSparkReporter spark = new ExtentSparkReporter(reportPath);
            extentReports = new ExtentReports();
            extentReports.attachReporter(spark);
        }
    }

    public static ExtentTest createTest(String testName) {
        if (extentReports == null) {
            throw new IllegalStateException("ReportManager is not initialized");
        }
        return extentReports.createTest(testName);
    }

    public static void flush() {
        if (extentReports != null) {
            extentReports.flush();
        }
    }
}
```

Again, keep this simple.

---

# 11. Step 7 — Create Playwright browser lifecycle classes

Now implement the Playwright runtime ownership classes.

There are two levels of lifecycle:

- **Run-level browser**
- **Test-level browser context and page**

## BrowserManager

This class owns the Playwright engine and the browser.

```java
package com.company.qaframework.playwright.browser;

import com.microsoft.playwright.*;
import com.company.qaframework.core.config.ConfigManager;

public final class BrowserManager {

    private static Playwright playwright;
    private static Browser browser;

    private BrowserManager() {
    }

    public static synchronized Browser getBrowser() {
        if (browser == null) {
            playwright = Playwright.create();

            BrowserType browserType = switch (ConfigManager.getBrowserName().toLowerCase()) {
                case "firefox" -> playwright.firefox();
                case "webkit" -> playwright.webkit();
                default -> playwright.chromium();
            };

            browser = browserType.launch(
                new BrowserType.LaunchOptions().setHeadless(ConfigManager.isHeadless())
            );
        }

        return browser;
    }

    public static synchronized void closeBrowser() {
        if (browser != null) {
            browser.close();
            browser = null;
        }

        if (playwright != null) {
            playwright.close();
            playwright = null;
        }
    }
}
```

A shared browser is fine. The isolation comes from `BrowserContext`.

## PlaywrightContextFactory

```java
package com.company.qaframework.playwright.factory;

import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserContext;

import java.nio.file.Paths;

public final class PlaywrightContextFactory {

    private PlaywrightContextFactory() {
    }

    public static BrowserContext createContext(Browser browser, boolean recordVideo) {
        Browser.NewContextOptions options = new Browser.NewContextOptions();

        if (recordVideo) {
            options.setRecordVideoDir(Paths.get("artifacts/videos"));
        }

        return browser.newContext(options);
    }
}
```

This is where future context options can be added without disturbing the rest of the codebase.

---

# 12. Step 8 — Implement tracing and screenshot utilities

These should be utilities, not mixed into page objects.

## ScreenshotUtil

```java
package com.company.qaframework.playwright.screenshots;

import com.microsoft.playwright.Page;

import java.nio.file.Path;

public final class ScreenshotUtil {

    private ScreenshotUtil() {
    }

    public static Path capture(Page page, Path path) {
        page.screenshot(new Page.ScreenshotOptions().setPath(path).setFullPage(true));
        return path;
    }
}
```

## TraceUtil

```java
package com.company.qaframework.playwright.tracing;

import com.microsoft.playwright.BrowserContext;

import java.nio.file.Path;

public final class TraceUtil {

    private TraceUtil() {
    }

    public static void start(BrowserContext context) {
        context.tracing().start(
            new com.microsoft.playwright.Tracing.StartOptions()
                .setScreenshots(true)
                .setSnapshots(true)
                .setSources(true)
        );
    }

    public static Path stop(BrowserContext context, Path path) {
        context.tracing().stop(
            new com.microsoft.playwright.Tracing.StopOptions().setPath(path)
        );
        return path;
    }
}
```

Keep the utilities focused on one thing.

---

# 13. Step 9 — Implement `@ZephyrCase`

Do not use method names as Zephyr IDs.

Use a custom annotation instead.

```java
package com.company.qaframework.core.annotations;

import java.lang.annotation.*;

@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface ZephyrCase {
    String key();
}
```

This keeps test method names readable and keeps external mapping stable.

---

# 14. Step 10 — Add minimal Zephyr integration contracts

At first, define the interface and keep the implementation simple.

```java
package com.company.qaframework.core.zephyr;

public interface ZephyrPublisher {
    void publishPass(String caseKey, String comment);
    void publishFail(String caseKey, String comment);
    void publishSkip(String caseKey, String comment);
}
```

Then create a placeholder implementation.

```java
package com.company.qaframework.core.zephyr;

public class ZephyrPublisherImpl implements ZephyrPublisher {

    @Override
    public void publishPass(String caseKey, String comment) {
        // call Zephyr API
    }

    @Override
    public void publishFail(String caseKey, String comment) {
        // call Zephyr API
    }

    @Override
    public void publishSkip(String caseKey, String comment) {
        // call Zephyr API
    }
}
```

The framework should depend on the interface, not directly on an HTTP client implementation everywhere.

---

# 15. Step 11 — Implement `BasePage`

Now build the automation layer.

Every page object should have access to:

- `Page`
- `Logger`

That is enough for most page object classes.

```java
package com.company.qaframework.automation.base;

import com.microsoft.playwright.Page;
import com.company.qaframework.core.logging.Logger;

public abstract class BasePage {

    protected final Page page;
    protected final Logger logger;

    protected BasePage(Page page, Logger logger) {
        this.page = page;
        this.logger = logger;
    }
}
```

This base class should remain tiny. It is not the place for giant helper methods.

---

# 16. Step 12 — Implement page objects

Page objects should model screens, not full business processes.

A page object should contain:

- locators
- page actions
- page-level validations
- optional navigation checks

Example:

```java
package com.company.qaframework.automation.pages;

import com.company.qaframework.automation.base.BasePage;
import com.company.qaframework.core.logging.Logger;
import com.microsoft.playwright.Page;

public class LoginPage extends BasePage {

    public LoginPage(Page page, Logger logger) {
        super(page, logger);
    }

    public void open(String baseUrl) {
        logger.info("Opening login page");
        page.navigate(baseUrl + "/login");
    }

    public void enterUsername(String username) {
        logger.info("Entering username");
        page.locator("#username").fill(username);
    }

    public void enterPassword(String password) {
        logger.info("Entering password");
        page.locator("#password").fill(password);
    }

    public void clickLogin() {
        logger.info("Clicking Login");
        page.locator("#login").click();
    }

    public boolean isDisplayed() {
        return page.locator("form[data-page='login']").isVisible();
    }
}
```

Notice what is not here:

- no assertions
- no Zephyr
- no Extent
- no retry logic
- no cross-page business flow

That is correct.

---

# 17. Step 13 — Implement flows

Flows represent journeys. They orchestrate one or more page objects.

Example:

```java
package com.company.qaframework.automation.flows;

import com.company.qaframework.automation.pages.LoginPage;
import com.company.qaframework.core.config.ConfigManager;

public class LoginFlow {

    private final LoginPage loginPage;

    public LoginFlow(LoginPage loginPage) {
        this.loginPage = loginPage;
    }

    public void loginAs(String username, String password) {
        loginPage.open(ConfigManager.getBaseUrl());
        loginPage.enterUsername(username);
        loginPage.enterPassword(password);
        loginPage.clickLogin();
    }
}
```

Flows keep tests readable.

A test should say "login as valid user", not list every click and fill action.

---

# 18. Step 14 — Implement helpers

Helpers are for reusable support concerns, not UI screens.

Good examples:

- API token helper
- database helper
- random data generator
- file helper
- date helper

Bad examples:

- helper that owns browser lifecycle
- helper that secretly performs assertions
- helper that stores mutable global state

Try to keep helpers stateless.

---

# 19. Step 15 — Implement `TestBase`

This is where many frameworks become messy. Keep it disciplined.

`TestBase` should own:

- creating `BrowserContext`
- starting tracing if required
- creating `Page`
- enriching `TestContext`
- closing `BrowserContext`
- stopping tracing when needed

`TestBase` should not own:

- report initialization for the whole run
- Zephyr publication
- suite-level browser launch if a listener already owns it
- complex business logic

Example:

```java
package com.company.qaframework.runner.base;

import com.company.qaframework.core.context.ContextManager;
import com.company.qaframework.core.context.TestContext;
import com.company.qaframework.core.config.ConfigManager;
import com.company.qaframework.playwright.browser.BrowserManager;
import com.company.qaframework.playwright.factory.PlaywrightContextFactory;
import com.company.qaframework.playwright.tracing.TraceUtil;
import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserContext;
import com.microsoft.playwright.Page;
import org.testng.annotations.AfterMethod;
import org.testng.annotations.BeforeMethod;

import java.lang.reflect.Method;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

public abstract class TestBase {

    @BeforeMethod(alwaysRun = true)
    public void setUp(Method method) {
        Browser browser = BrowserManager.getBrowser();
        BrowserContext browserContext = PlaywrightContextFactory.createContext(browser, true);
        Page page = browserContext.newPage();

        TestContext context = new TestContext();
        context.setBrowser(browser);
        context.setBrowserContext(browserContext);
        context.setPage(page);
        context.setExecutionId(UUID.randomUUID().toString());
        context.setTestName(method.getName());

        ContextManager.set(context);

        if ("always".equalsIgnoreCase(ConfigManager.getTraceMode()) ||
            "on-failure".equalsIgnoreCase(ConfigManager.getTraceMode())) {
            TraceUtil.start(browserContext);
        }
    }

    @AfterMethod(alwaysRun = true)
    public void tearDown() {
        TestContext context = ContextManager.get();
        if (context != null && context.getBrowserContext() != null) {
            context.getBrowserContext().close();
        }
        ContextManager.clear();
    }

    protected TestContext context() {
        return ContextManager.get();
    }

    protected Page page() {
        return ContextManager.get().getPage();
    }
}
```

This is the first fully coherent lifecycle point in the framework.

---

# 20. Step 16 — Add TestNG listeners

Listeners are where reporting and Zephyr publication belong.

Use at least:

- `IExecutionListener` for suite-level init and flush
- `ITestListener` for per-test result handling

You may keep both in one class initially.

## Why listeners exist here

Because they are the cleanest place to react to:

- test start
- test success
- test failure
- test skip
- run start
- run finish

They observe the lifecycle; they do not own browser interaction flows.

## Example `FrameworkListener`

```java
package com.company.qaframework.runner.listeners;

import com.aventstack.extentreports.ExtentTest;
import com.company.qaframework.core.annotations.ZephyrCase;
import com.company.qaframework.core.context.ContextManager;
import com.company.qaframework.core.context.TestContext;
import com.company.qaframework.core.logging.ExtentLogger;
import com.company.qaframework.core.reporting.ReportManager;
import com.company.qaframework.core.zephyr.ZephyrPublisher;
import com.company.qaframework.core.zephyr.ZephyrPublisherImpl;
import com.company.qaframework.playwright.screenshots.ScreenshotUtil;
import com.company.qaframework.playwright.tracing.TraceUtil;
import org.testng.*;

import java.lang.reflect.Method;
import java.nio.file.Path;
import java.nio.file.Paths;

public class FrameworkListener implements IExecutionListener, ITestListener {

    private final ZephyrPublisher zephyrPublisher = new ZephyrPublisherImpl();

    @Override
    public void onExecutionStart() {
        ReportManager.init("artifacts/reports/extent-report.html");
    }

    @Override
    public void onExecutionFinish() {
        ReportManager.flush();
    }

    @Override
    public void onTestStart(ITestResult result) {
        String testName = result.getMethod().getMethodName();
        ExtentTest extentTest = ReportManager.createTest(testName);

        TestContext context = ContextManager.get();
        if (context != null) {
            context.setLogger(new ExtentLogger(extentTest));
            context.getLogger().info("Starting test: " + testName);
        }
    }

    @Override
    public void onTestSuccess(ITestResult result) {
        TestContext context = ContextManager.get();
        if (context != null && context.getLogger() != null) {
            context.getLogger().pass("Test passed");
        }
        publishToZephyr(result, "PASS");
    }

    @Override
    public void onTestFailure(ITestResult result) {
        TestContext context = ContextManager.get();

        if (context != null) {
            try {
                Path screenshotPath = Paths.get("artifacts/screenshots", result.getMethod().getMethodName() + ".png");
                context.setScreenshotPath(ScreenshotUtil.capture(context.getPage(), screenshotPath));

                Path tracePath = Paths.get("artifacts/traces", result.getMethod().getMethodName() + ".zip");
                context.setTracePath(TraceUtil.stop(context.getBrowserContext(), tracePath));

                if (context.getLogger() != null) {
                    context.getLogger().fail("Test failed: " + result.getThrowable());
                }
            } catch (Exception ex) {
                if (context.getLogger() != null) {
                    context.getLogger().warn("Failed to capture evidence: " + ex.getMessage());
                }
            }
        }

        publishToZephyr(result, "FAIL");
    }

    @Override
    public void onTestSkipped(ITestResult result) {
        TestContext context = ContextManager.get();
        if (context != null && context.getLogger() != null) {
            context.getLogger().warn("Test skipped");
        }
        publishToZephyr(result, "SKIP");
    }

    private void publishToZephyr(ITestResult result, String status) {
        Method method = result.getMethod().getConstructorOrMethod().getMethod();
        ZephyrCase annotation = method.getAnnotation(ZephyrCase.class);

        if (annotation == null) {
            return;
        }

        String caseKey = annotation.key();

        switch (status) {
            case "PASS" -> zephyrPublisher.publishPass(caseKey, "Test passed from automation");
            case "FAIL" -> zephyrPublisher.publishFail(caseKey, "Test failed from automation");
            case "SKIP" -> zephyrPublisher.publishSkip(caseKey, "Test skipped from automation");
            default -> { }
        }
    }
}
```

This is the listener’s rightful place.

---

# 21. Important lifecycle note — avoid conflicting ownership

One of the most common mistakes is making both the listener and `TestBase` create or own the same thing.

The clean ownership model is:

- **Listener**
  - initializes report at run start
  - creates report node at test start
  - logs result
  - captures failure evidence
  - publishes final result to Zephyr
  - flushes report at run end

- **TestBase**
  - creates BrowserContext
  - creates Page
  - starts trace
  - closes BrowserContext
  - clears context

This split is important. It keeps responsibilities clean.

---

# 22. Step 17 — Add retry support

Retry belongs in the runner layer.

Use TestNG `IRetryAnalyzer`.

```java
package com.company.qaframework.runner.retry;

import org.testng.IRetryAnalyzer;
import org.testng.ITestResult;

public class RetryAnalyzer implements IRetryAnalyzer {

    private int currentRetry = 0;
    private static final int MAX_RETRY = 1;

    @Override
    public boolean retry(ITestResult result) {
        if (currentRetry < MAX_RETRY) {
            currentRetry++;
            return true;
        }
        return false;
    }
}
```

Important rule:

**Zephyr should receive the final test outcome, not every failed attempt.**

So if retry is used, make sure your Zephyr publication policy is aligned with final outcome only. That can be refined later if needed.

---

# 23. Step 18 — Implement tests

Now write tests using the framework conventions.

A test should:

- extend `TestBase`
- use page objects and flows
- keep assertions in the test layer
- use TestNG groups
- optionally use `@ZephyrCase`

Example:

```java
package com.company.tests.smoke;

import com.company.qaframework.automation.flows.LoginFlow;
import com.company.qaframework.automation.pages.LoginPage;
import com.company.qaframework.core.annotations.ZephyrCase;
import com.company.qaframework.runner.base.TestBase;
import org.testng.Assert;
import org.testng.annotations.Test;

public class LoginTest extends TestBase {

    @Test(groups = {"smoke", "ui"}, retryAnalyzer = com.company.qaframework.runner.retry.RetryAnalyzer.class)
    @ZephyrCase(key = "AUTH-101")
    public void userCanLogin() {
        LoginPage loginPage = new LoginPage(page(), context().getLogger());
        LoginFlow loginFlow = new LoginFlow(loginPage);

        loginFlow.loginAs("admin", "password");

        Assert.assertTrue(page().locator("#dashboard").isVisible(), "Dashboard should be visible after login");
    }
}
```

This is readable and maintainable.

---

# 24. Step 19 — Define group strategy

Use groups intentionally.

Recommended group dimensions:

- execution type: `smoke`, `sanity`, `regression`
- layer: `ui`, `api`
- domain: `login`, `checkout`, `orders`
- governance: `flaky`, `quarantine`, `zephyr-ready`

Example:

```java
@Test(groups = {"smoke", "ui", "login", "zephyr-ready"})
```

Do not use groups as test case IDs.

Use groups for selection and execution strategy only.

---

# 25. Step 20 — Create `testng.xml`

Start with a simple suite file.

```xml
<!DOCTYPE suite SYSTEM "https://testng.org/testng-1.0.dtd" >
<suite name="Playwright UI Suite" parallel="tests" thread-count="2">

    <listeners>
        <listener class-name="com.company.qaframework.runner.listeners.FrameworkListener"/>
    </listeners>

    <test name="Smoke UI">
        <groups>
            <run>
                <include name="smoke"/>
                <include name="ui"/>
                <exclude name="flaky"/>
            </run>
        </groups>

        <classes>
            <class name="com.company.tests.smoke.LoginTest"/>
        </classes>
    </test>
</suite>
```

This is enough to get the framework working.

---

# 26. Step 21 — Add artifact folder conventions

Create predictable output folders.

```text
artifacts/
├── reports/
├── screenshots/
├── traces/
├── videos/
└── logs/
```

A framework becomes easier to debug when every artifact has a standard location.

---

# 27. Step 22 — Add framework conventions and guardrails

Document these rules early:

1. Tests contain assertions and intent only.
2. Page objects do not contain business flows.
3. Flows do not contain assertions.
4. Listeners do not perform UI actions.
5. Helpers should be stateless when possible.
6. Per-test state goes only into `TestContext`.
7. New framework code should depend on abstractions where useful, not on external tools directly.
8. Do not create wrappers for everything just because you can.

These rules will protect the codebase more than fancy design patterns will.

---

# 28. What not to implement too early

The following ideas are often attractive, but they should be delayed until genuinely needed:

- custom locator DSLs
- reflection-heavy dependency injection
- universal action engines
- giant utility base classes
- excessive abstraction around every Playwright API
- highly generic page factories
- screenshot, trace, video, console, network, performance, and accessibility capture all at once

Start small. Let real needs guide growth.

---

# 29. Example end-to-end execution sequence

The actual runtime sequence for one test should be understood clearly by the team.

## Sequence

1. TestNG starts the suite.
2. `FrameworkListener.onExecutionStart()` initializes Extent Reports.
3. `TestBase.setUp()` gets the shared browser from `BrowserManager`.
4. `TestBase.setUp()` creates a fresh `BrowserContext`.
5. `TestBase.setUp()` creates a fresh `Page`.
6. `TestBase.setUp()` creates and stores `TestContext` into `ContextManager`.
7. `FrameworkListener.onTestStart()` creates the Extent test node.
8. `FrameworkListener.onTestStart()` binds `ExtentLogger` into the current `TestContext`.
9. Test method runs using page objects and flows.
10. On success, listener marks pass and publishes to Zephyr.
11. On failure, listener captures screenshot and trace, logs failure, and publishes to Zephyr.
12. `TestBase.tearDown()` closes `BrowserContext`.
13. `FrameworkListener.onExecutionFinish()` flushes reports.
14. `BrowserManager.closeBrowser()` can be invoked in a suite shutdown hook if desired.

This is the operational model the framework should follow.

---

# 30. Clean code and SOLID interpretation for this framework

This framework is not trying to prove theoretical purity. It is trying to be practical and clean.

## Single Responsibility Principle

- `ConfigManager` reads configuration
- `TestContext` stores per-test data
- `ContextManager` exposes current test context
- `BrowserManager` owns browser lifecycle
- `PlaywrightContextFactory` creates test contexts
- `ReportManager` owns report lifecycle
- `ExtentLogger` writes logs
- `FrameworkListener` reacts to TestNG events
- page objects model screens
- flows model journeys
- tests assert outcomes

This is a healthy separation.

## Open/Closed Principle

You should be able to add:

- new pages
- new flows
- new tests
- new Zephyr implementation
- new report details
- new helper classes

without rewriting the framework core.

## Liskov Substitution Principle

Keep inheritance shallow. `BasePage` is acceptable because it is minimal. Avoid giant class hierarchies.

## Interface Segregation Principle

Keep interfaces focused:

- `Logger`
- `ZephyrPublisher`

Do not create giant interfaces with methods that half the implementations do not need.

## Dependency Inversion Principle

Automation code depends on `Logger`, not directly on Extent.  
Framework code depends on `ZephyrPublisher`, not directly on raw HTTP calls everywhere.

That is enough. Do not over-abstract beyond the point of value.

---

# 31. Minimal class list for Version 1

If you want the smallest useful version of the framework, start with these classes only.

## Core
- `ConfigManager`
- `TestContext`
- `ContextManager`
- `Logger`
- `ExtentLogger`
- `ReportManager`
- `ZephyrCase`
- `ZephyrPublisher`
- `ZephyrPublisherImpl`

## Playwright
- `BrowserManager`
- `PlaywrightContextFactory`
- `ScreenshotUtil`
- `TraceUtil`

## Runner
- `TestBase`
- `FrameworkListener`
- `RetryAnalyzer`

## Automation
- `BasePage`
- `LoginPage`
- `LoginFlow`

## Tests
- `LoginTest`

This is enough to prove the architecture and start scaling.

---

# 32. Suggested implementation order

The exact order matters because it reduces rework.

Implement in this order:

1. Maven project + dependencies
2. `ConfigManager`
3. `TestContext`
4. `ContextManager`
5. `Logger` + `ExtentLogger`
6. `ReportManager`
7. `BrowserManager`
8. `PlaywrightContextFactory`
9. `ScreenshotUtil` + `TraceUtil`
10. `BasePage`
11. first page object
12. first flow
13. `TestBase`
14. `FrameworkListener`
15. `RetryAnalyzer`
16. first test
17. `testng.xml`
18. Zephyr integration refinement
19. artifact naming refinement
20. documentation and conventions

This order keeps the implementation stable and logical.

---

# 33. Final recommendation

The cleanest framework for our agreed direction is:

- **Playwright Java**
- **TestNG**
- **Extent Reports**
- **Zephyr**
- **per-test `TestContext`**
- **shared browser + fresh `BrowserContext` per test**
- **thin page objects**
- **journey-oriented flows**
- **simple helpers**
- **listeners for reporting and publishing**
- **tests that remain readable and assertion-focused**

This is the right balance between engineering discipline and practical delivery.

It aligns with our discussion much better than a high-level bullet summary because it makes ownership, lifecycle, and implementation order explicit.

---

# 34. What to do next after Version 1

After the first working version is stable, the next safe improvements are:

- better artifact naming using execution ID
- attach screenshots and trace links directly into Extent report
- add `DashboardPage` and a few more flows
- improve Zephyr payload structure
- add data providers if needed
- add environment-specific config profiles
- add test writing guidelines
- add framework conventions document

Do not add everything at once. Grow only after the core is stable.

---

# 35. Closing note

A good automation framework is not the one with the most layers.  
It is the one that engineers can understand, trust, and extend without fear.

This implementation guide is intentionally built around that idea.
