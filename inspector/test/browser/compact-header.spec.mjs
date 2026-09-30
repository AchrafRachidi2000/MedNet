import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const width of [1920, 1512, 1280, 800]) {
  test(`compact header gives the workflow more space at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 982 });
    await page.goto("/#audience=technical&phase=intake");
    const canvas = page.locator("#graph-viewport");
    await expect(page.locator(".graph-node").first()).toBeVisible();
    const before = await canvas.boundingBox();
    expect(before.y).toBeLessThanOrEqual(width > 1100 ? 112 : 155);
    expect(before.height).toBeGreaterThan(width > 1100 ? 860 : 825);
    await expect(page.locator(".brand,.brand-mark,.map-brand")).toHaveCount(0);
    await expect(page.locator(".topbar")).toBeHidden();
    await expect(page.locator(".map-toolbar")).toBeHidden();
    await expect(page.locator(".map-legend")).toBeHidden();
    await page.getByRole("button", { name: "Map key and context" }).click();
    await expect(
      page.getByRole("region", { name: "Map key and context" }),
    ).toBeVisible();
    await expect(page.locator(".map-legend")).toContainText(
      "scenario setup hidden",
    );
    expect(await canvas.boundingBox()).toEqual(before);
    await page.keyboard.press("Escape");
    await expect(page.locator(".map-legend")).toBeHidden();
    await expect(
      page.getByRole("button", { name: "Map key and context" }),
    ).toBeFocused();
    await expect(
      page.getByRole("button", { name: "Fit phase", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    await page.screenshot({ path: `test-results/compact-header-${width}.png` });
  });
}

test("compact header keeps search and map help available with accessible key navigation", async ({
  page,
}) => {
  await page.goto("/#audience=technical");
  await expect(page.locator("#search")).toBeVisible();
  await page.keyboard.press("/");
  await expect(page.locator("#search")).toBeFocused();
  await page.locator("#search").fill("A-05");
  await expect(page.locator(".map-match-count")).toBeVisible();
  await page.getByRole("button", { name: "Clear map search" }).click();
  await expect(page.locator(".map-toolbar")).toBeHidden();
  await page.getByRole("button", { name: "Map key and context" }).click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: "Close map key" }).click();
  await page
    .getByRole("button", { name: "How to read this map", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Open terminology guide" }).click();
  await expect(page.getByRole("dialog")).toContainText("NIGO");
});

test("phone map key opens from controls without taking space away from the canvas", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#audience=business");
  await expect(page.locator(".graph-node").first()).toBeVisible();
  const canvas = page.locator("#graph-viewport");
  const before = await canvas.boundingBox();
  await page.getByRole("button", { name: "Map controls", exact: true }).click();
  await page.getByRole("button", { name: "Map key and context" }).click();
  await expect(page.locator("#map-controls")).toBeHidden();
  await expect(page.locator(".map-legend")).toBeInViewport();
  expect(await canvas.boundingBox()).toEqual(before);
  await page.getByRole("button", { name: "Close map key" }).click();
  await expect(
    page.getByRole("button", { name: "Map controls", exact: true }),
  ).toBeFocused();
});
