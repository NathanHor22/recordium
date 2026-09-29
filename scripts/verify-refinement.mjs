import { chromium, expect as playwrightExpect } from "@playwright/test";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const baseURL = process.env.TEST_URL || "http://127.0.0.1:5173";
const expect = playwrightExpect.configure({ timeout: 15000 });
const output = "test-results/refinement";
await mkdir(output, { recursive: true });
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
  executablePath,
  headless: true,
  args: ["--enable-unsafe-swiftshader"],
});
const results = [];

async function screenshot(page, name) {
  await page.screenshot({ path: `${output}/${name}.png` });
}

async function canvasPixels(page) {
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
    const stride = Math.max(4, Math.floor(buffer.length / 16000) * 4);
    let painted = 0;
    let hash = 0;
    for (let index = 0; index < buffer.length; index += stride) {
      if (buffer[index + 3] > 80) painted++;
      hash = ((hash << 5) - hash + buffer[index] + buffer[index + 1] * 3) | 0;
    }
    return { painted, hash };
  });
}

async function settledScene(page) {
  await expect
    .poll(async () => (await canvasPixels(page)).painted)
    .toBeGreaterThan(30);
  await page.waitForTimeout(1800);
}

async function checkLayout(page, phase) {
  const issues = await page.evaluate(() => {
    const issues = [];
    if (document.documentElement.scrollWidth > innerWidth + 1)
      issues.push(`page overflows ${innerWidth}px viewport`);
    const visible = (element) => {
      if (
        !element ||
        element.closest('[inert], [hidden], [aria-hidden="true"]')
      )
        return false;
      const style = getComputedStyle(element);
      const bounds = element.getBoundingClientRect();
      return (
        style.visibility !== "hidden" &&
        Number(style.opacity) > 0.05 &&
        bounds.width > 0 &&
        bounds.bottom > 0 &&
        bounds.top < innerHeight
      );
    };
    const selectors = [
      "#home-title",
      ".hero-support",
      ".series-prelude h2",
      ".series-prelude p",
      "#collection-heading",
      ".collection-reveal-heading > p",
      ".catalogue-caption h3",
      ".catalogue-caption p",
      "#alumni-heading",
      ".header-request",
      ".record-choice",
      ".collection-jump",
      ".room-record-switch button",
      ".track > button",
      "#room-title",
      ".statement-next .button",
      ".registration-dialog h2",
      ".registration-action",
    ];
    for (const element of document.querySelectorAll(selectors.join(","))) {
      if (!visible(element)) continue;
      const box = element.getBoundingClientRect();
      const label = element.textContent
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 70);
      if (box.left < -1 || box.right > innerWidth + 1)
        issues.push(`${label}: element leaves viewport horizontally`);
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      const lines = [];
      while (walker.nextNode()) {
        if (!walker.currentNode.textContent.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(walker.currentNode);
        for (const rect of range.getClientRects()) {
          if (rect.width && !lines.some((top) => Math.abs(top - rect.top) < 3))
            lines.push(rect.top);
          if (
            rect.width &&
            (rect.left < box.left - 2 ||
              rect.right > box.right + 2 ||
              (element.matches("button, .button") &&
                (rect.top < box.top - 2 || rect.bottom > box.bottom + 2)))
          )
            issues.push(`${label}: text leaves its container`);
        }
      }
      if (
        element.matches("#home-title, #collection-heading, #alumni-heading") &&
        lines.length !== 1
      )
        issues.push(
          `${label}: expected one display line, received ${lines.length}`,
        );
    }
    const pairs = document.querySelector(".listening-room")
      ? [
          [".room-topbar", ".room-story"],
          [".room-story", ".room-player-controls"],
        ]
      : [
          [".site-header", ".hero-heading"],
          [".hero-heading", ".collection-scene"],
          [".hero-heading", ".hero-record-index"],
          [".hero-record-index", ".stage-bottom"],
          [".series-prelude", "#collection"],
        ];
    for (const [first, second] of pairs) {
      const a = document.querySelector(first),
        b = document.querySelector(second);
      if (!visible(a) || !visible(b)) continue;
      const x = a.getBoundingClientRect(),
        y = b.getBoundingClientRect();
      if (
        Math.min(x.right, y.right) - Math.max(x.left, y.left) > 2 &&
        Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top) > 2
      )
        issues.push(`${first} overlaps ${second}`);
    }
    return issues;
  });
  expect(issues, phase).toEqual([]);
}

