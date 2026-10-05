import { test, expect } from "@playwright/test";
test("map is the wide default workspace with on-demand overlay details", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/#audience=technical");
  await expect(
    page.getByRole("heading", { name: "Claim workflow" }),
  ).toBeVisible();
  await expect(page.locator(".graph-node")).toHaveCount(88);
  await expect(page.locator(".graph-edge")).toHaveCount(111);
  await expect(page.locator("#inspector")).toBeHidden();
  const before = await page.locator("#graph-viewport").boundingBox();
  expect(before.width).toBeGreaterThan(1400);
  expect(before.height).toBeGreaterThan(720);
  await page.screenshot({ path: "test-results/map-first-desktop.png" });
  await page.locator(".graph-node").first().click();
  await expect(page.locator("#inspector")).toBeVisible();
  const after = await page.locator("#graph-viewport").boundingBox();
  expect(after.width).toBe(before.width);
  await page.screenshot({ path: "test-results/map-inspector-overlay.png" });
  await page.keyboard.press("Escape");
  await expect(page.locator("#inspector")).toBeHidden();
  await page.getByRole("button", { name: "Fit map to view" }).click();
  await expect(page.locator("#zoom-value")).not.toHaveText("85%");
  await page.screenshot({ path: "test-results/map-entire-flow.png" });
  await page.locator('.map-stages [data-map-stage="clinical"]').click();
  await expect(page.locator(".graph-node:not(.phase-boundary)")).toHaveCount(
    14,
  );
  await page.locator('.map-stages [data-map-stage="all"]').click();
  await page
    .getByRole("textbox", { name: "Search nodes prompts fields or code" })
    .fill("A-08 - Completeness Check");
  await expect(page.locator(".graph-node.search-match")).toHaveCount(1);
  await expect(page.locator(".graph-node")).toHaveCount(88);
  await page.getByRole("button", { name: "Clear map search" }).click();
  const canvas = page.locator("#graph-viewport");
  const zoom = await page.locator("#zoom-value").textContent();
  await canvas.hover();
  await page.keyboard.down("Control");
  await page.mouse.wheel(0, -100);
  await page.keyboard.up("Control");
  await expect(page.locator("#zoom-value")).not.toHaveText(zoom);
  expect(errors).toEqual([]);
});
test("map remains usable on a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#audience=technical");
  await expect(page.locator(".graph-node")).toHaveCount(88);
  await expect(page.locator("#inspector")).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  const canvas = await page.locator("#graph-viewport").boundingBox();
  expect(canvas.height).toBeGreaterThan(450);
  await page.screenshot({ path: "test-results/map-mobile.png" });
  await page
    .getByRole("button", { name: "How to read this map", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.locator(".graph-node").first().click();
  await expect(page.locator("#inspector")).toBeVisible();
  await page.getByRole("button", { name: "Close node inspector" }).click();
  await expect(page.locator("#inspector")).toBeHidden();
});
