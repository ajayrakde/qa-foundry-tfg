
# Playwright Java + TestNG Automation Framework Blueprint

This document defines a **clean, practical blueprint** for a **Playwright-Java + TestNG automation framework** designed with:

- Clean Code
- OOP principles
- SOLID design
- Low complexity
- Enterprise readiness (Extent + Zephyr + listeners)

The goal is **clarity, maintainability, and scalability without over‑engineering**.

---

# 1. Design Principles

Keep the architecture **simple and layered**.

## Core Rules

1. Tests define intent and assertions
2. Page objects represent UI structure
3. Flows represent business journeys
4. Helpers provide utilities
5. Listeners manage reporting and Zephyr integration
6. BrowserContext is created per test

Playwright recommends isolating tests with a fresh **BrowserContext** to avoid state leakage.

---

# 2. High Level Architecture

```
TestNG Runner
      │
      ▼
Framework Core
(context, config, logger, report)
      │
      ▼
Playwright Layer
(browser, context, page management)
      │
      ▼
Automation Layer
(page objects, flows, helpers)
      │
      ▼
Tests
```

---

# 3. Project Structure

```
qa-playwright-java
│
├── core
│   ├── context
│   │   └── TestContext.java
│   │
│   ├── config
│   │   └── ConfigManager.java
│   │
│   ├── logging
│   │   ├── Logger.java
│   │   └── ExtentLogger.java
│   │
│   ├── reporting
│   │   └── ReportManager.java
│   │
│   ├── zephyr
│   │   ├── ZephyrClient.java
│   │   └── ZephyrPublisher.java
│   │
│   └── annotations
│       └── ZephyrCase.java
│
├── playwright
│   ├── browser
│   │   └── BrowserManager.java
│   │
│   ├── context
│   │   └── PlaywrightContextFactory.java
│   │
│   ├── base
│   │   └── BasePage.java
│   │
│   ├── utils
│   │   ├── ScreenshotUtil.java
│   │   └── TraceUtil.java
│
├── automation
│   ├── pages
│   │   ├── LoginPage.java
│   │   └── DashboardPage.java
│   │
│   ├── flows
│   │   └── LoginFlow.java
│   │
│   └── helpers
│       └── ApiHelper.java
│
├── runner
│   ├── base
│   │   └── TestBase.java
│   │
│   ├── listeners
│   │   └── FrameworkListener.java
│   │
│   └── retry
│       └── RetryAnalyzer.java
│
├── tests
│   ├── smoke
│   │   └── LoginTest.java
│   │
│   └── regression
│       └── CheckoutTest.java
│
└── testng.xml
```

---

# 4. Test Context (Shared State)

Central container per test.

```
TestContext
 ├─ Browser
 ├─ BrowserContext
 ├─ Page
 ├─ Logger
 ├─ ExecutionId
 └─ Test metadata
```

## Example

```java
public class TestContext {

    private Browser browser;
    private BrowserContext browserContext;
    private Page page;
    private Logger logger;
    private String executionId;

}
```

## Responsibilities

- hold Playwright objects
- expose logger
- store execution metadata

---

# 5. Browser Manager

Handles Playwright lifecycle.

```java
public class BrowserManager {

    private static Playwright playwright;
    private static Browser browser;

    public static Browser getBrowser() {
        if (browser == null) {
            playwright = Playwright.create();
            browser = playwright.chromium().launch(
                new BrowserType.LaunchOptions().setHeadless(false)
            );
        }
        return browser;
    }
}
```

---

# 6. Context Factory

Creates **fresh context per test**.

```java
public class PlaywrightContextFactory {

    public static BrowserContext createContext(Browser browser) {
        return browser.newContext(
            new Browser.NewContextOptions()
                .setRecordVideoDir(Paths.get("videos"))
        );
    }
}
```

---

# 7. Base Page

All page objects inherit this class.

```java
public abstract class BasePage {

    protected Page page;
    protected Logger logger;

    public BasePage(Page page, Logger logger) {
        this.page = page;
        this.logger = logger;
    }
}
```

---

# 8. Page Object Example

```java
public class LoginPage extends BasePage {

    public LoginPage(Page page, Logger logger) {
        super(page, logger);
    }

    public void enterUsername(String username) {
        page.fill("#username", username);
        logger.info("Entered username");
    }

    public void enterPassword(String password) {
        page.fill("#password", password);
        logger.info("Entered password");
    }

    public void submit() {
        page.click("#login");
        logger.info("Clicked login button");
    }
}
```

