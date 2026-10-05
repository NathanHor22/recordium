import { chromium, expect as playwrightExpect } from "@playwright/test";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const expect = playwrightExpect.configure({ timeout: 16000 });
const baseURL = process.env.TEST_URL || "http://127.0.0.1:5173";
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

async function pixels(page) {
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
    let painted = 0,
      hash = 0;
    for (let index = 0; index < buffer.length; index += stride) {
      if (buffer[index + 3] > 80) painted++;
      hash = ((hash << 5) - hash + buffer[index] + buffer[index + 1] * 3) | 0;
    }
    return { painted, hash };
  });
}

async function layout(page, phase) {
  const issues = await page.evaluate(() => {
    const issues = [];
    if (document.documentElement.scrollWidth > innerWidth + 1)
      issues.push("document overflows viewport");
    const visible = (element) => {
      if (
        !element ||
        element.closest('[inert], [hidden], [aria-hidden="true"]')
      )
        return false;
      const style = getComputedStyle(element),
        box = element.getBoundingClientRect();
      return (
        style.visibility !== "hidden" &&
        Number(style.opacity) > 0.05 &&
        box.width > 0 &&
        box.bottom > 0 &&
        box.top < innerHeight
      );
    };
    for (const element of document.querySelectorAll(
      "#home-title, .hero-support, #alumni-heading, #collection-heading, .series-prelude h2, .series-prelude p, .catalogue-caption h3, .catalogue-caption p, .desktop-nav button, .record-choice, .collection-jump, .editorial-story-button, .room-record-switch button, #room-title, .track > button, .registration-dialog h2, .registration-action, .editorial-quote p",
    )) {
      if (!visible(element)) continue;
      const box = element.getBoundingClientRect();
      const label = element.textContent
        .trim()
        .replace(/\s+/g, " ")
        .slice(0, 70);
      if (box.left < -1 || box.right > innerWidth + 1)
        issues.push(`${label}: outside viewport`);
      const lines = [],
        walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
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
              (element.matches("button") &&
                (rect.top < box.top - 2 || rect.bottom > box.bottom + 2)))
          )
            issues.push(`${label}: text outside container`);
        }
      }
      if (
        element.matches("#home-title, #collection-heading, #alumni-heading") &&
        lines.length !== 1
      )
        issues.push(`${label}: expected single display line`);
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
          [".record-choice-intro", ".record-choice-ai"],
          ["#home", "#series"],
          ["#series", "#collection"],
          ["#collection", "#alumni"],
          ["#alumni", ".editorial-quote"],
          [".editorial-quote", ".editorial-invitation"],
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

async function homeContract(page) {
  const nav = page.getByRole("navigation", {
    name: "Main navigation",
    exact: true,
  });
  await expect(nav.getByRole("button")).toHaveCount(2);
  expect(await nav.getByRole("button").allTextContents()).toEqual([
    "The collection",
    "The alumni",
  ]);
  for (const button of await nav.getByRole("button").all()) {
    await expect(button).toBeVisible();
    await expect(button).toBeInViewport();
  }
  await expect(page.locator("#main-content > *")).toHaveCount(5);
  expect(
    await page
      .locator("#main-content > *")
      .evaluateAll((nodes) => nodes.map((node) => node.id)),
  ).toEqual(["home", "series", "collection", "alumni", "idea"]);
  await expect(page.locator("#home.home-stage")).toHaveCount(1);
  await expect(page.locator("#series.series-prelude")).toContainText(
    /monthly/i,
  );
  await expect(page.locator("#series.series-prelude")).toContainText(
    /C-suite/i,
  );
  await expect(page.locator("#collection.collection-portal")).toHaveCount(1);
  await expect(page.locator(".catalogue-record")).toHaveCount(2);
  await expect(page.locator(".collection-jump")).toHaveCount(1);
  await expect(page.locator(".editorial-story > section")).toHaveCount(2);
  await expect(
    page.locator(".collection-scene, .hero-record-index"),
  ).toHaveCount(2);
  await expect(page.locator(".hero-record-index button")).toHaveCount(2);
  await expect(page.locator(".record-choice-intro")).toHaveText(
    "Navigating Work in 2026",
  );
  await expect(page.locator(".record-choice-ai .upcoming-badge")).toHaveText(
    "Upcoming",
  );
  await expect(
    page.locator(
      ".event-story, .event-carousel, .mobile-menu-button, .mobile-nav, .header-request",
    ),
  ).toHaveCount(0);
  await expect(
    page.locator(
      ".public-content .event-gallery, .public-content .track, .public-content img[src*=roundtable]",
    ),
  ).toHaveCount(0);
  await expect(
    page
      .locator(".public-content")
      .getByRole("button", { name: "Request an invitation", exact: true }),
  ).toHaveCount(2);
  await expect(
    page.locator(".editorial-quote button, .editorial-quote a[href]"),
  ).toHaveCount(0);
}