async function watchTransition(page, trigger, name) {
  // Observe the original canvas during motion, not just the two settled states.
  const recording = page.evaluate(async () => {
    const canvas = document.querySelector(".world-canvas canvas");
    const world = document.querySelector(".world-canvas");
    const samples = [];
    const start = performance.now();
    while (performance.now() - start < 1500) {
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
      const stride = Math.max(4, Math.floor(buffer.length / 8000) * 4);
      let painted = 0;
      for (let index = 0; index < buffer.length; index += stride)
        if (buffer[index + 3] > 80) painted++;
      const style = getComputedStyle(world);
      samples.push({
        same:
          canvas.isConnected &&
          document.querySelector(".world-canvas canvas") === canvas,
        opacity: Number(style.opacity),
        visible: style.visibility !== "hidden",
        painted,
      });
      await new Promise((resolve) => setTimeout(resolve, 90));
    }
    return samples;
  });
  await trigger();
  const samples = await recording;
  await writeFile(
    `${output}/${name}-samples.json`,
    JSON.stringify(samples, null, 2),
  );
  expect(
    samples.length,
    `${name}: sampled throughout transition`,
  ).toBeGreaterThan(4);
  expect(
    samples.every((sample) => sample.same),
    `${name}: canvas identity`,
  ).toBeTruthy();
  expect(
    samples.every((sample) => sample.visible && sample.opacity > 0.1),
    `${name}: canvas should not fade out`,
  ).toBeTruthy();
  expect(
    samples.filter((sample) => sample.painted > 10).length / samples.length,
    `${name}: scene remains painted`,
  ).toBeGreaterThan(0.8);
}

async function checkCollection(page, label) {
  await page.locator(".series-prelude").scrollIntoViewIfNeeded();
  await page.waitForTimeout(750);
  await checkLayout(page, `${label}: series`);
  await screenshot(page, `${label}-series`);
  await page.locator(".collection-jump").click();
  await page.mouse.move(8, page.viewportSize().height / 2);
  // The collection reveal stays tied to actual window scroll through its sticky stage.
  for (let step = 0; step < 14; step++) {
    const revealed = await page
      .locator(".collection-reveal")
      .evaluate((element) => Number(getComputedStyle(element).opacity) > 0.98);
    if (revealed) break;
    await page.mouse.wheel(0, Math.round(page.viewportSize().height * 0.23));
    await page.waitForTimeout(400);
  }
  await expect(page.locator("#collection-heading")).toBeInViewport();
  await expect(page.locator(".catalogue-record").first()).toBeInViewport();
  const styles = await page
    .locator(".catalogue-record")
    .evaluateAll((records) =>
      records.map((record) => {
        const style = getComputedStyle(record);
        return {
          background: style.backgroundColor,
          border: style.borderTopWidth,
          shadow: style.boxShadow,
        };
      }),
    );
  for (const style of styles) {
    expect(style.background).toMatch(
      /rgba\(\s*0,\s*0,\s*0,\s*0\s*\)|transparent/,
    );
    expect(parseFloat(style.border)).toBe(0);
    expect(style.shadow).toBe("none");
  }
  const flow = await page.locator(".collection-reveal").evaluate((element) => ({
    visibility: getComputedStyle(element).visibility,
    opacity: Number(getComputedStyle(element).opacity),
  }));
  expect(flow.visibility).toBe("visible");
  expect(flow.opacity).toBeGreaterThan(0.98);
  for (const image of await page.locator(".catalogue-cover img").all())
    expect(
      await image.evaluate((img) => img.complete && img.naturalWidth > 0),
    ).toBeTruthy();
  await checkLayout(page, `${label}: collection`);
  await screenshot(page, `${label}-collection`);
}

async function checkColours(page) {
  const colour = (selector, property) =>
    page
      .locator(selector)
      .first()
      .evaluate(
        (element, name) =>
          getComputedStyle(element)
            [name].match(/[\d.]+/g)
            ?.map(Number),
        property,
      );
  const [red, green, blue] = await colour(".header-request", "backgroundColor");
  expect(red).toBeGreaterThan(150);
  expect(red).toBeGreaterThan(green * 1.2);
  expect(green).toBeGreaterThan(blue * 1.3);
  const [aiRed, aiGreen, aiBlue] = await colour(
    ".catalogue-record-ai .catalogue-cover",
    "backgroundColor",
  );
  expect(aiGreen).toBeGreaterThan(aiRed);
  expect(aiRed).toBeGreaterThan(aiBlue * 1.3);
}

