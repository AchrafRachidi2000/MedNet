import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
for (const size of [
  { width: 320, height: 568 },
  { width: 568, height: 320 },
  { width: 915, height: 412 },
]) {
  test(`compact phone ${size.width}×${size.height} keeps controls and reading accessible`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await page.goto("/#audience=business&phase=identity");
    await expect(page.locator(".graph-node").first()).toBeVisible();
    const canvas = await page.locator("#graph-viewport").boundingBox();
    expect(canvas.height).toBeGreaterThan(size.height - 110);
    const active = await page.locator(".map-stages .active").boundingBox();
    expect(active.x).toBeGreaterThanOrEqual(0);
    expect(active.x + active.width).toBeLessThanOrEqual(size.width);
    await page.getByRole("button", { name: "Map controls", exact: true }).tap();
    await page
      .getByRole("button", { name: "Terminology guide", exact: true })
      .tap();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Close dialog" }).tap();
    await page.getByRole("button", { name: "Close map controls" }).tap();
    await page.locator(".graph-node[data-select]").first().tap();
    await page.getByRole("button", { name: "Expand node inspector" }).tap();
    const panel = await page.locator("#inspector").boundingBox();
    expect(panel.x).toBeGreaterThanOrEqual(0);
    expect(panel.x + panel.width).toBeLessThanOrEqual(size.width);
    await page.getByRole("button", { name: "Close node inspector" }).tap();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(size.width);
  });
}
const camera = (page) =>
  page.locator("#graph-viewport").evaluate((el) => ({
    x: +el.dataset.cameraX,
    y: +el.dataset.cameraY,
    zoom: +el.dataset.cameraZoom,
    width: el.clientWidth,
    height: el.clientHeight,
  }));

test("phone controls, phase navigation and rotation preserve a wide usable map", async ({
  page,
}) => {
  await page.goto("/#audience=business");
  await expect(page.locator(".graph-node").first()).toBeVisible();
  expect((await camera(page)).height).toBeGreaterThan(700);
  await expect(page.locator("#map-controls")).toBeHidden();
  await page.getByRole("button", { name: "Map controls", exact: true }).tap();
  await expect(
    page.getByRole("button", { name: "Technical map", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Technical map", exact: true }).tap();
  await expect(
    page.getByRole("combobox", { name: "Connection type" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close map controls" }).tap();
  await page.locator('[data-map-stage="documents"]').tap();
  await expect(
    page.locator(".graph-node[data-boundary-node]").first(),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/phone-portrait.png" });
  const before = await camera(page);
  await page.setViewportSize({ width: 844, height: 390 });
  await expect.poll(async () => (await camera(page)).width).toBe(844);
  // Resize applies the camera correction on the next animation frame, after
  // the viewport dimensions themselves have already changed.
  await expect.poll(async () => {
    const current = await camera(page);
    return current.x + current.width / 2;
  }).toBeCloseTo(before.x + before.width / 2);
  await expect.poll(async () => {
    const current = await camera(page);
    return current.y + current.height / 2;
  }).toBeCloseTo(before.y + before.height / 2);
  const after = await camera(page);
  expect(after.height).toBeGreaterThan(280);
  expect(after.zoom).toBe(before.zoom);
  expect(after.x + after.width / 2).toBeCloseTo(before.x + before.width / 2);
  expect(after.y + after.height / 2).toBeCloseTo(before.y + before.height / 2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    844,
  );
  await page.screenshot({ path: "test-results/phone-landscape.png" });
  await page.getByRole("button", { name: "Fit map to view" }).tap();
  const node = page.locator(".graph-node[data-select]").first();
  const zoom = (await camera(page)).zoom;
  await node.tap();
  await expect(page.locator("#inspector")).toBeVisible();
  expect((await camera(page)).zoom).toBe(zoom);
  const panel = await page.locator("#inspector").boundingBox();
  expect(panel.width).toBeLessThan(500);
  expect(panel.height).toBeGreaterThan(350);
  await page.screenshot({ path: "test-results/phone-landscape-details.png" });
  await page.getByRole("button", { name: "Close node inspector" }).tap();
  await expect(page.locator("#inspector")).toBeHidden();
});

test("real touch drags and pinches navigate without accidentally opening cards", async ({
  page,
  context,
}) => {
  await page.goto("/#audience=business");
  const node = page.locator('.graph-node[data-select="receive"]');
  await expect(node).toBeVisible();
  const session = await context.newCDPSession(page);
  const touch = (type, points) =>
    session.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: points.map(([x, y], id) => ({ x, y, id })),
    });
  const box = await node.boundingBox(),
    x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  const before = await camera(page);
  await touch("touchStart", [[x, y]]);
  for (let i = 1; i <= 8; i++)
    await touch("touchMove", [[x + i * 10, y + i * 12]]);
  await touch("touchEnd", []);
  const dragged = await camera(page);
  expect(dragged.x).toBeCloseTo(before.x - 80);
  expect(dragged.y).toBeCloseTo(before.y - 96);
  await expect(page.locator("#inspector")).toBeHidden();
  const viewport = await page.locator("#graph-viewport").boundingBox();
  const cy = viewport.y + 280;
  await touch("touchStart", [
    [130, cy],
    [250, cy],
  ]);
  for (let i = 1; i <= 6; i++)
    await touch("touchMove", [
      [130 - i * 6, cy],
      [250 + i * 6, cy],
    ]);
  await touch("touchEnd", []);
  const pinched = await camera(page);
  expect(pinched.zoom).toBeCloseTo(dragged.zoom * 1.6);
  expect((pinched.x + 190) / pinched.zoom).toBeCloseTo(
    (dragged.x + 190) / dragged.zoom,
  );
  await expect(page.locator("#inspector")).toBeHidden();
  await page.locator('[data-map-stage="all"]').tap();
  await node.tap();
  await expect(page.locator("#inspector")).toBeVisible();
  await page.screenshot({ path: "test-results/phone-portrait-details.png" });
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
