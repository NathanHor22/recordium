import { chromium, expect as playwrightExpect } from "@playwright/test";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const expect = playwrightExpect.configure({ timeout: 16000 });
const baseURL = process.env.TEST_URL || "http://127.0.0.1:5173";
const output = "test-results/event-flow";
const reducedOnly = process.argv.includes("--reduced-only");
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
const originals = [
  "/assets/roundtable-04.jpeg",
  "/assets/roundtable-01.jpeg",
  "/assets/roundtable-02.jpeg",
  "/assets/roundtable-03.jpeg",
];

async function ready(page) {
  await expect(page.locator(".vinyl-loader")).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".world-canvas canvas")).toHaveCount(1);
  await page.waitForTimeout(1800);
}

async function paintedCanvas(page, original) {
  expect(
    await original.evaluate(
      (canvas) =>
        canvas.isConnected &&
        document.querySelector(".world-canvas canvas") === canvas,
    ),
  ).toBeTruthy();
  const painted = await page
    .locator(".world-canvas canvas")
    .evaluate((canvas) => {
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
      let count = 0;
      for (let index = 0; index < buffer.length; index += stride)
        if (buffer[index + 3] > 80) count++;
      return count;
    });
  expect(
    painted,
    "The original canvas still contains the rendered record scene",
  ).toBeGreaterThan(30);
}

async function noOverflow(page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBeTruthy();
}

async function heading(page, reduced = false) {
  const words = page.locator(".hero-word-mask > span");
  await expect(words).toHaveCount(3);
  expect(await words.allTextContents()).toEqual(["FOR THE", "GREATER", "GOOD"]);
  const metrics = await page.locator("#home-title").evaluate((element) => {
    const boxes = [];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      if (!walker.currentNode.textContent.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(walker.currentNode);
      boxes.push(
        ...Array.from(range.getClientRects()).filter((rect) => rect.width),
      );
    }
    const bounds = element.getBoundingClientRect();
    const tops = [];
    for (const box of boxes)
      if (!tops.some((top) => Math.abs(top - box.top) < 3)) tops.push(box.top);
    return {
      lines: tops.length,
      left: Math.min(...boxes.map((box) => box.left)),
      right: Math.max(...boxes.map((box) => box.right)),
      parentLeft: bounds.left,
      parentRight: bounds.right,
    };
  });
  expect(metrics.lines).toBe(1);
  expect(metrics.left).toBeGreaterThanOrEqual(metrics.parentLeft - 1);
  expect(metrics.right).toBeLessThanOrEqual(metrics.parentRight + 1);
  await expect
    .poll(() =>
      words.evaluateAll((nodes) =>
        nodes.every((node) => {
          const style = getComputedStyle(node);
          return (
            Math.abs(new DOMMatrix(style.transform).m42) < 1 &&
            Number(style.opacity) > 0.98
          );
        }),
      ),
    )
    .toBeTruthy();
  if (reduced)
    expect(
      await words.evaluateAll((nodes) =>
        nodes.every((node) => {
          const style = getComputedStyle(node);
          return (
            style.animationName === "none" ||
            (parseFloat(style.animationDuration) <= 0.01 &&
              style.animationIterationCount === "1")
          );
        }),
      ),
    ).toBeTruthy();
  await noOverflow(page);
}

function recordSwitch(page, id) {
  return page.locator(".room-record-switch").getByRole("button", {
    name: id === "ai" ? /The work after AI/ : /The first conversation/,
  });
}