try {
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 320, height: 700 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
  ]) {
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    const label = String(viewport.width);
    try {
      await page.goto(baseURL, { waitUntil: "domcontentloaded" });
      await expect(page.locator(".vinyl-loader")).toBeVisible();
      await expect(page.locator(".public-content")).toHaveAttribute(
        "inert",
        "",
      );
      await expect(page.locator(".vinyl-loader")).toHaveCount(0);
      await expect(page.locator(".public-content")).not.toHaveAttribute(
        "inert",
      );
      expect(await page.evaluate(() => document.body.style.overflow)).not.toBe(
        "hidden",
      );
      await page.evaluate(() => document.fonts.ready);
      await settledScene(page);
      const originalCanvas = await page
        .locator(".world-canvas canvas")
        .elementHandle();
      const prelude = page.locator(".series-prelude");
      await expect(prelude).toContainText(/monthly/i);
      await expect(prelude).toContainText(/C-suite/i);
      expect(
        await prelude.evaluate((section) =>
          Boolean(
            section.compareDocumentPosition(
              document.querySelector("#collection"),
            ) & Node.DOCUMENT_POSITION_FOLLOWING,
          ),
        ),
      ).toBeTruthy();
      await checkColours(page);
      await checkLayout(page, `${label}: hero`);
      await screenshot(page, `${label}-home`);
      const originalURL = page.url();
      const choice = page
        .locator(".hero-record-index")
        .getByRole("button", { name: /The work after AI/ });
      await watchTransition(page, () => choice.click(), `${label}-open`);
      await expect(page.locator("#room-title")).toContainText("AFTER AI");
      await settledScene(page);
      await checkLayout(page, `${label}: edition`);
      await screenshot(page, `${label}-edition`);
      const moving = await canvasPixels(page);
      await page.waitForTimeout(350);
      expect((await canvasPixels(page)).hash).not.toBe(moving.hash);
      const invitation = page.locator(".story-intro").getByRole("button", {
        name: "Request an invitation",
        exact: true,
      });
      await invitation.click();
      const registration = page.locator(".registration-dialog");
      await expect(registration).toBeVisible();
      await expect(registration).toHaveAttribute("open", "");
      await expect(registration).toContainText("opening soon");
      await expect(
        registration.locator("form, input, textarea, select, a[href]"),
      ).toHaveCount(0);
      await checkLayout(page, `${label}: invitation`);
      await page.keyboard.press("Escape");
      await expect(registration).toHaveCount(0);
      await expect(invitation).toBeFocused();
      await expect(page.locator(".listening-room")).not.toHaveAttribute(
        "inert",
      );
      await watchTransition(
        page,
        () =>
          page
            .getByRole("button", { name: "Close edition", exact: true })
            .click(),
        `${label}-close`,
      );
      await expect(page.locator(".listening-room")).toHaveCount(0);
      await expect(choice).toBeFocused();
      expect(page.url()).toBe(originalURL);
      await settledScene(page);
      await checkCollection(page, label);
      const aiRecord = page.getByRole("button", {
        name: "Open The work after AI",
        exact: true,
      });
      await aiRecord.scrollIntoViewIfNeeded();
      const originalScroll = await page.evaluate(() => scrollY);
      await aiRecord.click();
      await settledScene(page);
      await page
        .getByRole("button", { name: "Close edition", exact: true })
        .click();
      await expect(page.locator(".listening-room")).toHaveCount(0);
      await expect(aiRecord).toBeFocused();
      expect(
        Math.abs((await page.evaluate(() => scrollY)) - originalScroll),
      ).toBeLessThan(3);
      expect(
        await originalCanvas.evaluate((canvas) => canvas.isConnected),
      ).toBeTruthy();
      expect(errors).toEqual([]);
      results.push(
        `${label}px: intro, series, colour, collection, scene motion and layout passed`,
      );
      console.log(results.at(-1));
    } catch (error) {
      await screenshot(page, `${label}-failure`).catch(() => {});
      throw error;
    } finally {
      await context.close();
    }
  }

  const reduced = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
    deviceScaleFactor: 1,
  });
  try {
    const page = await reduced.newPage();
    page.setDefaultTimeout(15000);
    await page.goto(baseURL, { waitUntil: "domcontentloaded" });
    await expect(page.locator(".vinyl-loader")).toHaveCount(0);
    await expect(page.locator(".experience")).toHaveClass(/reduced-motion/);
    await expect(page.locator(".fog-background")).toHaveAttribute(
      "data-state",
      "paused",
    );
    await settledScene(page);
    await checkLayout(page, "reduced: home");
    await checkCollection(page, "reduced");
    await page
      .getByRole("button", { name: "Open The work after AI", exact: true })
      .click();
    await settledScene(page);
    const still = await canvasPixels(page);
    await page.waitForTimeout(400);
    expect((await canvasPixels(page)).hash).toBe(still.hash);
    await checkLayout(page, "reduced: edition");
    await screenshot(page, "reduced-edition");
    await page.keyboard.press("Escape");
    await expect(page.locator(".listening-room")).toHaveCount(0);
    results.push(
      "Reduced motion: static scene, readable collection and immediate return passed",
    );
    console.log(results.at(-1));
  } finally {
    await reduced.close();
  }
} finally {
  await writeFile(`${output}/summary.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
