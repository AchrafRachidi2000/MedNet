import { test, expect } from "@playwright/test";

test("updated FX step opens with its actual inpatient-only service explanation", async ({
  page,
}) => {
  const catalog = await (await page.request.get("/api/catalog")).json();
  const fx = catalog.nodes.find((node) => node.name.startsWith("C-03"));
  expect(fx).toBeTruthy();
  await page.goto("/#view=map&node=" + fx.id);
  await expect(page.locator("#inspector")).toBeVisible();
  await expect(page.locator("#inspector")).toContainText("OANDA");
  await expect(page.locator("#inspector")).toContainText(
    "sends zero for missing foreign-currency rates",
  );
  await expect(page.locator(".graph-node")).toHaveCount(88);
  await page.screenshot({
    path: "test-results/updated-fx-node.png",
    fullPage: false,
  });
});
