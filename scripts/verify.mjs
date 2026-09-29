import { chromium, expect } from "@playwright/test";
import { mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";

const output = "test-results";
await mkdir(output, { recursive: true });
const baseURL = process.env.TEST_URL || "http://127.0.0.1:5173";
let executablePath;
if (process.platform === "win32") {
  const browserRoot = join(process.env.LOCALAPPDATA, "ms-playwright");
  const installed = (await readdir(browserRoot).catch(() => []))
    .filter((name) => /^chromium-\d+$/.test(name))
    .sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]));
  if (installed.length)
    executablePath = join(
      browserRoot,
      installed[0],
      "chrome-win64",
      "chrome.exe",
    );
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
page.setDefaultTimeout(15000);
const failures = [];
page.on("pageerror", (error) => failures.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") failures.push(message.text());
});

async function rendered() {
  await page.locator(".world-canvas canvas").waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2900);
}
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
async function noOverflow() {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBeTruthy();
}
async function noTransportControls() {
  await expect(
    page.locator(".experience .lucide-pause, .experience .lucide-play"),
  ).toHaveCount(0);
  await expect(
    page
      .locator(".experience")
      .getByRole("button", { name: /\b(?:pause|play|resume)\b/i }),
  ).toHaveCount(0);
  await expect(
    page.locator(
      '.experience [class*="lucide-arrow"], .experience [class*="lucide-chevron"]',
    ),
  ).toHaveCount(0);
}
async function singleLineHeadings() {
  for (const selector of [
    "#home-title",
    "#collection-heading",
    "#alumni-heading",
  ]) {
    const bounds = await page.locator(selector).evaluate((element) => {
      const textRects = [];
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        if (!walker.currentNode.textContent.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(walker.currentNode);
        textRects.push(
          ...Array.from(range.getClientRects()).filter(
            (rect) => rect.width > 0,
          ),
        );
      }
      const lines = [];
      for (const rect of textRects) {
        if (!lines.some((top) => Math.abs(top - rect.top) < 2))
          lines.push(rect.top);
      }
      const parent = element.getBoundingClientRect();
      return {
        lines: lines.length,
        left: Math.min(...textRects.map((rect) => rect.left)),
        right: Math.max(...textRects.map((rect) => rect.right)),
        parentLeft: parent.left,
        parentRight: parent.right,
        viewport: innerWidth,
      };
    });
    expect(
      bounds.lines,
      `${selector} should be one line at ${bounds.viewport}px`,
    ).toBe(1);
    expect(
      bounds.left,
      `${selector} extends left of its container`,
    ).toBeGreaterThanOrEqual(bounds.parentLeft - 1);
    expect(
      bounds.right,
      `${selector} extends right of its container`,
    ).toBeLessThanOrEqual(bounds.parentRight + 1);
  }
}
async function containedRectangularControls() {
  const violations = await page.evaluate(() => {
    const selectors = [
      ".header-request",
      ".record-choice",
      ".collection-jump",
      ".catalogue-record",
      ".room-record-switch button",
      ".track > button",
      ".statement-next .button",
      ".curator-link",
      ".alumni-back-footer a",
      ".room-close",
    ];
    const issues = [];
    for (const element of document.querySelectorAll(selectors.join(","))) {
      if (element.closest('[inert], [hidden], [aria-hidden="true"]')) continue;
      const style = getComputedStyle(element);
      if (style.visibility === "hidden" || !element.getClientRects().length)
        continue;
      const bounds = element.getBoundingClientRect();
      const label =
        element.getAttribute("aria-label") ||
        element.textContent.trim().replace(/\s+/g, " ").slice(0, 65);
      const radii = [
        style.borderTopLeftRadius,
        style.borderTopRightRadius,
        style.borderBottomLeftRadius,
        style.borderBottomRightRadius,
      ];
      if (radii.some((radius) => parseFloat(radius) > 1))
        issues.push(`${label}: rounded corners ${radii.join(",")}`);
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (
          !node.textContent.trim() ||
          node.parentElement.closest(".catalogue-object")
        )
          continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (const rect of range.getClientRects()) {
          if (
            rect.width &&
            (rect.left < bounds.left - 1 ||
              rect.right > bounds.right + 1 ||
              rect.top < bounds.top - 1 ||
              rect.bottom > bounds.bottom + 1)
          )
            issues.push(`${label}: text leaves button bounds`);
        }
      }
    }
    return issues;
  });
  expect(
    violations,
    "Public controls should be rectangular and contain their text",
  ).toEqual([]);
}
async function scrollPortal(progress) {
  await page.evaluate((value) => {
    const element = document.querySelector(".collection-portal");
    const top = element.getBoundingClientRect().top + scrollY;
    scrollTo({
      top: top + element.offsetHeight * value - innerHeight,
      behavior: "instant",
    });
  }, progress);
  await page.waitForTimeout(850);
}
async function screenshot(name) {
  await page.screenshot({ path: `${output}/${name}.png` });
}
async function verifyAlumni(name, checkLink = false) {
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
  await screenshot(`alumni-${name}-front`);
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
  await containedRectangularControls();
  await screenshot(`alumni-${name}-back`);
  if (checkLink) {
    await linkedin.evaluate((link) =>
      link.addEventListener("click", (event) => event.preventDefault(), {
        once: true,
      }),
    );
    await linkedin.click();
    await expect(back).toHaveAttribute("aria-expanded", "true");
  }
  await back.focus();
  await page.keyboard.press("Enter");
  await expect(front).toHaveAttribute("aria-expanded", "false");
}
async function verifyStatement(name) {
  await page.locator(".story-statement").evaluate((element) => {
    const top = element.getBoundingClientRect().top + scrollY;
    scrollTo({
      top: top + element.offsetHeight - innerHeight,
      behavior: "instant",
    });
  });
  await page.waitForTimeout(1000);
  const request = page
    .locator(".statement-next")
    .getByRole("button", { name: "Request an invitation", exact: true });
  await expect(request).toBeVisible();
  await expect(request).toBeInViewport();
  await request.click({ trial: true });
  await containedRectangularControls();
  await screenshot(`statement-${name}`);
  await request.click();
  await expect(page.locator(".invitation-dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".invitation-dialog")).toHaveCount(0);
  await expect(request).toBeFocused();
}

try {
  await page.goto(baseURL);
  await rendered();
  await expect(page.locator(".fog-background")).toHaveAttribute(
    "data-state",
    "live",
  );
  expect((await pixels()).painted).toBeGreaterThan(1000);
  await noOverflow();
  await noTransportControls();
  await singleLineHeadings();
  await containedRectangularControls();
  await screenshot("fog-home-desktop");
  await page
    .locator(".world-canvas canvas")
    .evaluate((canvas) => (canvas.dataset.continuity = "original"));
  const originalURL = page.url();
  await page
    .locator(".world-canvas canvas")
    .click({ position: { x: 390, y: 180 } });
  await expect(page.getByRole("dialog")).toBeVisible();
  await rendered();
  expect(page.url()).toBe(originalURL);
  await expect(page.locator(".world-canvas canvas")).toHaveAttribute(
    "data-continuity",
    "original",
  );
  await screenshot("immersive-edition-desktop");
  await noTransportControls();
  await containedRectangularControls();
  const movingA = await pixels();
  await page.waitForTimeout(500);
  expect((await pixels()).hash).not.toBe(movingA.hash);
  await page
    .getByRole("button", { name: "Close edition", exact: true })
    .focus();
  await page.keyboard.press("Shift+Tab");
  await expect(page.locator(".room-record-switch button").last()).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Close edition", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "What work asks of us", exact: true })
    .click();
  await expect(
    page.getByText("When machines can do the execution, what do we bring?"),
  ).toBeVisible();
  await page
    .locator(".room-record-switch")
    .getByRole("button", { name: /The work after AI/ })
    .click();
  await expect(page.locator("#room-title")).toContainText("AFTER AI");
  await expect(page.locator(".story-intro > .upcoming-badge")).toHaveText(
    "Upcoming conversation",
  );
  await rendered();
  expect((await pixels()).painted).toBeGreaterThan(1000);
  await screenshot("immersive-ai-desktop");
  await page
    .locator(".room-story")
    .getByRole("button", { name: "Request an invitation", exact: true })
    .click();
  await expect(page.locator(".invitation-dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".invitation-dialog")).toHaveCount(0);
  await expect(page.locator(".listening-room")).toBeVisible();
  await expect(
    page
      .locator(".room-story")
      .getByRole("button", { name: "Request an invitation", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator(".listening-room")).toHaveCount(0);
  expect(page.url()).toBe(originalURL);
  await expect(page.locator(".world-canvas canvas")).toHaveAttribute(
    "data-continuity",
    "original",
  );
  console.log(
    "Same-page selection, scene continuity, animation, keyboard trap, switching and nested dialog passed.",
  );

  await scrollPortal(0.2);
  const smallScale = await page
    .locator(".portal-title")
    .evaluate(
      (element) => new DOMMatrix(getComputedStyle(element).transform).a,
    );
  await scrollPortal(0.46);
  const largeScale = await page
    .locator(".portal-title")
    .evaluate(
      (element) => new DOMMatrix(getComputedStyle(element).transform).a,
    );
  expect(largeScale).toBeGreaterThan(smallScale + 0.1);
  await screenshot("collection-title-zoom");
  await scrollPortal(1);
  await expect(
    page.getByRole("button", { name: "Open The work after AI", exact: true }),
  ).toBeVisible();
  await screenshot("collection-revealed-desktop");
  const originalScroll = await page.evaluate(() => scrollY);
  await page
    .getByRole("button", { name: "Open The work after AI", exact: true })
    .click();
  await rendered();
  await page
    .getByRole("button", { name: "Close edition", exact: true })
    .click();
  await expect(page.locator(".listening-room")).toHaveCount(0);
  expect(
    Math.abs((await page.evaluate(() => scrollY)) - originalScroll),
  ).toBeLessThan(3);
  await expect(
    page.getByRole("button", { name: "Open The work after AI", exact: true }),
  ).toBeFocused();
  await verifyAlumni("desktop", true);
  await verifyStatement("desktop");
  console.log(
    "Collection zoom, restored scroll/focus, Andrew Tai portrait/LinkedIn/flip and statement CTA passed.",
  );

  await page.locator(".header-request").click();
  await page.getByLabel("Your name").fill("Prototype Test Applicant");
  await page.getByLabel("Email address").fill("prototype.test@example.com");
  await page
    .getByLabel("Organisation", { exact: false })
    .fill("Example Studio");
  await page.getByLabel("Role", { exact: false }).fill("Founder");
  await page
    .getByLabel("What perspective would you bring?")
    .fill(
      "Building a small team and exploring how AI changes shared decisions.",
    );
  await page.getByRole("checkbox").check();
  await page
    .locator(".invitation-dialog")
    .getByRole("button", { name: "Request an invitation", exact: true })
    .click();
  await expect(page.getByText("A place to begin.")).toBeVisible();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.locator(".header-request")).toBeFocused();
  await page.getByRole("link", { name: "Curator workspace" }).click();
  await page.getByLabel("Search applicants").fill("Prototype Test Applicant");
  await page
    .getByRole("button", { name: "Prototype Test Applicant", exact: true })
    .click();
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
  await page.getByLabel("Search applicants").fill("Prototype Test Applicant");
  await expect(page.locator("tbody")).toContainText("Confirmed");
  console.log("Invitation, curator workflow and persistence passed.");

  for (const viewport of [
    { width: 320, height: 700 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(baseURL);
    await rendered();
    await noOverflow();
    await noTransportControls();
    await singleLineHeadings();
    await containedRectangularControls();
    expect((await pixels()).painted).toBeGreaterThan(500);
    await screenshot(`fog-home-${viewport.width}`);
    await page
      .locator(".hero-record-index")
      .getByRole("button", { name: /The work after AI/ })
      .click();
    await rendered();
    await noOverflow();
    await noTransportControls();
    await containedRectangularControls();
    expect((await pixels()).painted).toBeGreaterThan(500);
    await screenshot(`immersive-edition-${viewport.width}`);
    await page
      .getByRole("button", { name: "Close edition", exact: true })
      .click();
    await expect(page.locator(".listening-room")).toHaveCount(0);
    await expect(
      page
        .locator(".hero-record-index")
        .getByRole("button", { name: /The work after AI/ }),
    ).toBeFocused();
    await scrollPortal(1);
    await noOverflow();
    await containedRectangularControls();
    await screenshot(`collection-revealed-${viewport.width}`);
    await verifyAlumni(String(viewport.width));
    await verifyStatement(String(viewport.width));
    console.log(
      `${viewport.width}px headings, controls, canvas and statement CTA passed.`,
    );
  }
  for (const width of [999, 1000, 1199, 1200, 1366]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(150);
    await noOverflow();
    await singleLineHeadings();
    await containedRectangularControls();
  }
  console.log("Font-breakpoint and 1366px heading/control bounds passed.");
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto(baseURL);
  await rendered();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await noOverflow();
  await screenshot("navigation-open-320");
  await page.getByRole("button", { name: "Close navigation" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseURL);
  await rendered();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await noOverflow();
  await screenshot("navigation-open-390");
  await page
    .locator(".mobile-nav")
    .getByRole("button", { name: "The alumni" })
    .click();
  await expect(page.locator(".mobile-nav")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Show details about Andrew Tai" }),
  ).toBeInViewport();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await rendered();
  await expect(page.locator(".fog-background")).toHaveAttribute(
    "data-state",
    "paused",
  );
  await expect(page.locator(".vanta-canvas")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Open The work after AI", exact: true }),
  ).toBeVisible();
  await page
    .locator(".hero-record-index")
    .getByRole("button", { name: /The first conversation/ })
    .click();
  await rendered();
  const still = await pixels();
  expect(still.painted).toBeGreaterThan(500);
  await page.waitForTimeout(450);
  expect((await pixels()).hash).toBe(still.hash);
  await noOverflow();
  await noTransportControls();
  await page.keyboard.press("Escape");
  await expect(page.locator(".listening-room")).toHaveCount(0);
  const reducedRequest = page
    .locator(".statement-next")
    .getByRole("button", { name: "Request an invitation", exact: true });
  await reducedRequest.scrollIntoViewIfNeeded();
  await reducedRequest.click();
  await expect(page.locator(".invitation-dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(reducedRequest).toBeFocused();
  expect(failures).toEqual([]);
  console.log(
    "Mobile navigation, reduced motion, accessible statement CTA and zero console errors passed.",
  );
} finally {
  await browser.close();
}