---

# 9. Flow Layer (Business Journeys)

Avoid putting long flows inside page objects.

```java
public class LoginFlow {

    private LoginPage loginPage;

    public LoginFlow(LoginPage loginPage) {
        this.loginPage = loginPage;
    }

    public void login(String user, String password) {
        loginPage.enterUsername(user);
        loginPage.enterPassword(password);
        loginPage.submit();
    }
}
```

---

# 10. Test Base

Creates context before each test.

```java
public class TestBase {

    protected TestContext context;

    @BeforeMethod
    public void setup() {

        Browser browser = BrowserManager.getBrowser();
        BrowserContext browserContext =
            PlaywrightContextFactory.createContext(browser);

        Page page = browserContext.newPage();

        context = new TestContext();
        context.setBrowser(browser);
        context.setBrowserContext(browserContext);
        context.setPage(page);

    }

    @AfterMethod
    public void teardown() {
        context.getBrowserContext().close();
    }
}
```

---

# 11. Listener

Handles reporting and Zephyr integration.

## Lifecycle

```
Test Start
 ├ create Extent test
 ├ create TestContext
 └ assign execution id

Test Failure
 ├ screenshot
 ├ trace
 └ attach to report

Test Finish
 └ publish result to Zephyr
```

## Example

```java
public class FrameworkListener implements ITestListener {

    public void onTestFailure(ITestResult result) {

        TestContext context = ContextManager.get();

        Path screenshot = ScreenshotUtil.capture(context.getPage());

        ReportManager.attachScreenshot(screenshot);

    }
}
```

---

# 12. Test Example

```java
public class LoginTest extends TestBase {

    @Test(groups={"smoke","ui"})
    @ZephyrCase(key="AUTH-101")
    public void userCanLogin() {

        Page page = context.getPage();

        LoginPage loginPage = new LoginPage(page, context.getLogger());
        LoginFlow flow = new LoginFlow(loginPage);

        flow.login("admin","password");

        assertTrue(page.locator("#dashboard").isVisible());
    }
}
```

---

# 13. TestNG XML

```xml
<suite name="UI Suite">

    <listeners>
        <listener class-name="runner.listeners.FrameworkListener"/>
    </listeners>

    <test name="Smoke">
        <groups>
            <run>
                <include name="smoke"/>
            </run>
        </groups>

        <classes>
            <class name="tests.smoke.LoginTest"/>
        </classes>
    </test>

</suite>
```

---

# 14. SOLID Compliance

## Single Responsibility

Each layer has one purpose.

| Class | Responsibility |
|------|---------------|
| BrowserManager | Browser lifecycle |
| ContextFactory | Context creation |
| PageObjects | UI interaction |
| Flows | Business journeys |
| TestBase | Test lifecycle |
| Listener | Reporting and Zephyr |

---

## Open / Closed

You can extend the system by adding:

- new pages
- new flows
- new listeners
- new report integrations

without modifying core logic.

---

## Dependency Inversion

Pages depend on abstractions such as **Logger**, not concrete reporting implementations like Extent.

---

# 15. Execution Flow

```
TestNG starts
      │
Listener initializes report
      │
TestBase setup
      │
Browser created
      │
Context created
      │
Page created
      │
Test executes flows/pages
      │
Assertions
      │
Listener captures evidence
      │
Report + Zephyr update
```

---

# 16. What We Intentionally Avoided

To keep complexity low we **did NOT include**:

- giant universal automation SDK
- excessive abstraction layers
- custom locator frameworks
- reflection-heavy DI frameworks
- complicated page factories

These patterns often make frameworks fragile.

---

# 17. Key Strengths of This Blueprint

- simple mental model
- clean layered architecture
- SOLID compliance
- enterprise reporting support
- Playwright best practices
- scalable Zephyr integration
- easy debugging
- easy onboarding for new engineers

---

# Final Conclusion

This architecture provides a **clean, modern Playwright-Java automation framework** that:

- follows **SOLID principles**
- stays **simple**
- supports **enterprise reporting and test management**
- aligns with **Playwright best practices**
- avoids unnecessary complexity.