async function editionReady(page, id) {
  await expect(page.locator(".listening-room")).toHaveAttribute(
    "data-edition",
    id,
  );
  await expect(page.locator(".room-story")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await expect(page.locator(".room-story")).not.toHaveAttribute("inert");
  await expect(recordSwitch(page, id)).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(300);
}

async function gallery(page, scope, name, nested = false) {
  const group = page.locator(`${scope} .event-gallery`).first();
  const images = group.locator(
    nested ? ".event-gallery-photo img" : ".event-carousel-open > img",
  );
  await expect(images).toHaveCount(4);
  expect(
    await images.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("src")),
    ),
  ).toEqual(originals);
  for (const image of await images.all()) {
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        image.evaluate((node) => node.complete && node.naturalWidth >= 1000),
      )
      .toBeTruthy();
    expect(await image.getAttribute("alt")).toBeTruthy();
  }
  if (!nested) {
    const choices = group.locator(".event-carousel-thumbnails button");
    await expect(choices).toHaveCount(4);
    for (let index = 0; index < originals.length; index++) {
      await choices.nth(index).click();
      await expect(page.locator(scope)).toHaveAttribute(
        "data-slide-index",
        String(index),
      );
      await expect(choices.nth(index)).toHaveAttribute("aria-pressed", "true");
      await expect(
        group.locator(".event-carousel-open > img.is-active"),
      ).toHaveAttribute("src", originals[index]);
    }
    await choices.first().click();
  }
  const trigger = group
    .locator(nested ? ".event-gallery-open" : ".event-carousel-open")
    .first();
  await trigger.click();
  const lightbox = page.locator("dialog.event-lightbox");
  await expect(lightbox).toHaveAttribute("open", "");
  await expect(
    lightbox.getByRole("button", { name: "Close photographs", exact: true }),
  ).toBeFocused();
  const enlarged = lightbox.locator(".event-lightbox-image-stage img");
  const thumbs = lightbox.locator(".event-lightbox-thumbnails button");
  await expect(thumbs).toHaveCount(4);
  await expect(enlarged).toHaveAttribute("src", originals[0]);
  await thumbs.nth(2).click();
  await expect(enlarged).toHaveAttribute("src", originals[2]);
  await expect(thumbs.nth(2)).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("ArrowRight");
  await expect(enlarged).toHaveAttribute("src", originals[3]);
  await page.keyboard.press("ArrowRight");
  await expect(enlarged).toHaveAttribute("src", originals[0]);
  await page.keyboard.press("ArrowLeft");
  await expect(enlarged).toHaveAttribute("src", originals[3]);
  await page.keyboard.press("Home");
  await expect(enlarged).toHaveAttribute("src", originals[0]);
  await page.keyboard.press("End");
  await expect(lightbox.locator(".event-lightbox-count")).toHaveAttribute(
    "aria-label",
    "Photograph 4 of 4",
  );
  await lightbox
    .getByRole("button", { name: "Zoom photograph", exact: true })
    .click();
  await expect(
    lightbox.getByRole("button", { name: "Fit photograph", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await noOverflow(page);
  await lightbox
    .getByRole("button", { name: "Fit photograph", exact: true })
    .click();
  await expect(lightbox.locator(".event-lightbox-image-stage")).not.toHaveClass(
    /event-lightbox-image-zoomed/,
  );
  const bounds = await lightbox.evaluate((dialog) => {
    const stage = dialog
      .querySelector(".event-lightbox-image-stage")
      .getBoundingClientRect();
    const image = dialog
      .querySelector(".event-lightbox-image-stage img")
      .getBoundingClientRect();
    const caption = dialog
      .querySelector(".event-lightbox-figure figcaption")
      .getBoundingClientRect();
    return {
      imageTop: image.top,
      imageBottom: image.bottom,
      imageLeft: image.left,
      imageRight: image.right,
      stageTop: stage.top,
      stageBottom: stage.bottom,
      stageLeft: stage.left,
      stageRight: stage.right,
      captionTop: caption.top,
    };
  });
  expect(bounds.imageTop).toBeGreaterThanOrEqual(bounds.stageTop - 1);
  expect(bounds.imageBottom).toBeLessThanOrEqual(bounds.stageBottom + 1);
  expect(bounds.imageLeft).toBeGreaterThanOrEqual(bounds.stageLeft - 1);
  expect(bounds.imageRight).toBeLessThanOrEqual(bounds.stageRight + 1);
  expect(bounds.captionTop).toBeGreaterThanOrEqual(bounds.stageBottom - 1);
  await page.screenshot({ path: `${output}/${name}-lightbox.png` });
  await page.keyboard.press("Escape");
  await expect(lightbox).toHaveCount(0);
  await expect(trigger).toBeFocused();
  if (nested) {
    await expect(page.locator(".listening-room")).toBeVisible();
    await expect(page.locator(".listening-room")).not.toHaveClass(
      /is-returning|is-closing/,
    );
  } else {
    await expect(page.locator(scope)).toHaveAttribute("data-slide-index", "3");
    await expect(
      group.locator(".event-carousel-open > img.is-active"),
    ).toHaveAttribute("src", originals[3]);
  }
  await noOverflow(page);
}

async function collectionRecord(page) {
  await page.locator(".collection-portal").evaluate((element) => {
    const top = element.getBoundingClientRect().top + scrollY;
    scrollTo({
      top: top + element.offsetHeight - innerHeight,
      behavior: "instant",
    });
  });
  await page.waitForTimeout(850);
  const record = page.getByRole("button", {
    name: "Open The work after AI",
    exact: true,
  });
  await expect(record).toBeInViewport();
  return record;
}

try {
  for (const viewport of reducedOnly
    ? []
    : [
        { width: 1440, height: 1000 },
        { width: 390, height: 844 },
      ]) {
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    page.setDefaultTimeout(16000);
    await page.addInitScript(() => {
      window.__copiedConversationLink = "";
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (value) => {
            window.__copiedConversationLink = value;
          },
        },
      });
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    const label = String(viewport.width);
    try {
      await page.goto(baseURL);
      await ready(page);
      await heading(page);
      await expect(
        page.getByRole("link", { name: "Curator workspace", exact: true }),
      ).toHaveCount(0);
      const canvas = await page.locator(".world-canvas canvas").elementHandle();
      await paintedCanvas(page, canvas);
      await page.screenshot({ path: `${output}/${label}-home.png` });
      const rootURL = page.url();
      const heroAI = page.locator(".record-choice-ai");
      await heroAI.click();
      await editionReady(page, "ai");
      await page.waitForTimeout(1600);
      const copy = await page.locator(".room-copy-arrival").elementHandle();
      await page.locator(".room-story").evaluate((element) => {
        element.scrollTop = 150;
      });
      const storyScroll = await page
        .locator(".room-story")
        .evaluate((element) => element.scrollTop);
      await recordSwitch(page, "ai").click();
      await page.waitForTimeout(180);
      await expect(page.locator(".room-story")).toHaveAttribute(
        "aria-busy",
        "false",
      );
      expect(
        await copy.evaluate((element) => element.isConnected),
      ).toBeTruthy();
      expect(
        await page
          .locator(".room-story")
          .evaluate((element) => element.scrollTop),
      ).toBe(storyScroll);
      await paintedCanvas(page, canvas);

      for (const id of ["intro", "ai", "intro", "ai"]) {
        await recordSwitch(page, id).click();
        await expect(recordSwitch(page, id)).toHaveAttribute(
          "aria-pressed",
          "true",
        );
        await paintedCanvas(page, canvas);
        await page.waitForTimeout(65);
      }
      await editionReady(page, "ai");
      await page.waitForTimeout(1600);
      await expect(page.locator(".listening-room")).toHaveAttribute(
        "data-edition",
        "ai",
      );
      await paintedCanvas(page, canvas);
      expect(page.url()).toBe(rootURL);
      await page
        .getByRole("button", { name: "Copy conversation link", exact: true })
        .click();
      await expect(page.locator(".room-share-status")).toHaveText(
        "Link copied",
      );
      const shareURL = await page.evaluate(
        () => window.__copiedConversationLink,
      );
      expect(shareURL).toBe(new URL("#/edition/ai", baseURL).href);
      await page
        .getByRole("button", { name: "Close edition", exact: true })
        .click();
      await expect(page.locator(".listening-room")).toHaveCount(0);
      await expect(heroAI).toBeFocused();

      const record = await collectionRecord(page);
      const scroll = await page.evaluate(() => scrollY);
      await record.click();
      await page.waitForTimeout(90);
      await page
        .getByRole("button", { name: "Close edition", exact: true })
        .click();
      await expect(page.locator(".listening-room")).toHaveCount(0);
      await expect(record).toBeFocused();
      expect(
        Math.abs((await page.evaluate(() => scrollY)) - scroll),
      ).toBeLessThan(3);
      await expect(page.locator(".catalogue-transfer")).toHaveCount(0);
      await paintedCanvas(page, canvas);
      await record.click();
      await editionReady(page, "ai");
      await recordSwitch(page, "intro").click();
      await editionReady(page, "intro");
      await gallery(page, ".listening-room", `${label}-edition`, true);
      await page.keyboard.press("Escape");
      await expect(page.locator(".listening-room")).toHaveCount(0);
      await expect(record).toBeFocused();
      await gallery(page, ".event-story", `${label}-public`);

      if (viewport.width < 1000) {
        await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
        await page
          .getByRole("button", { name: "Open navigation", exact: true })
          .click();
        const before = await page.evaluate(() =>
          localStorage.getItem("ftgg-applications-v1"),
        );
        await page
          .locator(".mobile-nav")
          .getByRole("button", { name: "Request an invitation", exact: true })
          .click();
        const modal = page.locator(".registration-dialog");
        await expect(modal).toHaveAttribute("open", "");
        await expect(modal).toContainText("opening soon");
        await expect(
          modal.locator("form, input, textarea, select, a[href]"),
        ).toHaveCount(0);
        await expect(page.locator(".mobile-nav")).toHaveCount(0);
        await noOverflow(page);
        await page.screenshot({ path: `${output}/${label}-registration.png` });
        await page.keyboard.press("Escape");
        await expect(modal).toHaveCount(0);
        await expect(page.locator(".header-request")).toBeFocused();
        expect(
          await page.evaluate(() =>
            localStorage.getItem("ftgg-applications-v1"),
          ),
        ).toBe(before);
      }

      await page.goto(shareURL);
      await ready(page);
      await editionReady(page, "ai");
      const deepCanvas = await page
        .locator(".world-canvas canvas")
        .elementHandle();
      await paintedCanvas(page, deepCanvas);
      await page.evaluate(() => {
        window.location.hash = "/edition/intro";
      });
      await editionReady(page, "intro");
      await paintedCanvas(page, deepCanvas);
      await page.evaluate(() => {
        window.location.hash = "/edition/ai";
      });
      await editionReady(page, "ai");
      await page.evaluate(() => {
        window.location.hash = "/";
      });
      await expect(page.locator(".listening-room")).toHaveCount(0);
      await expect(page.locator(".public-content")).not.toHaveAttribute(
        "inert",
      );
      await noOverflow(page);
      expect(errors).toEqual([]);
      results.push(
        `${label}px: selection races, return, gallery, sharing, deep links and registration passed`,
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
  const context = await browser.newContext({
    viewport: { width: 320, height: 700 },
    reducedMotion: "reduce",
  });
  try {
    const page = await context.newPage();
    await page.goto(baseURL);
    await ready(page);
    await heading(page, true);
    await page.screenshot({ path: `${output}/reduced-home.png` });
    const canvas = await page.locator(".world-canvas canvas").elementHandle();
    await page.locator(".record-choice-ai").click();
    await editionReady(page, "ai");
    await recordSwitch(page, "intro").click();
    await editionReady(page, "intro");
    await paintedCanvas(page, canvas);
    await page.keyboard.press("Escape");
    await expect(page.locator(".listening-room")).toHaveCount(0);
    await expect(page.locator(".record-choice-ai")).toBeFocused();
    results.push(
      "320px reduced motion: static word reveal, record switching and focus return passed",
    );
    console.log(results.at(-1));
  } finally {
    await context.close();
  }
} finally {
  await writeFile(`${output}/summary.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
