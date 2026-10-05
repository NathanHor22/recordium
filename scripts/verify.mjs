import { chromium, expect as playwrightExpect } from "@playwright/test";
import { mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";

const expect = playwrightExpect.configure({ timeout: 16000 });
const output = "test-results";
await mkdir(output, { recursive: true });
const baseURL = process.env.TEST_URL || "http://127.0.0.1:5173";
let executablePath;
if (process.platform === "win32") {
  const root = join(process.env.LOCALAPPDATA, "ms-playwright");
  const versions = (await readdir(root).catch(() => []))
    .filter((name) => /^chromium-\d+$/.test(name))
    .sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]));
  if (versions[0])
    executablePath = join(root, versions[0], "chrome-win64", "chrome.exe");
}
const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ["--enable-unsafe-swiftshader"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
page.setDefaultTimeout(16000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});

async function pixels() {
  return page.locator(".world-canvas canvas").evaluate((canvas) => {
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
    let painted = 0,
      hash = 0;
    for (let index = 0; index < buffer.length; index += 68) {
      if (buffer[index + 3] > 80) painted++;
      hash = ((hash << 5) - hash + buffer[index] + buffer[index + 1] * 3) | 0;
    }
    return { painted, hash };
  });
}

async function ready() {
  await expect(page.locator(".vinyl-loader")).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  await expect
    .poll(async () => (await pixels()).painted)
    .toBeGreaterThan(page.viewportSize().width <= 760 ? 500 : 1000);
  await page.waitForTimeout(1800);
}

async function controls() {
  await expect(
    page.locator(
      '.experience .lucide-pause, .experience .lucide-play, .experience [class*="lucide-arrow"], .experience [class*="lucide-chevron"]',
    ),
  ).toHaveCount(0);
  await expect(
    page
      .locator(".experience")
      .getByRole("button", { name: /\b(?:pause|play|resume)\b/i }),
  ).toHaveCount(0);
  const issues = await page.evaluate(() => {
    const issues = [];
    if (document.documentElement.scrollWidth > innerWidth + 1)
      issues.push("document overflow");
    for (const element of document.querySelectorAll(
      ".site-header button, .record-choice, .collection-jump, .editorial-story-button, .site-footer button, .room-record-switch button, .track > button, .registration-action, .registration-close, .alumni-back-footer a, .room-close",
    )) {
      if (element.closest('[inert], [hidden], [aria-hidden="true"]')) continue;
      const style = getComputedStyle(element);
      if (style.visibility === "hidden" || !element.getClientRects().length)
        continue;
      const box = element.getBoundingClientRect();
      const label =
        element.getAttribute("aria-label") || element.textContent.trim();
      if (
        [
          style.borderTopLeftRadius,
          style.borderTopRightRadius,
          style.borderBottomLeftRadius,
          style.borderBottomRightRadius,
        ].some((radius) => parseFloat(radius) > 1)
      )
        issues.push(`${label}: rounded control`);
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        if (!walker.currentNode.textContent.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(walker.currentNode);
        if (
          [...range.getClientRects()].some(
            (rect) =>
              rect.width &&
              (rect.left < box.left - 1 ||
                rect.right > box.right + 1 ||
                rect.top < box.top - 1 ||
                rect.bottom > box.bottom + 1),
          )
        )
          issues.push(`${label}: text outside control`);
      }
    }
    return issues;
  });
  expect(issues).toEqual([]);
}

async function alumni(label) {
  const front = page.getByRole("button", {
    name: "Show details about Andrew Tai",
    exact: true,
  });
  const back = page.getByRole("button", {
    name: "Flip Andrew Tai's album back",
    exact: true,
  });
  await front.scrollIntoViewIfNeeded();
  const portrait = page.locator("#alumni .alumni-portrait");
  await expect(portrait).toHaveAttribute("src", "/assets/andrew-tai.png");
  await expect
    .poll(() =>
      portrait.evaluate((image) => image.complete && image.naturalWidth > 0),
    )
    .toBeTruthy();
  await expect(front).toHaveAttribute("aria-expanded", "false");
  await front.click();
  await expect(back).toHaveAttribute("aria-expanded", "true");
  await page.waitForTimeout(650);
  await expect(
    page.getByRole("region", { name: "About Andrew Tai" }),
  ).toContainText("Managing Director at Synapze");
  const linkedin = page.getByRole("link", {
    name: "Andrew Tai: Find out more on LinkedIn",
  });
  await expect(linkedin).toHaveAttribute(
    "href",
    "https://www.linkedin.com/in/andrewtaiwc/",
  );
  await expect(linkedin).toHaveAttribute("target", "_blank");
  await expect(linkedin).toBeInViewport();
  await controls();
  await page.screenshot({ path: `${output}/alumni-${label}-back.png` });
  await linkedin.evaluate((link) =>
    link.addEventListener("click", (event) => event.preventDefault(), {
      once: true,
    }),
  );
  await linkedin.click();
  await expect(back).toHaveAttribute("aria-expanded", "true");
  await back.focus();
  await page.keyboard.press("Enter");
  await expect(front).toHaveAttribute("aria-expanded", "false");
}