async function scrollPortal(page, progress) {
  await page.locator(".collection-portal").evaluate((node, value) => {
    const top = node.getBoundingClientRect().top + scrollY;
    scrollTo({
      top: top + node.offsetHeight * value - innerHeight,
      behavior: "instant",
    });
  }, progress);
  await page.waitForTimeout(850);
}

async function portal(page, label, reduced) {
  if (!reduced) {
    await scrollPortal(page, 0.2);
    const small = await page
      .locator(".portal-title")
      .evaluate((node) => new DOMMatrix(getComputedStyle(node).transform).a);
    await scrollPortal(page, 0.46);
    const large = await page
      .locator(".portal-title")
      .evaluate((node) => new DOMMatrix(getComputedStyle(node).transform).a);
    expect(large).toBeGreaterThan(small + 0.1);
    await page.screenshot({ path: `${output}/${label}-portal-overlay.png` });
    await page.mouse.move(8, page.viewportSize().height / 2);
    for (let step = 0; step < 16; step++) {
      if (
        await page
          .locator(".collection-reveal")
          .evaluate((node) => Number(getComputedStyle(node).opacity) > 0.98)
      )
        break;
      await page.mouse.wheel(0, Math.round(page.viewportSize().height * 0.22));
      await page.waitForTimeout(250);
    }
  } else await page.locator("#collection-heading").scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      page
        .locator(".collection-reveal")
        .evaluate((node) => Number(getComputedStyle(node).opacity)),
    )
    .toBeGreaterThan(0.98);
  await expect(page.locator("#collection-heading")).toBeInViewport();
  await expect(page.locator(".catalogue-record").first()).toBeInViewport();
  for (const record of await page.locator(".catalogue-record").all()) {
    const style = await record.evaluate((node) => ({
      background: getComputedStyle(node).backgroundColor,
      border: getComputedStyle(node).borderTopWidth,
      shadow: getComputedStyle(node).boxShadow,
    }));
    expect(style.background).toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
    expect(parseFloat(style.border)).toBe(0);
    expect(style.shadow).toBe("none");
  }
  for (const image of await page.locator(".catalogue-cover img").all())
    await expect
      .poll(() =>
        image.evaluate((node) => node.complete && node.naturalWidth > 0),
      )
      .toBeTruthy();
  await layout(page, `${label}: revealed collection`);
  await page.screenshot({ path: `${output}/${label}-portal-records.png` });
  if (!reduced) {
    await scrollPortal(page, 0.2);
    await expect
      .poll(() =>
        page
          .locator(".collection-reveal")
          .evaluate((node) => Number(getComputedStyle(node).opacity)),
      )
      .toBeLessThan(0.1);
    await expect(page.locator(".portal-title")).toBeVisible();
    await scrollPortal(page, 1);
    await expect
      .poll(() =>
        page
          .locator(".collection-reveal")
          .evaluate((node) => Number(getComputedStyle(node).opacity)),
      )
      .toBeGreaterThan(0.98);
  }
}

