import { chromium, expect as playwrightExpect } from "@playwright/test";
import { mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const expect = playwrightExpect.configure({ timeout: 16000 });
const baseURL = process.env.TEST_URL || "http://127.0.0.1:5173";
const output = "test-results/carousel";
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
const originals = [
  "/assets/roundtable-04.jpeg",
  "/assets/roundtable-01.jpeg",
  "/assets/roundtable-02.jpeg",
  "/assets/roundtable-03.jpeg",
];
const headlines = [
  "Start with the people living the question.",
  "Not another prediction about work.",
  "More conversation. Less performance.",
  "The work is changing. People still matter.",
];
const results = [];

async function noOverflow(page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "The carousel and lightbox stay inside the document width",
  ).toBeTruthy();
}

async function selected(page, index) {
  const story = page.locator(".event-story");
  await expect(story).toHaveAttribute("data-slide-index", String(index));
  await expect(story.locator(".event-carousel")).toHaveAttribute(
    "data-selected-index",
    String(index),
  );
  const choices = story.locator(".event-carousel-thumbnails > button");
  await expect(
    story.locator('.event-carousel-thumbnails > button[aria-pressed="true"]'),
  ).toHaveCount(1);
  await expect(choices.nth(index)).toHaveAttribute("aria-pressed", "true");
  const image = story.locator(".event-carousel-open > img.is-active");
  await expect(image).toHaveAttribute("src", originals[index]);
  await expect(image).toHaveAttribute("aria-hidden", "false");
  await expect
    .poll(() =>
      image.evaluate(
        (node) =>
          node.complete &&
          node.naturalWidth >= 1000 &&
          Number(getComputedStyle(node).opacity) > 0.99,
      ),
    )
    .toBeTruthy();
  const moment = story.locator(".event-story-moment.is-active");
  await expect(moment).toHaveAttribute("aria-hidden", "false");
  await expect(moment).not.toHaveAttribute("inert");
  await expect(moment.locator("h3")).toHaveText(headlines[index]);
  await expect
    .poll(() =>
      moment.evaluate((node) => Number(getComputedStyle(node).opacity) > 0.99),
    )
    .toBeTruthy();
  await expect(
    story.locator(
      '.event-story-moment:not(.is-active)[aria-hidden="true"][inert]',
    ),
  ).toHaveCount(3);
  await expect(story.locator(".event-carousel-count")).toHaveAttribute(
    "aria-label",
    `Photograph ${index + 1} of 4`,
  );
}

async function geometry(page) {
  return page.locator(".event-story").evaluate((story) => {
    const bounds = (element) => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top + scrollY,
        bottom: rect.bottom + scrollY,
        width: rect.width,
        height: rect.height,
      };
    };
    return {
      story: bounds(story),
      gallery: bounds(story.querySelector(".event-gallery")),
      frame: bounds(story.querySelector(".event-carousel-open")),
      copy: bounds(story.querySelector(".event-story-copy")),
      action: bounds(story.querySelector(".event-story-action")),
    };
  });
}

async function checkText(page) {
  const issues = await page.locator(".event-story").evaluate((story) => {
    const errors = [];
    for (const element of story.querySelectorAll(
      ".event-story-header h2, .event-story-header p, .event-story-moment.is-active h3, .event-story-moment.is-active p, .event-story-action",
    )) {
      const box = element.getBoundingClientRect();
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        if (!walker.currentNode.textContent.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(walker.currentNode);
        if (
          [...range.getClientRects()].some(
            (rect) => rect.left < box.left - 1 || rect.right > box.right + 1,
          )
        )
          errors.push({
            element: element.className || element.tagName,
            box: {
              left: box.left,
              right: box.right,
              top: box.top,
              bottom: box.bottom,
            },
            text: [...range.getClientRects()].map((rect) => ({
              left: rect.left,
              right: rect.right,
              top: rect.top,
              bottom: rect.bottom,
            })),
          });
      }
    }
    for (const selector of [
      ".event-story-header",
      ".event-story-moment.is-active",
    ]) {
      const block = story.querySelector(selector);
      const heading = block.querySelector("h2, h3");
      const paragraph = block.querySelector("p");
      const range = document.createRange();
      range.selectNodeContents(heading);
      if (
        Math.max(...[...range.getClientRects()].map((rect) => rect.bottom)) >
        paragraph.getBoundingClientRect().top + 1
      )
        errors.push(`${selector} heading overlaps its paragraph`);
    }
    return errors;
  });
  expect(
    issues,
    "Visible story text fits horizontally without overlapping the next block",
  ).toEqual([]);
  await noOverflow(page);
}