try {
  await page.goto(baseURL);
  await ready();
  await expect(page.locator(".fog-background")).toHaveAttribute(
    "data-state",
    "live",
  );
  await expect(page.locator(".hero-record-index button")).toHaveCount(2);
  await expect(page.locator(".record-choice-intro")).toHaveText(
    "Navigating Work in 2026",
  );
  await expect(
    page
      .locator(".public-content")
      .getByRole("button", { name: "Request an invitation", exact: true }),
  ).toHaveCount(2);
  await expect(
    page.locator(
      ".header-request, .mobile-menu-button, .event-story, .event-carousel, .public-content .event-gallery",
    ),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Curator workspace", exact: true }),
  ).toHaveCount(0);
  await controls();
  await page.screenshot({ path: `${output}/collection-home-desktop.png` });
  const canvas = await page.locator(".world-canvas canvas").elementHandle();
  const originalURL = page.url();
  await page.locator(".record-choice-intro").click();
  await expect(page.locator(".listening-room")).toHaveAttribute(
    "data-edition",
    "intro",
  );
  await expect(page.locator("#room-title")).toHaveText(
    /Navigating\s*Work in\s+2026\.?/i,
  );
  await ready();
  expect(page.url()).toBe(originalURL);
  expect(
    await canvas.evaluate(
      (node) =>
        node.isConnected &&
        document.querySelector(".world-canvas canvas") === node,
    ),
  ).toBeTruthy();
  await controls();
  const moving = await pixels();
  await page.waitForTimeout(500);
  expect((await pixels()).hash).not.toBe(moving.hash);
  const share = page.getByRole("button", {
    name: "Copy conversation link",
    exact: true,
  });
  await share.focus();
  await page.keyboard.press("Shift+Tab");
  await expect(page.locator(".room-record-switch button").last()).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(share).toBeFocused();
  await expect(page.locator(".track")).toHaveCount(4);
  await expect(page.locator(".event-gallery-photo img")).toHaveCount(4);
  await page.screenshot({ path: `${output}/intro-edition-desktop.png` });
  await page.keyboard.press("Escape");
  await expect(page.locator(".listening-room")).toHaveCount(0);
  await expect(page.locator(".record-choice-intro")).toBeFocused();
  await alumni("desktop");
  const quote = page.locator(".editorial-quote");
  await quote.scrollIntoViewIfNeeded();
  await expect(quote).toContainText("Nobody had the questions beforehand.");
  await expect(quote.locator("button, a[href]")).toHaveCount(0);
  await page.screenshot({ path: `${output}/closing-quote-desktop.png` });
  console.log(
    "Restored homepage, original animated canvas, keyboard trap, recap, alumni and closing quote passed.",
  );

  await page.goto(new URL("#/admin", baseURL).href);
  await page.getByLabel("Search applicants").fill("Amelia Tan");
  await page.getByRole("button", { name: /^Amelia Tan\s*Sample$/ }).click();
  await page
    .getByLabel("Curator notes")
    .fill("Relevant experience for the room.");
  await page.getByRole("button", { name: "Save notes" }).click();
  await page.getByRole("button", { name: "Preview invitation" }).click();
  await page.getByRole("button", { name: "Mark invited" }).click();
  await page.getByRole("button", { name: "Confirm seat manually" }).click();
  await expect(page.getByRole("status")).toContainText("Seat confirmed");
  await page
    .getByRole("button", { name: "Close applicant", exact: true })
    .click();
  await page.reload();
  await page.getByLabel("Search applicants").fill("Amelia Tan");
  await expect(page.locator("tbody")).toContainText("Confirmed");
  console.log(
    "Explicit curator demo route, notes, invitation workflow and persistence passed.",
  );

  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(baseURL);
  await ready();
  await alumni("320");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await ready();
  await expect(page.locator(".fog-background")).toHaveAttribute(
    "data-state",
    "paused",
  );
  await expect(page.locator(".vanta-canvas")).toHaveCount(0);
  await page.locator(".record-choice-intro").click();
  await ready();
  const still = await pixels();
  await page.waitForTimeout(450);
  expect((await pixels()).hash).toBe(still.hash);
  await controls();
  await page.keyboard.press("Escape");
  await expect(page.locator(".listening-room")).toHaveCount(0);
  await expect(page.locator(".record-choice-intro")).toBeFocused();
  expect(errors).toEqual([]);
  console.log(
    "320px alumni, rectangular controls, reduced-motion scene and zero runtime errors passed.",
  );
} catch (error) {
  await page
    .screenshot({ path: `${output}/browser-failure.png` })
    .catch(() => {});
  throw error;
} finally {
  await browser.close();
}
