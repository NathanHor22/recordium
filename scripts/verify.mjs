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
const failures = [];
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
page.on("pageerror", (error) => failures.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") failures.push(message.text());
});

async function rendered() {
  await page.locator("canvas").waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2600);
}

async function pixels() {
  return page.locator("canvas").evaluate((canvas) => {
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
    let hash = 0;
    const samples = [];
    for (let index = 0; index < buffer.length; index += 68) {
      if (buffer[index + 3] > 80) painted++;
      hash = ((hash << 5) - hash + buffer[index] + buffer[index + 1] * 3) | 0;
      samples.push(
        buffer[index],
        buffer[index + 1],
        buffer[index + 2],
        buffer[index + 3],
      );
    }
    return {
      painted,
      hash,
      width: canvas.width,
      height: canvas.height,
      samples,
    };
  });
}

async function noOverflow() {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBeTruthy();
}

try {
  await page.goto(baseURL);
  await rendered();
  const homePixels = await pixels();
  expect(homePixels.painted).toBeGreaterThan(1000);
  await noOverflow();
  await page.screenshot({ path: `${output}/home-desktop.png`, fullPage: true });
  console.log("Desktop collection rendered:", {
    painted: homePixels.painted,
    width: homePixels.width,
    height: homePixels.height,
  });

  if (!process.argv.includes("--screens-only")) {
    await page
      .locator(".collection-scene canvas")
      .click({ position: { x: 390, y: 180 } });
    await expect(page).toHaveURL(/edition\/intro/);
    await rendered();
    await page.screenshot({
      path: `${output}/edition-desktop.png`,
      fullPage: true,
    });
    const movingA = await pixels();
    await page.waitForTimeout(450);
    const movingB = await pixels();
    expect(movingA.hash).not.toBe(movingB.hash);
    await page.getByRole("button", { name: "Pause record rotation" }).click();
    await page.waitForTimeout(2000);
    const pausedA = await pixels();
    await page.waitForTimeout(450);
    const pausedB = await pixels();
    const pausedDifference =
      pausedA.samples.reduce(
        (total, value, index) =>
          total + Math.abs(value - pausedB.samples[index]),
        0,
      ) / pausedA.samples.length;
    console.log("Paused pixel difference:", pausedDifference);
    expect(pausedDifference).toBeLessThan(1);
    console.log("Turntable renders, moves, and pauses.");
    await page.getByRole("button", { name: /02 What work asks of us/ }).click();
    await expect(
      page.getByText("When machines can do the execution, what do we bring?"),
    ).toBeVisible();
    await page
      .getByRole("button", { name: /Jordan Student approaching graduation/ })
      .click();
    await expect(
      page.getByRole("dialog", { name: "Jordan's record" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.locator(".skip-link").focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/edition\/intro/);

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
        "Building a small team and exploring how AI changes the way we share decisions.",
      );
    await page.getByRole("checkbox").check();
    await page.screenshot({
      path: `${output}/invitation-desktop.png`,
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Request an invitation", exact: true })
      .last()
      .click();
    await expect(page.getByText("A place to begin.")).toBeVisible();
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await page.getByRole("link", { name: "Curator workspace" }).click();
    await expect(
      page.getByRole("heading", { name: "The Work After AI" }),
    ).toBeVisible();
    await page.getByLabel("Search applicants").fill("Prototype Test Applicant");
    await page
      .getByRole("button", { name: "Prototype Test Applicant", exact: true })
      .click();
    await page
      .getByLabel("Curator notes")
      .fill("Relevant perspective. Review for the next conversation.");
    await page.getByRole("button", { name: "Save notes" }).click();
    await expect(page.getByRole("status")).toContainText("Notes saved");
    await page.getByRole("button", { name: "Preview invitation" }).click();
    await expect(
      page.getByText("Invitation preview", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Mark invited" }).click();
    await page.getByRole("button", { name: "Confirm seat manually" }).click();
    await expect(page.getByRole("status")).toContainText("Seat confirmed");
    await page
      .getByRole("button", { name: "Close applicant", exact: true })
      .click();
    await page.getByRole("button", { name: "Clear search" }).click();
    await page.screenshot({
      path: `${output}/admin-desktop.png`,
      fullPage: true,
    });
    await page.reload();
    await page.getByLabel("Search applicants").fill("Prototype Test Applicant");
    await expect(page.locator("tbody")).toContainText("Confirmed");
    console.log(
      "Invitation -> review -> notes -> invitation preview -> confirmed -> persistence passed.",
    );
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseURL);
  await rendered();
  await noOverflow();
  expect((await pixels()).painted).toBeGreaterThan(1000);
  await page.screenshot({ path: `${output}/home-mobile.png`, fullPage: true });
  await page.getByRole("button", { name: /UPCOMING CONVERSATION/ }).click();
  await rendered();
  await noOverflow();
  await page.screenshot({
    path: `${output}/edition-mobile.png`,
    fullPage: true,
  });
  await page.locator(".header-request").click();
  await noOverflow();
  await page.screenshot({
    path: `${output}/invitation-mobile.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Close invitation request" }).click();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: "The idea", exact: false }).click();
  await expect(
    page.getByRole("heading", { name: /GOOD QUESTIONS/ }),
  ).toBeVisible();
  await noOverflow();
  await page.goto(`${baseURL}/#/admin`);
  await page.getByRole("heading", { name: "The Work After AI" }).waitFor();
  await noOverflow();
  await page.screenshot({ path: `${output}/admin-mobile.png`, fullPage: true });
  console.log(
    "Mobile collection, edition, invitation, navigation and dashboard passed.",
  );

  for (const viewport of [
    { width: 320, height: 740 },
    { width: 768, height: 1024 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(baseURL);
    await rendered();
    await noOverflow();
    expect((await pixels()).painted).toBeGreaterThan(500);
    await page.screenshot({
      path: `${output}/home-${viewport.width}.png`,
      fullPage: false,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${baseURL}/#/edition/intro`);
  await rendered();
  const reducedA = await pixels();
  await page.waitForTimeout(450);
  const reducedB = await pixels();
  expect(reducedA.hash).toBe(reducedB.hash);
  expect(failures).toEqual([]);
  console.log("Reduced motion passed. No JavaScript or console errors.");
} finally {
  await browser.close();
}