async function swipe(page, context, direction) {
  const frame = page.locator(".event-carousel-open");
  await frame.scrollIntoViewIfNeeded();
  const box = await frame.boundingBox();
  const startX = box.x + box.width * (direction === "left" ? 0.8 : 0.2);
  const endX = box.x + box.width * (direction === "left" ? 0.2 : 0.8);
  const y = box.y + box.height / 2;
  const cdp = await context.newCDPSession(page);
  try {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: startX, y, id: 1 }],
    });
    for (let step = 1; step <= 6; step++) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: startX + ((endX - startX) * step) / 6, y, id: 1 }],
      });
      await page.waitForTimeout(25);
    }
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
  } finally {
    await cdp.detach();
  }
  await expect(page.locator("dialog.event-lightbox")).toHaveCount(0);
}

async function lightbox(page) {
  const trigger = page.locator(".event-carousel-open");
  await trigger.click();
  const dialog = page.locator("dialog.event-lightbox");
  await expect(dialog).toHaveAttribute("open", "");
  await expect(
    dialog.getByRole("button", { name: "Close photographs", exact: true }),
  ).toBeFocused();
  const enlarged = dialog.locator(".event-lightbox-image-stage img");
  await expect(enlarged).toHaveAttribute("src", originals[1]);
  await dialog
    .getByRole("button", { name: "Zoom photograph", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Fit photograph", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await noOverflow(page);
  await dialog
    .getByRole("button", { name: "Fit photograph", exact: true })
    .click();
  await expect(dialog.locator(".event-lightbox-image-stage")).not.toHaveClass(
    /event-lightbox-image-zoomed/,
  );
  await dialog.locator(".event-lightbox-thumbnails button").nth(3).click();
  await expect(enlarged).toHaveAttribute("src", originals[3]);
  await selected(page, 3);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(dialog).toHaveAttribute("open", "");
  await expect(enlarged).toHaveAttribute("src", originals[3]);
  await dialog
    .getByRole("button", { name: "Close photographs", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
}

try {
  for (const configuration of [
    { width: 1440, height: 1000 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 320, height: 700, reduced: true },
  ]) {
    const { width, height, reduced = false } = configuration;
    const label = `${width}${reduced ? "-reduced" : ""}`;
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
      hasTouch: width <= 768,
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
      await page.goto(baseURL);
      await expect(page.locator(".vinyl-loader")).toHaveCount(0);
      await page.evaluate(() => document.fonts.ready);
      const story = page.locator(".event-story");
      await story.scrollIntoViewIfNeeded();
      await expect(story.locator(".event-gallery-grid")).toHaveCount(0);
      await expect(story.locator(".event-carousel-open > img")).toHaveCount(4);
      expect(
        await story
          .locator(".event-carousel-open > img")
          .evaluateAll((nodes) =>
            nodes.map((node) => node.getAttribute("src")),
          ),
      ).toEqual(originals);
      const choices = story.locator(".event-carousel-thumbnails > button");
      await expect(choices).toHaveCount(4);
      await selected(page, 0);
      const baseline = await geometry(page);
      if (width > 900) {
        expect(baseline.gallery.right).toBeLessThan(baseline.copy.left);
        expect(baseline.copy.top).toBeLessThan(baseline.gallery.bottom);
        expect(baseline.copy.bottom).toBeGreaterThan(baseline.gallery.top);
      } else {
        expect(baseline.gallery.bottom).toBeLessThan(baseline.copy.top);
        expect(
          Math.abs(baseline.gallery.left - baseline.copy.left),
        ).toBeLessThan(1);
      }
      expect(
        Math.abs(baseline.frame.width / baseline.frame.height - 4 / 3),
      ).toBeLessThan(0.01);
      for (let index = 0; index < 4; index++) {
        await choices.nth(index).click();
        await selected(page, index);
        const current = await geometry(page);
        for (const key of ["story", "gallery", "frame", "copy", "action"])
          for (const dimension of ["top", "left", "width", "height"])
            expect(
              Math.abs(current[key][dimension] - baseline[key][dimension]),
              `${key}.${dimension} stays fixed on slide ${index + 1}`,
            ).toBeLessThan(1);
        await checkText(page);
      }
      await choices.nth(3).focus();
      await page.keyboard.press("ArrowRight");
      await selected(page, 0);
      await expect(choices.nth(0)).toBeFocused();
      await page.keyboard.press("ArrowLeft");
      await selected(page, 3);
      await expect(choices.nth(3)).toBeFocused();
      await page.keyboard.press("Home");
      await selected(page, 0);
      await page.keyboard.press("End");
      await selected(page, 3);
      await expect(choices.nth(3)).toBeFocused();
      await choices.nth(0).click();
      if (width <= 768) {
        await swipe(page, context, "left");
        await selected(page, 1);
        await swipe(page, context, "right");
        await selected(page, 0);
      }
      if (width === 1440) {
        await story.locator(".event-carousel-open").focus();
        await page.keyboard.press("ArrowRight");
        await selected(page, 1);
        await page.waitForTimeout(5500);
        await selected(page, 1);
      } else {
        await choices.nth(1).click();
        await selected(page, 1);
      }
      await lightbox(page);
      if (reduced) {
        expect(
          await story
            .locator(".event-carousel-open > img, .event-story-moment")
            .evaluateAll((nodes) =>
              nodes.every((node) =>
                getComputedStyle(node)
                  .transitionDuration.split(",")
                  .every((duration) => parseFloat(duration) <= 0.01),
              ),
            ),
        ).toBeTruthy();
      }
      await checkText(page);
      await story.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `${output}/${label}-carousel.png`,
        fullPage: false,
      });
      await story.screenshot({ path: `${output}/${label}-section.png` });
      const action = story.locator(".event-story-action");
      await action.scrollIntoViewIfNeeded();
      const scrollBefore = await page.evaluate(() => scrollY);
      const canvas = await page.locator(".world-canvas canvas").elementHandle();
      await action.click();
      await expect(page.locator(".listening-room")).toHaveAttribute(
        "data-edition",
        "intro",
      );
      await expect(page.locator(".room-story")).toHaveAttribute(
        "aria-busy",
        "false",
      );
      expect(
        await canvas.evaluate(
          (node) =>
            node.isConnected &&
            document.querySelector(".world-canvas canvas") === node,
        ),
      ).toBeTruthy();
      await expect
        .poll(() =>
          canvas.evaluate((node) => {
            const gl = node.getContext("webgl2") || node.getContext("webgl");
            const pixels = new Uint8Array(
              gl.drawingBufferWidth * gl.drawingBufferHeight * 4,
            );
            gl.readPixels(
              0,
              0,
              gl.drawingBufferWidth,
              gl.drawingBufferHeight,
              gl.RGBA,
              gl.UNSIGNED_BYTE,
              pixels,
            );
            let painted = 0;
            const stride = Math.max(4, Math.floor(pixels.length / 16000) * 4);
            for (let index = 0; index < pixels.length; index += stride)
              if (pixels[index + 3] > 80) painted++;
            return painted;
          }),
        )
        .toBeGreaterThan(30);
      await page.keyboard.press("Escape");
      await expect(page.locator(".listening-room")).toHaveCount(0);
      await expect(action).toBeFocused();
      expect(
        Math.abs((await page.evaluate(() => scrollY)) - scrollBefore),
      ).toBeLessThan(3);
      await noOverflow(page);
      expect(errors).toEqual([]);
      results.push(
        `${label}px: composition, four synchronized slides, stable geometry, keyboard${width <= 768 ? "/touch" : ""}, lightbox, focus and conversation action passed`,
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