async function transition(page, trigger, name) {
  const recording = page.evaluate(async () => {
    const canvas = document.querySelector(".world-canvas canvas");
    const world = document.querySelector(".world-canvas");
    const samples = [],
      start = performance.now();
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
  expect(samples.length).toBeGreaterThan(4);
  expect(
    samples.every((sample) => sample.same),
    `${name}: original canvas`,
  ).toBeTruthy();
  expect(
    samples.every((sample) => sample.visible && sample.opacity > 0.1),
    `${name}: visible transition`,
  ).toBeTruthy();
  expect(
    samples.filter((sample) => sample.painted > 10).length / samples.length,
    `${name}: painted throughout`,
  ).toBeGreaterThan(0.8);
}

try {
  for (const configuration of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 320, height: 700, reduced: true },
  ]) {
    const { width, height, reduced = false } = configuration;
    const label = `${width}${reduced ? "-reduced" : ""}`;
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
      reducedMotion: reduced ? "reduce" : "no-preference",
    });
    const page = await context.newPage();
    page.setDefaultTimeout(16000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    try {
      await page.goto(baseURL, { waitUntil: "domcontentloaded" });
      await expect(page.locator(".vinyl-loader")).toHaveCount(0);
      await expect(page.locator(".public-content")).not.toHaveAttribute(
        "inert",
      );
      expect(await page.evaluate(() => document.body.style.overflow)).not.toBe(
        "hidden",
      );
      await page.evaluate(() => document.fonts.ready);
      await expect
        .poll(async () => (await pixels(page)).painted)
        .toBeGreaterThan(30);
      await page.waitForTimeout(1800);
      await homeContract(page);
      await layout(page, `${label}: collection`);
      const originalCanvas = await page
        .locator(".world-canvas canvas")
        .elementHandle();
      await page.screenshot({ path: `${output}/${label}-collection.png` });
      const nav = page.getByRole("navigation", {
        name: "Main navigation",
        exact: true,
      });
      await nav
        .getByRole("button", { name: "The alumni", exact: true })
        .click();
      await expect(page.locator("#alumni-heading")).toBeInViewport();
      await page.waitForTimeout(600);
      await layout(page, `${label}: alumni`);
      await page.screenshot({ path: `${output}/${label}-alumni.png` });
      await page.locator(".editorial-quote").scrollIntoViewIfNeeded();
      await page.waitForTimeout(600);
      await layout(page, `${label}: closing quote`);
      await page.locator(".editorial-invitation").scrollIntoViewIfNeeded();
      await page.waitForTimeout(600);
      await layout(page, `${label}: closing invitation`);
      await page.screenshot({
        path: `${output}/${label}-closing-invitation.png`,
      });
      await nav
        .getByRole("button", { name: "The collection", exact: true })
        .click();
      await expect(page.locator(".collection-portal")).toBeInViewport();
      await page.waitForTimeout(650);
      await portal(page, label, reduced);
      await page.locator(".site-header .brand").click();
      await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(2);
      await page.waitForTimeout(400);
      const choice = page.locator(".record-choice-ai");
      await transition(page, () => choice.click(), `${label}-open`);
      await expect(page.locator(".listening-room")).toHaveAttribute(
        "data-edition",
        "ai",
      );
      await page.waitForTimeout(1800);
      await layout(page, `${label}: AI edition`);
      const before = await pixels(page);
      await page.waitForTimeout(450);
      const after = await pixels(page);
      if (reduced) {
        expect(after.hash).toBe(before.hash);
        await expect(page.locator(".fog-background")).toHaveAttribute(
          "data-state",
          "paused",
        );
      } else expect(after.hash).not.toBe(before.hash);
      const request = page
        .locator(".room-story")
        .getByRole("button", { name: "Request an invitation", exact: true });
      await expect(request).toHaveCount(1);
      await request.click();
      await expect(page.locator(".registration-dialog")).toHaveAttribute(
        "open",
        "",
      );
      await layout(page, `${label}: registration`);
      await page.screenshot({ path: `${output}/${label}-registration.png` });
      await page.keyboard.press("Escape");
      await expect(page.locator(".registration-dialog")).toHaveCount(0);
      await expect(request).toBeFocused();
      await page
        .locator(".room-record-switch")
        .getByRole("button", { name: "Navigating Work in 2026", exact: true })
        .click();
      await expect(page.locator(".listening-room")).toHaveAttribute(
        "data-edition",
        "intro",
      );
      await expect(page.locator(".room-story")).toHaveAttribute(
        "aria-busy",
        "false",
      );
      await page.waitForTimeout(450);
      await layout(page, `${label}: recap edition`);
      await page.screenshot({ path: `${output}/${label}-recap.png` });
      await transition(
        page,
        () =>
          page
            .getByRole("button", { name: "Close edition", exact: true })
            .click(),
        `${label}-close`,
      );
      await expect(page.locator(".listening-room")).toHaveCount(0);
      await expect(choice).toBeFocused();
      expect(
        await originalCanvas.evaluate(
          (node) =>
            node.isConnected &&
            document.querySelector(".world-canvas canvas") === node,
        ),
      ).toBeTruthy();
      expect(errors).toEqual([]);
      results.push(
        `${label}px: restored sections, two-button navigation, portal reveal/reverse, layout and continuous canvas passed`,
      );
      console.log(results.at(-1));
    } catch (error) {
      await page
        .screenshot({ path: `${output}/${label}-failure.png` })
        .catch(() => {});
      throw error;
    } finally {
      await context.close();
    }
  }
} finally {
  await writeFile(`${output}/summary.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
