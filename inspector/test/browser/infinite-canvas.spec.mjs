import { test, expect } from "@playwright/test";

const camera = (page) =>
  page.locator("#graph-viewport").evaluate((el) => ({
    x: Number(el.dataset.cameraX),
    y: Number(el.dataset.cameraY),
    zoom: Number(el.dataset.cameraZoom),
  }));

test("keyboard focus brings an off-canvas connection into view without zooming", async ({
  page,
}) => {
  await page.goto("/#audience=business");
  const canvas = page.locator("#graph-viewport");
  await expect(canvas).toHaveAttribute("data-camera-x", /.+/);
  await canvas.dispatchEvent("wheel", { deltaX: -10000, deltaY: -10000 });
  const before = await camera(page);
  await canvas.focus();
  await page.keyboard.press("Tab");
  const after = await camera(page);
  expect(after.zoom).toBe(before.zoom);
  expect(after.x).toBeGreaterThan(before.x + 5000);
  await expect(page.locator(".graph-edge").first()).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#inspector")).toBeVisible();
});

for (const audience of ["business", "technical"]) {
  test(`${audience} canvas pans beyond every workflow boundary and can recover`, async ({
    page,
  }) => {
    await page.goto(`/#audience=${audience}&phase=documents`);
    const canvas = page.locator("#graph-viewport");
    await expect(canvas).toHaveAttribute("data-camera-x", /.+/);
    const before = await camera(page);
    await canvas.dispatchEvent("wheel", {
      deltaX: -100000,
      deltaY: -100000,
      deltaMode: 0,
    });
    expect((await camera(page)).x).toBeCloseTo(before.x - 100000);
    expect((await camera(page)).y).toBeCloseTo(before.y - 100000);
    await expect(page.locator("#minimap-label")).toContainText("Outside map");
    await canvas.dispatchEvent("wheel", {
      deltaX: 200000,
      deltaY: 200000,
      deltaMode: 0,
    });
    expect((await camera(page)).x).toBeCloseTo(before.x + 100000);
    expect((await camera(page)).y).toBeCloseTo(before.y + 100000);
    // No giant scrollable DOM is being used to fake an unlimited canvas.
    expect(await canvas.evaluate((el) => getComputedStyle(el).overflow)).toBe(
      "clip",
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(1512);
    await canvas.focus();
    await page.keyboard.press("ArrowLeft");
    expect((await camera(page)).x).toBeCloseTo(before.x + 100000 - 80);
    await page.keyboard.press("Home");
    await expect(page.locator("#minimap-label")).toHaveText("Flow overview");
    for (const card of await page.locator(".graph-node").all())
      await expect(card).toBeInViewport();
    await canvas.dispatchEvent("wheel", { deltaX: -100000, deltaY: -100000 });
    const mini = page.locator("#minimap");
    const box = await mini.boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    expect(Math.abs((await camera(page)).x)).toBeLessThan(10000);
    await page.getByRole("button", { name: "Fit map to view" }).click();
    await page.screenshot({
      path: `test-results/${audience}-infinite-canvas.png`,
    });
  });
}

test("dragging and pointer-anchored zoom work in negative empty space", async ({
  page,
}) => {
  await page.goto("/#audience=business");
  const canvas = page.locator("#graph-viewport");
  await expect(canvas).toHaveAttribute("data-camera-x", /.+/);
  await canvas.dispatchEvent("wheel", { deltaX: -10000, deltaY: -10000 });
  const b = await canvas.boundingBox();
  const before = await camera(page);
  await page.mouse.move(b.x + 120, b.y + 120);
  await page.mouse.down();
  await page.mouse.move(b.x + 420, b.y + 320, { steps: 8 });
  await page.mouse.up();
  const after = await camera(page);
  expect(after.x).toBeCloseTo(before.x - 300);
  expect(after.y).toBeCloseTo(before.y - 200);
  await expect(canvas).not.toHaveClass(/panning/);
  await canvas.evaluate((el) =>
    el.addEventListener(
      "wheel",
      (event) => {
        const box = el.getBoundingClientRect();
        el.dataset.wheelX = event.clientX - box.x;
        el.dataset.wheelY = event.clientY - box.y;
      },
      { once: true },
    ),
  );
  await page.keyboard.down("Control");
  await page.mouse.wheel(0, -100);
  await page.keyboard.up("Control");
  await expect
    .poll(async () => (await camera(page)).zoom)
    .toBeGreaterThan(after.zoom);
  const zoomed = await camera(page);
  const point = await canvas.evaluate((el) => ({
    x: Number(el.dataset.wheelX),
    y: Number(el.dataset.wheelY),
  }));
  const world = {
    x: (after.x + point.x) / after.zoom,
    y: (after.y + point.y) / after.zoom,
  };
  expect((zoomed.x + point.x) / zoomed.zoom).toBeCloseTo(world.x);
  expect((zoomed.y + point.y) / zoomed.zoom).toBeCloseTo(world.y);
  await page.getByRole("button", { name: "Go to start", exact: true }).click();
  await expect(
    page.locator('.graph-node[data-select="receive"]'),
  ).toBeInViewport();
});
