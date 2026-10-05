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
    name: id === "ai" ? /The work after AI/i : /Navigating Work in 2026/i,
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

async function gallery(page, scope, name) {
  const group = page.locator(`${scope} .event-gallery`).first();
  const images = group.locator(".event-gallery-photo img");
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
  const trigger = group.locator(".event-gallery-open").first();
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
  await expect(page.locator(".listening-room")).toBeVisible();
  await expect(page.locator(".listening-room")).not.toHaveClass(
    /is-returning|is-closing/,
  );
  await noOverflow(page);
}

async function editionContent(page, id) {
  const story = page.locator(".room-story");
  if (id === "ai") {
    await expect(story.locator(".story-intro > .upcoming-badge")).toHaveText(
      "Upcoming conversation",
    );
    await expect(story).toContainText(/date and venue.*announced/i);
    await expect(
      story.locator(".track-section, .track, .event-gallery, blockquote, img"),
    ).toHaveCount(0);
    await expect(story).not.toContainText("QUESTIONS FOR THE ROOM");
    await expect(
      story.getByRole("button", { name: "Request an invitation", exact: true }),
    ).toHaveCount(1);
  } else {
    await expect(story.locator("#room-title")).toHaveText(
      /Navigating\s*Work in\s+2026\.?/i,
    );
    await expect(story.locator(".track")).toHaveCount(4);
    await expect(story.locator(".event-gallery-photo img")).toHaveCount(4);
    await expect(
      story.getByRole("button", { name: "Request an invitation", exact: true }),
    ).toHaveCount(0);
    for (const track of await story.locator(".track").all()) {
      const button = track.locator("button");
      if ((await button.getAttribute("aria-expanded")) !== "true")
        await button.click();
      await expect(button).toHaveAttribute("aria-expanded", "true");
      await expect(track.locator(".body-copy")).toBeVisible();
      await button.click();
      await expect(button).toHaveAttribute("aria-expanded", "false");
      await expect(track.locator(".body-copy")).toBeHidden();
    }
  }
}

async function registration(page, label, scope = ".room-story") {
  const surface = page.locator(
    scope === ".room-story" ? ".listening-room" : ".public-content",
  );
  const request = page
    .locator(scope)
    .getByRole("button", { name: "Request an invitation", exact: true });
  const before = await page.evaluate(() =>
    localStorage.getItem("ftgg-applications-v1"),
  );
  await request.click();
  const modal = page.locator(".registration-dialog");
  await expect(modal).toHaveAttribute("open", "");
  await expect(modal).toContainText("opening soon");
  await expect(
    modal.locator("form, input, textarea, select, a[href]"),
  ).toHaveCount(0);
  await expect(surface).toHaveAttribute("inert", "");
  const close = modal.getByRole("button", {
    name: "Close invitation details",
    exact: true,
  });
  const back = modal.getByRole("button", {
    name: "Back to browsing",
    exact: true,
  });
  await expect(close).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(back).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await noOverflow(page);
  await page.screenshot({ path: `${output}/${label}-registration.png` });
  await page.keyboard.press("Escape");
  await expect(modal).toHaveCount(0);
  await expect(request).toBeFocused();
  await expect(surface).not.toHaveAttribute("inert");
  expect(
    await page.evaluate(() => localStorage.getItem("ftgg-applications-v1")),
  ).toBe(before);
}

async function catalogue(page, originalCanvas, label) {
  await page.locator(".collection-portal").evaluate((node) => {
    const top = node.getBoundingClientRect().top + scrollY;
    scrollTo({
      top: top + node.offsetHeight - innerHeight,
      behavior: "instant",
    });
  });
  await page.waitForTimeout(1000);
  expect(
    await page.locator(".catalogue-caption").evaluateAll((nodes) =>
      nodes.every((node) => {
        const bounds = node.getBoundingClientRect();
        return (
          bounds.top >= -1 &&
          bounds.bottom <= innerHeight + 1 &&
          bounds.left >= -1 &&
          bounds.right <= innerWidth + 1
        );
      }),
    ),
    "Both catalogue captions remain fully visible in the sticky viewport",
  ).toBeTruthy();
  const record = page.locator(".catalogue-record-ai");
  await expect(record).toBeInViewport();
  await record.scrollIntoViewIfNeeded();
  const originalScroll = await page.evaluate(() => scrollY);
  const flight = page.evaluate(
    () =>
      new Promise((resolve) => {
        const observer = new MutationObserver(() => {
          const node = document.querySelector(".catalogue-transfer");
          if (!node) return;
          const bounds = node.getBoundingClientRect();
          observer.disconnect();
          clearTimeout(timer);
          resolve({
            width: bounds.width,
            height: bounds.height,
            cover: Boolean(node.querySelector(".catalogue-cover img")),
          });
        });
        const timer = setTimeout(() => {
          observer.disconnect();
          resolve(null);
        }, 3000);
        observer.observe(document.body, { childList: true });
      }),
  );
  await record.click();
  const transfer = await flight;
  expect(
    transfer,
    "The catalogue sleeve visibly transfers into the existing 3D scene",
  ).not.toBeNull();
  expect(transfer.width).toBeGreaterThan(50);
  expect(transfer.height).toBeGreaterThan(50);
  expect(transfer.cover).toBeTruthy();
  await editionReady(page, "ai");
  await paintedCanvas(page, originalCanvas);
  await page.screenshot({ path: `${output}/${label}-catalogue-edition.png` });
  await page.keyboard.press("Escape");
  await expect(page.locator(".listening-room")).toHaveCount(0);
  await expect(page.locator(".catalogue-transfer")).toHaveCount(0);
  await expect(record).toBeFocused();
  expect(
    Math.abs((await page.evaluate(() => scrollY)) - originalScroll),
  ).toBeLessThan(3);
  expect(
    await originalCanvas.evaluate((node) => node.isConnected),
  ).toBeTruthy();
  await record.click();
  await page.waitForTimeout(90);
  await page
    .getByRole("button", { name: "Close edition", exact: true })
    .click();
  await expect(page.locator(".listening-room")).toHaveCount(0);
  await expect(page.locator(".catalogue-transfer")).toHaveCount(0);
  await expect(record).toBeFocused();
  expect(
    Math.abs((await page.evaluate(() => scrollY)) - originalScroll),
  ).toBeLessThan(3);
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
        page.locator(
          ".public-content .event-gallery, .event-carousel, .event-story, .mobile-nav, .mobile-menu-button, .header-request",
        ),
      ).toHaveCount(0);
      await expect(
        page
          .locator(".public-content")
          .getByRole("button", { name: "Request an invitation", exact: true }),
      ).toHaveCount(2);
      await expect(page.locator("#home .hero-record-index button")).toHaveCount(
        2,
      );
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
      await editionContent(page, "ai");
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
      await registration(page, label);
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

      const record = page.locator(".record-choice-intro");
      await record.scrollIntoViewIfNeeded();
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
      await editionReady(page, "intro");
      await editionContent(page, "intro");
      await gallery(page, ".listening-room", `${label}-edition`);
      await page.keyboard.press("Escape");
      await expect(page.locator(".listening-room")).toHaveCount(0);
      await expect(record).toBeFocused();

      await catalogue(page, canvas, label);
      await registration(page, `${label}-closing`, ".editorial-invitation");
      await registration(page, `${label}-footer`, ".site-footer");

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
        `${label}px: hero/catalogue transitions, return, gallery, sharing, deep links and invitation entry points passed`,
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
