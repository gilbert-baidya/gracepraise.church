#!/usr/bin/env node

/*
  Couples Devotion Regression Validator
  Usage:
    node qa/regression-couples-devotion.js
    BASE_URL=http://127.0.0.1:8080 node qa/regression-couples-devotion.js
*/

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:8080";

function nowIso() {
  return new Date().toISOString();
}

function normalizeInternalHref(href) {
  if (!href || typeof href !== "string") {
    return null;
  }

  if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return null;
  }

  if (href.startsWith("#") || href.startsWith("javascript:")) {
    return null;
  }

  if (href.startsWith("/")) {
    return href;
  }

  return `/${href}`;
}

function dedupe(list) {
  return [...new Set(list)];
}

async function safeStatus(page, targetUrl) {
  try {
    const response = await page.request.get(targetUrl, { timeout: 12000 });
    return response.status();
  } catch {
    return 0;
  }
}

async function run() {
  const report = {
    startedAt: nowIso(),
    baseUrl: BASE_URL,
    checks: {
      impacted: {},
      nonImpacted: {},
      viewport: {},
    },
    failures: [],
    warnings: [],
    consoleErrors: [],
    pageErrors: [],
    unhandledRejections: [],
    stylesheetErrors: [],
    requestFailures: [],
    passed: false,
  };

  const pushFailure = (id, detail) => {
    report.failures.push({ id, detail });
  };

  const pushWarning = (id, detail) => {
    report.warnings.push({ id, detail });
  };

  let chromium;
  try {
    ({ chromium } = require("playwright"));
  } catch (error) {
    pushFailure("playwright_import", `Playwright is unavailable: ${error.message}`);
    report.finishedAt = nowIso();
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });

  const viewportMatrix = [
    { name: "Desktop", width: 1440, height: 900 },
    { name: "iPad", width: 768, height: 1024 },
    { name: "Mobile", width: 390, height: 844 },
  ];

  const pagesToSmoke = [
    { id: "home", path: "/index.html" },
    { id: "daily", path: "/daily-devotion.html" },
    { id: "lent", path: "/fasting-40days.html" },
    { id: "gratitude", path: "/gratitude-fasting.html" },
  ];

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.addInitScript(() => {
    window.__qaErrorTrap = {
      onerror: [],
      unhandledrejection: [],
    };

    window.addEventListener("error", (event) => {
      const msg = event && event.message ? String(event.message) : "unknown window error";
      window.__qaErrorTrap.onerror.push(msg);
    });

    window.addEventListener("unhandledrejection", (event) => {
      const reason = event && event.reason;
      const text = reason && reason.message ? String(reason.message) : String(reason);
      window.__qaErrorTrap.unhandledrejection.push(text);
    });
  });

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      report.consoleErrors.push(msg.text());
    }
  });

  page.on("pageerror", (error) => {
    report.pageErrors.push(error.message || String(error));
  });

  page.on("requestfailed", (request) => {
    report.requestFailures.push(`${request.method()} ${request.url()} => ${request.failure()?.errorText || "failed"}`);
  });

  page.on("response", (response) => {
    const request = response.request();
    if (request.resourceType() === "stylesheet" && response.status() >= 400) {
      report.stylesheetErrors.push(`${response.status()} ${response.url()}`);
    }
  });

  // Non-impacted page smoke checks.
  for (const item of pagesToSmoke) {
    const target = `${BASE_URL}${item.path}`;
    const response = await page.goto(target, { waitUntil: "domcontentloaded", timeout: 20000 });
    const status = response ? response.status() : 0;
    const hasHeader = await page.locator("header nav .nav-links").count();
    const hasFooter = await page.locator("footer, [data-partial='site-footer']").count();

    report.checks.nonImpacted[item.id] = {
      url: target,
      status,
      hasHeader: hasHeader > 0,
      hasFooter: hasFooter > 0,
      title: await page.title(),
    };

    if (status < 200 || status >= 400) {
      pushFailure(`non_impacted_status_${item.id}`, `${item.path} returned HTTP ${status}`);
    }

    if (hasHeader === 0) {
      pushFailure(`non_impacted_header_${item.id}`, `${item.path} missing header nav`);
    }
  }

  // Couples page targeted checks.
  const couplesUrl = `${BASE_URL}/couples-devotion.html?date=2026-03-01`;
  const couplesResponse = await page.goto(couplesUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
  const couplesStatus = couplesResponse ? couplesResponse.status() : 0;
  const hasHeader = (await page.locator("header nav .nav-links").count()) > 0;
  const hasFooter = (await page.locator("footer, [data-partial='site-footer']").count()) > 0;

  report.checks.impacted.couplesPage = {
    url: couplesUrl,
    status: couplesStatus,
    hasHeader,
    hasFooter,
  };

  if (couplesStatus < 200 || couplesStatus >= 400) {
    pushFailure("couples_page_status", `Couples page returned HTTP ${couplesStatus}`);
  }

  if (!hasHeader) {
    pushFailure("couples_header", "Header not found on Couples page");
  }

  if (!hasFooter) {
    pushFailure("couples_footer", "Footer container not found on Couples page");
  }

  const jsonStatus = await safeStatus(page, `${BASE_URL}/devotions-data/couples-2026-week1.json`);
  report.checks.impacted.couplesJsonStatus = jsonStatus;
  if (jsonStatus < 200 || jsonStatus >= 400) {
    pushFailure("couples_json", `Couples week1 JSON returned HTTP ${jsonStatus}`);
  }

  const requiredStylesheets = [
    "redesign-styles.css",
    "assets/css/couples-devotion.css",
    "css/footer-v3.css",
  ];

  const stylesheetHrefs = await page.evaluate(() =>
    Array.from(document.querySelectorAll("link[rel='stylesheet']")).map((el) => el.getAttribute("href") || "")
  );

  const missingStyles = requiredStylesheets.filter((needle) => !stylesheetHrefs.some((href) => href.includes(needle)));
  report.checks.impacted.stylesheets = { present: stylesheetHrefs, missing: missingStyles };
  if (missingStyles.length > 0) {
    pushFailure("couples_stylesheets", `Missing expected stylesheet links: ${missingStyles.join(", ")}`);
  }

  // Devotion dropdown links and internal nav link validation.
  const devotionLinks = await page.evaluate(() =>
    Array.from(document.querySelectorAll(".nav-dropdown .dropdown-menu a"))
      .map((a) => ({ text: (a.textContent || "").trim(), href: a.getAttribute("href") || "" }))
      .filter((item) => item.href)
  );

  report.checks.impacted.devotionDropdown = {
    count: devotionLinks.length,
    hasCouples: devotionLinks.some((item) => item.href.includes("couples-devotion.html")),
    hasDaily: devotionLinks.some((item) => item.href.includes("daily-devotion.html")),
  };

  if (!report.checks.impacted.devotionDropdown.hasCouples || !report.checks.impacted.devotionDropdown.hasDaily) {
    pushFailure("devotion_dropdown", "Devotion dropdown is missing expected links");
  }

  const navInternalLinks = await page.evaluate(() =>
    Array.from(document.querySelectorAll("header nav a"))
      .map((a) => a.getAttribute("href") || "")
      .filter(Boolean)
  );

  const normalizedInternal = dedupe(navInternalLinks.map(normalizeInternalHref).filter(Boolean));
  const brokenNavLinks = [];

  for (const href of normalizedInternal) {
    const url = `${BASE_URL}${href.startsWith("/") ? href : `/${href}`}`;
    const status = await safeStatus(page, url);
    if (status < 200 || status >= 400) {
      brokenNavLinks.push({ href, status });
    }
  }

  report.checks.impacted.navLinks = {
    checked: normalizedInternal.length,
    broken: brokenNavLinks,
  };

  if (brokenNavLinks.length > 0) {
    pushFailure("broken_nav_links", `Broken nav links detected: ${JSON.stringify(brokenNavLinks)}`);
  }

  // Couples feature checks on desktop page.
  await page.waitForSelector("#couplesDevotionApp", { timeout: 15000 });
  await page.waitForTimeout(500);

  const langInitial = await page.evaluate(() => {
    const app = document.getElementById("couplesDevotionApp");
    return app ? app.className : "";
  });

  await page.click("#cdLangBn");
  await page.waitForTimeout(200);
  const langAfterBn = await page.evaluate(() => {
    const app = document.getElementById("couplesDevotionApp");
    return {
      className: app ? app.className : "",
      enPressed: document.getElementById("cdLangEn")?.getAttribute("aria-pressed"),
      bnPressed: document.getElementById("cdLangBn")?.getAttribute("aria-pressed"),
      stored: localStorage.getItem("gpbcCouplesLang"),
    };
  });

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("#couplesDevotionApp", { timeout: 15000 });
  const langAfterReload = await page.evaluate(() => {
    const app = document.getElementById("couplesDevotionApp");
    return {
      className: app ? app.className : "",
      stored: localStorage.getItem("gpbcCouplesLang"),
    };
  });

  await page.click("#cdShareBackground");
  await page.waitForTimeout(200);
  const bgAfterToggle = await page.evaluate(() => ({
    label: document.getElementById("cdShareBackground")?.textContent?.trim() || "",
    stored: localStorage.getItem("gpbcCouplesShareBg"),
  }));

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("#cdShareBackground", { timeout: 15000 });
  const bgAfterReload = await page.evaluate(() => ({
    label: document.getElementById("cdShareBackground")?.textContent?.trim() || "",
    stored: localStorage.getItem("gpbcCouplesShareBg"),
  }));

  const shareButtonsPresent = await page.evaluate(() => {
    const ids = [
      "cdSmsShare",
      "cdWhatsAppShare",
      "cdCopyLink",
      "cdFacebookShare",
      "cdXShare",
      "cdWebShare",
      "cdGenerateImage",
      "cdShareBackground",
      "cdCopyImage",
    ];

    const missing = ids.filter((id) => !document.getElementById(id));
    return { ids, missing };
  });

  await page.click("#cdGenerateImage");
  await page.waitForTimeout(1300);

  const shareImageResult = await page.evaluate(() => {
    const preview = document.getElementById("cdSharePreview");
    const copyImage = document.getElementById("cdCopyImage");
    return {
      hasSrc: Boolean(preview && preview.getAttribute("src")),
      previewVisible: Boolean(preview && !preview.classList.contains("hidden")),
      copyImageDisabled: Boolean(copyImage && copyImage.disabled),
      statusText: document.getElementById("cdStatus")?.textContent || "",
    };
  });

  report.checks.impacted.languageToggle = {
    initialClassName: langInitial,
    afterBn: langAfterBn,
    afterReload: langAfterReload,
  };

  report.checks.impacted.backgroundToggle = {
    afterToggle: bgAfterToggle,
    afterReload: bgAfterReload,
  };

  report.checks.impacted.shareButtons = shareButtonsPresent;
  report.checks.impacted.shareImageGenerator = shareImageResult;

  if (!String(langAfterBn.className).includes("lang-bn") || langAfterBn.stored !== "bn") {
    pushFailure("language_toggle", "Bangla toggle state or storage did not update correctly");
  }

  if (!String(langAfterReload.className).includes("lang-bn")) {
    pushFailure("language_persistence", "Language selection did not persist after reload");
  }

  if (!String(bgAfterToggle.label).includes("Background:")) {
    pushFailure("background_toggle_label", "Background label did not update");
  }

  if (bgAfterReload.stored !== "light" && bgAfterReload.stored !== "dark") {
    pushFailure("background_persistence", "Background selection did not persist in localStorage");
  }

  if (shareButtonsPresent.missing.length > 0) {
    pushFailure("share_buttons", `Missing share controls: ${shareButtonsPresent.missing.join(", ")}`);
  }

  if (!shareImageResult.hasSrc || !shareImageResult.previewVisible) {
    pushFailure("share_image_generator", "Share image generator did not produce visible preview");
  }

  // Viewport checks.
  for (const vp of viewportMatrix) {
    const vpContext = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const vpPage = await vpContext.newPage();

    const vpErrors = {
      console: [],
      page: [],
      rejection: [],
    };

    await vpPage.addInitScript(() => {
      window.__qaViewportErrors = [];
      window.addEventListener("unhandledrejection", (event) => {
        const reason = event && event.reason;
        window.__qaViewportErrors.push(reason && reason.message ? String(reason.message) : String(reason));
      });
    });

    vpPage.on("console", (msg) => {
      if (msg.type() === "error") {
        vpErrors.console.push(msg.text());
      }
    });

    vpPage.on("pageerror", (error) => {
      vpErrors.page.push(error.message || String(error));
    });

    const vpResp = await vpPage.goto(couplesUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
    const vpStatus = vpResp ? vpResp.status() : 0;
    await vpPage.waitForSelector("#couplesDevotionApp", { timeout: 15000 });
    await vpPage.waitForTimeout(500);

    const viewportMetrics = await vpPage.evaluate(() => {
      const app = document.getElementById("couplesDevotionApp");
      return {
        overflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        appClass: app ? app.className : "",
      };
    });

    const rejectionErrors = await vpPage.evaluate(() => window.__qaViewportErrors || []);
    vpErrors.rejection = rejectionErrors;

    report.checks.viewport[vp.name] = {
      status: vpStatus,
      overflowX: viewportMetrics.overflowX,
      scrollWidth: viewportMetrics.scrollWidth,
      innerWidth: viewportMetrics.innerWidth,
      consoleErrors: vpErrors.console,
      pageErrors: vpErrors.page,
      rejections: vpErrors.rejection,
    };

    if (vpStatus < 200 || vpStatus >= 400) {
      pushFailure(`viewport_status_${vp.name.toLowerCase()}`, `${vp.name} load failed with HTTP ${vpStatus}`);
    }

    if (viewportMetrics.overflowX) {
      pushFailure(`viewport_overflow_${vp.name.toLowerCase()}`, `${vp.name} has horizontal overflow`);
    }

    if (vpErrors.console.length > 0 || vpErrors.page.length > 0 || vpErrors.rejection.length > 0) {
      pushFailure(
        `viewport_errors_${vp.name.toLowerCase()}`,
        `${vp.name} produced script errors. console=${vpErrors.console.length}, page=${vpErrors.page.length}, rejection=${vpErrors.rejection.length}`
      );
    }

    await vpContext.close();
  }

  const trappedErrors = await page.evaluate(() => window.__qaErrorTrap || { onerror: [], unhandledrejection: [] });
  report.unhandledRejections.push(...(trappedErrors.unhandledrejection || []));

  if (report.consoleErrors.length > 0) {
    // Global pages may emit unrelated runtime noise (e.g., WebGL in homepage hero).
    // Couples page and viewport-specific console checks remain strict failures above.
    pushWarning("console_errors_non_impacted", `Non-impacted console errors captured: ${report.consoleErrors.length}`);
  }

  if (report.pageErrors.length > 0) {
    pushFailure("page_errors", `Page errors captured: ${report.pageErrors.length}`);
  }

  if (report.unhandledRejections.length > 0) {
    pushFailure("unhandled_rejections", `Unhandled rejections captured: ${report.unhandledRejections.length}`);
  }

  if (report.stylesheetErrors.length > 0) {
    pushFailure("stylesheet_errors", `Stylesheet HTTP errors: ${report.stylesheetErrors.length}`);
  }

  if (report.requestFailures.length > 0) {
    pushWarning("request_failures", `Request failures captured: ${report.requestFailures.length}`);
  }

  await context.close();
  await browser.close();

  report.finishedAt = nowIso();
  report.passed = report.failures.length === 0;

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.passed ? 0 : 1);
}

run().catch((error) => {
  console.error(JSON.stringify({
    fatal: true,
    message: error && error.message ? error.message : String(error),
    stack: error && error.stack ? error.stack : "",
  }, null, 2));
  process.exit(1);
});
