import { chromium, expect } from "@playwright/test";
import { mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";

await mkdir("test-results", { recursive: true });
const baseURL = process.env.TEST_URL || "http://127.0.0.1:5173";
let executablePath;
if (process.platform === "win32") {
  const root = join(process.env.LOCALAPPDATA, "ms-playwright");
  const versions = (await readdir(root))
    .filter((name) => /^chromium-\d+$/.test(name))
    .sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]));
  if (versions[0])
    executablePath = join(root, versions[0], "chrome-win64", "chrome.exe");
}
const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ["--enable-unsafe-swiftshader"],
});
const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));
async function noOverflow(page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBeTruthy();
}
async function loading(page) {
  await page.goto(baseURL, { waitUntil: "domcontentloaded" });
  await expect(page.locator(".vinyl-loader")).toBeVisible();
}
async function finished(page) {
  await expect(page.locator(".vinyl-loader")).toHaveCount(0, {
    timeout: 15000,
  });
  await expect(page.locator(".public-content")).not.toHaveAttribute("inert");
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe(
    "hidden",
  );
}

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/assets/art-ai.png", async (route) => {
    await delay(2400);
    await route.continue();
  });
  await loading(page);
  await expect(page.locator(".public-content")).toHaveAttribute("inert", "");
  expect(await page.evaluate(() => document.body.style.overflow)).toBe(
    "hidden",
  );
  const initialRotation = await page
    .locator(".vinyl-loader-record")
    .evaluate((element) => getComputedStyle(element).transform);
  const initialFill = await page
    .locator(".vinyl-loader-colour")
    .evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).strokeDashoffset),
    );
  await page.screenshot({ path: "test-results/intro-loader-desktop.png" });
  await page.waitForTimeout(650);
  expect(
    await page
      .locator(".vinyl-loader-record")
      .evaluate((element) => getComputedStyle(element).transform),
  ).not.toBe(initialRotation);
  expect(
    await page
      .locator(".vinyl-loader-colour")
      .evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).strokeDashoffset),
      ),
  ).toBeLessThan(initialFill);
  await page.screenshot({ path: "test-results/intro-loader-colour.png" });
  await finished(page);
  await noOverflow(page);
  await expect(page.locator(".header-logo")).toBeVisible();
  await expect(page.locator(".header-logo")).toHaveAttribute(
    "viewBox",
    "24 218 176 151",
  );
  await page.screenshot({ path: "test-results/intro-brand-desktop.png" });
  await expect(
    page.getByRole("link", { name: "Curator workspace", exact: true }),
  ).toHaveCount(0);
  await page.evaluate(() => {
    window.location.hash = "/admin";
  });
  await page
    .getByRole("button", { name: "Back to the collection", exact: true })
    .click();
  await expect(page.locator(".hero-record-index")).toBeVisible();
  await expect(page.locator(".vinyl-loader")).toHaveCount(0);
  expect(errors).toEqual([]);
  await context.close();
  console.log(
    "Real readiness, spiral fill, spinning, logo, inert state, scroll unlock and once-per-page entry passed.",
  );

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const phone = await mobile.newPage();
  await phone.route("**/assets/art-ai.png", async (route) => {
    await delay(2200);
    await route.continue();
  });
  await loading(phone);
  await noOverflow(phone);
  await phone.screenshot({ path: "test-results/intro-loader-mobile.png" });
  await finished(phone);
  await expect(phone.locator(".header-logo-compact")).toBeVisible();
  await noOverflow(phone);
  await phone.screenshot({ path: "test-results/intro-brand-mobile.png" });
  await mobile.close();

  const reduced = await browser.newContext({
    viewport: { width: 320, height: 700 },
    reducedMotion: "reduce",
  });
  const still = await reduced.newPage();
  await still.route("**/assets/art-ai.png", async (route) => {
    await delay(1800);
    await route.continue();
  });
  await loading(still);
  expect(
    await still
      .locator(".vinyl-loader-record")
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe("none");
  await noOverflow(still);
  await finished(still);
  await reduced.close();
  console.log("Phone layout, compact logo and reduced-motion loading passed.");

  const blocked = await browser.newContext({
    viewport: { width: 844, height: 390 },
  });
  const escape = await blocked.newPage();
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  await escape.route(/RecordScene(?:\.jsx|-[^/]+\.js)/, async (route) => {
    await gate;
    await route.continue();
  });
  await loading(escape);
  const enter = escape.getByRole("button", {
    name: "Enter the collection",
    exact: true,
  });
  await expect(enter).toBeVisible({ timeout: 9000 });
  await expect(enter).toBeInViewport();
  await escape.screenshot({
    path: "test-results/intro-loader-slow-landscape.png",
  });
  await enter.click();
  await finished(escape);
  release();
  await expect(escape.locator(".world-canvas canvas")).toBeVisible({
    timeout: 10000,
  });
  await expect(escape.locator(".vinyl-loader")).toHaveCount(0);
  await blocked.close();

  const failed = await browser.newContext();
  const fallback = await failed.newPage();
  await fallback.route("**/assets/art-*.png", (route) => route.abort());
  await loading(fallback);
  await finished(fallback);
  await failed.close();
  console.log(
    "Slow-renderer escape, landscape containment and failed artwork recovery passed.",
  );
} finally {
  await browser.close();
}
