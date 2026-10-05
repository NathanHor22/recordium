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
async function observeProgress(page) {
  await page.addInitScript(() => {
    window.__loaderFrames = [];
    const sample = (time) => {
      const loader = document.querySelector(".vinyl-loader");
      const colour = loader?.querySelector(".vinyl-loader-colour");
      if (colour) {
        window.__loaderFrames.push({
          time,
          offset: Number.parseFloat(getComputedStyle(colour).strokeDashoffset),
          exiting: loader.classList.contains("vinyl-loader-exiting"),
        });
      }
      if (window.__loaderFrames.length < 2400) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
}
async function completedSmoothly(page) {
  const frames = await page.evaluate(() => window.__loaderFrames);
  expect(frames.length).toBeGreaterThan(4);
  for (const [index, frame] of frames.entries()) {
    expect(Number.isFinite(frame.offset)).toBeTruthy();
    expect(frame.offset).toBeGreaterThanOrEqual(-0.001);
    expect(frame.offset).toBeLessThanOrEqual(1.001);
    if (index > 0) {
      expect(frame.offset).toBeLessThanOrEqual(
        frames[index - 1].offset + 0.001,
      );
    }
  }
  const intermediate = new Set(
    frames
      .filter((frame) => frame.offset > 0.001 && frame.offset < 0.999)
      .map((frame) => frame.offset.toFixed(4)),
  );
  expect(intermediate.size).toBeGreaterThan(4);
  const firstExit = frames.find((frame) => frame.exiting);
  expect(
    firstExit,
    "The loader should finish filling before its exit starts",
  ).toBeTruthy();
  expect(firstExit.offset).toBeLessThanOrEqual(0.001);
}
async function containedGroove(page) {
  const geometry = await page
    .locator(".vinyl-loader-record")
    .evaluate((record) => {
      const selectors = [
        ".vinyl-loader-track",
        ".vinyl-loader-track-inner",
        ".vinyl-loader-track-mask",
        ".vinyl-loader-colour",
      ];
      const elements = selectors.map((selector) =>
        record.querySelector(selector),
      );
      const references = elements.map((element) =>
        element.getAttribute("href"),
      );
      const widths = elements.map((element) =>
        Number.parseFloat(getComputedStyle(element).strokeWidth),
      );
      const path = document.getElementById(references[0].slice(1));
      const length = path.getTotalLength();
      const radii = Array.from({ length: 481 }, (_, index) => {
        const point = path.getPointAtLength((index / 480) * length);
        return Math.hypot(point.x - 160, point.y - 160);
      });
      const mask = elements[2].closest("mask");
      const colour = elements[3];
      return {
        references,
        widths,
        pathLength: path.getAttribute("pathLength"),
        maximumRadius: Math.max(...radii),
        surfaceRadius: record.querySelector(".vinyl-loader-surface").r.baseVal
          .value,
        mask: colour.parentElement.getAttribute("mask"),
        expectedMask: `url(#${mask.id})`,
        transitionDurations: getComputedStyle(colour)
          .transitionDuration.split(",")
          .map((duration) => Number.parseFloat(duration)),
      };
    });
  expect(new Set(geometry.references).size).toBe(1);
  expect(geometry.pathLength).toBe("1");
  const [railWidth, channelWidth, maskWidth, colourWidth] = geometry.widths;
  expect(colourWidth).toBeGreaterThan(0);
  expect(colourWidth).toBeLessThan(channelWidth);
  expect(channelWidth).toBeLessThan(railWidth);
  expect(maskWidth).toBe(channelWidth);
  expect(geometry.mask).toBe(geometry.expectedMask);
  expect(geometry.maximumRadius + railWidth / 2).toBeLessThan(
    geometry.surfaceRadius,
  );
  expect(
    geometry.transitionDurations.every((duration) => duration === 0),
  ).toBeTruthy();
}
async function paintedScene(page) {
  await expect
    .poll(async () =>
      page.locator(".world-canvas canvas").evaluate((canvas) => {
        const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
        const buffer = new Uint8Array(
          gl.drawingBufferWidth * gl.drawingBufferHeight * 4,
        );
        gl.readPixels(
          0,
          0,
          gl.drawingBufferWidth,
          gl.drawingBufferHeight,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          buffer,
        );
        let painted = 0;
        for (let index = 0; index < buffer.length; index += 68) {
          if (buffer[index + 3] > 80) painted++;
        }
        return painted;
      }),
    )
    .toBeGreaterThan(page.viewportSize().width <= 760 ? 500 : 1000);
}
async function finished(page) {
  await expect(page.locator(".vinyl-loader")).toHaveCount(0, {
    timeout: 15000,
  });
  await expect(page.locator(".public-content")).not.toHaveAttribute("inert");
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe(
    "hidden",
  );
  const nav = page.getByRole("navigation", {
    name: "Main navigation",
    exact: true,
  });
  await expect(nav.getByRole("button")).toHaveCount(2);
  await expect(
    nav.getByRole("button", { name: "The collection", exact: true }),
  ).toBeVisible();
  await expect(
    nav.getByRole("button", { name: "The alumni", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#home .hero-record-index button")).toHaveCount(2);
  await expect(page.locator(".record-choice-intro")).toHaveText(
    "Navigating Work in 2026",
  );
  await expect(
    page.locator(
      ".mobile-menu-button, .mobile-nav, .header-request, .event-story, .event-carousel",
    ),
  ).toHaveCount(0);
  await expect(
    page
      .locator(".public-content")
      .getByRole("button", { name: "Request an invitation", exact: true }),
  ).toHaveCount(2);
}

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  await observeProgress(page);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/assets/art-ai.png", async (route) => {
    await delay(2400);
    await route.continue();
  });
  await loading(page);
  await containedGroove(page);
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
  await completedSmoothly(page);
  await paintedScene(page);
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
    "Shared spiral geometry, contained colour width, smooth monotonic fill, full-fill exit, real readiness, spinning, logo, inert state, scroll unlock and once-per-page entry passed.",
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
  await containedGroove(phone);
  await noOverflow(phone);
  await phone.screenshot({ path: "test-results/intro-loader-mobile.png" });
  await finished(phone);
  await paintedScene(phone);
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
  await containedGroove(still);
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

  const automatic = await browser.newContext();
  const deadline = await automatic.newPage();
  await observeProgress(deadline);
  let releaseDeadline;
  const stalledScene = new Promise((resolve) => {
    releaseDeadline = resolve;
  });
  await deadline.route(/RecordScene(?:\.jsx|-[^/]+\.js)/, async (route) => {
    await stalledScene;
    await route.continue();
  });
  await loading(deadline);
  await expect(
    deadline.getByRole("button", { name: "Enter the collection", exact: true }),
  ).toBeVisible({ timeout: 9000 });
  await finished(deadline);
  await completedSmoothly(deadline);
  await expect(deadline.locator(".world-canvas canvas")).toHaveCount(0);
  releaseDeadline();
  await expect(deadline.locator(".world-canvas canvas")).toBeVisible({
    timeout: 10000,
  });
  await automatic.close();

  const failed = await browser.newContext();
  const fallback = await failed.newPage();
  await fallback.route("**/assets/art-*.png", (route) => route.abort());
  await loading(fallback);
  await finished(fallback);
  await fallback.locator(".record-choice-ai").click();
  await expect(fallback.locator(".listening-room")).toHaveAttribute(
    "data-edition",
    "ai",
  );
  await fallback
    .getByRole("button", { name: "Close edition", exact: true })
    .click();
  await expect(fallback.locator(".listening-room")).toHaveCount(0, {
    timeout: 16000,
  });
  await expect(fallback.locator(".record-choice-ai")).toBeFocused();
  await failed.close();

  const missingScene = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const html = await missingScene.newPage();
  await html.route(/RecordScene(?:\.jsx|-[^/]+\.js)/, (route) => route.abort());
  await loading(html);
  await finished(html);
  await expect(html.locator(".record-fallback")).toBeVisible();
  await html.locator(".record-choice-intro").click();
  await expect(html.locator(".listening-room")).toHaveAttribute(
    "data-edition",
    "intro",
  );
  await expect(html.locator(".room-story .track")).toHaveCount(4);
  await html.keyboard.press("Escape");
  await expect(html.locator(".listening-room")).toHaveCount(0);
  await expect(html.locator(".record-choice-intro")).toBeFocused();
  await noOverflow(html);
  await missingScene.close();
  console.log(
    "Four failure paths passed: slow-renderer escape, automatic readiness deadline, failed artwork and missing scene module; HTML record controls remain usable.",
  );
} finally {
  await browser.close();
}
