import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const darkSurface = async (locator) => {
  const rgb = await locator.evaluate(
    (el) => getComputedStyle(el).backgroundColor,
  );
  const channels = rgb
    .match(/[\d.]+/g)
    .slice(0, 3)
    .map(Number);
  expect(
    Math.max(...channels),
    `${rgb} should be a low-luminance surface`,
  ).toBeLessThan(85);
};

test("the full map, controls, help and reader use dark surfaces", async ({
  page,
}) => {
  await page.goto("/#audience=technical&phase=identity");
  await expect(page.locator(".graph-node").first()).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  for (const selector of [
    "body",
    ".topbar",
    ".map-heading",
    ".map-stages",
    ".map-toolbar",
    ".map-legend",
    ".graph-viewport",
    ".graph-node",
    ".minimap",
  ])
    await darkSurface(page.locator(selector).first());
  await page.screenshot({ path: "test-results/dark-technical-map.png" });
  await page
    .getByRole("button", { name: "How to read this map", exact: true })
    .click();
  await darkSurface(page.getByRole("dialog"));
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Business map", exact: true }).click();
  await page.locator('[data-map-stage="review"]').click();
  await page.screenshot({ path: "test-results/dark-business-map.png" });
});

test("member extraction explains numbered actions with individual fact bullets", async ({
  page,
}) => {
  const catalog = await (await page.request.get("/api/catalog")).json();
  const node = catalog.nodes.find((n) => n.name.startsWith("A-05 "));
  await page.goto(`/#audience=technical&phase=identity&node=${node.id}`);
  const panel = page.locator("#inspector");
  await expect(panel).toBeVisible();
  await darkSurface(panel);
  const actions = panel.locator(".numbered-actions > li");
  await expect(actions).toHaveCount(3);
  await expect(actions.first().locator(".action-title")).toHaveText(
    "Read facts from the submitted documents",
  );
  await expect(actions.first().locator(".action-bullets > li")).toHaveText([
    "Member facts",
    "Payer facts",
    "Treatment facts",
    "Bill facts",
    "Provider facts",
    "Payment facts",
    "Bank facts",
  ]);
  expect(
    await actions
      .first()
      .evaluate((el) => getComputedStyle(el, "::marker").content),
  ).toContain('"- "');
  await expect(panel).toContainText(
    "does not perform the authoritative member lookup",
  );
  await expect(actions.first()).toContainText(
    "source of each field and any conflicting readings",
  );
  await page.screenshot({ path: "test-results/dark-member-checklist.png" });
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await panel.locator('[data-detail-section="prompts"] > summary').click();
  await darkSurface(panel.locator(".code-lines").first());
  await page.setViewportSize({ width: 390, height: 844 });
  await panel.locator(".inspector-content").evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.screenshot({ path: "test-results/dark-mobile-checklist.png" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("scenario setup is omitted from the catalog, phase and complete maps", async ({
  page,
}) => {
  const catalog = await (await page.request.get("/api/catalog")).json();
  const harness = { id: "3b5f8697-c9eb-4bcc-8f03-be4bb79005b6" };
  expect(catalog.nodes.some((n) => n.id === harness.id)).toBe(false);
  await page.goto("/#audience=technical&phase=intake");
  await expect(page.locator(".graph-node").first()).toBeVisible();
  await expect(
    page.locator(
      `[data-select="${harness.id}"], [data-boundary-node="${harness.id}"]`,
    ),
  ).toHaveCount(0);
  await expect(
    page.locator('.graph-edge[data-edge^="phase-skip-"]'),
  ).toHaveCount(1);
  await page.screenshot({ path: "test-results/dark-intake-no-harness.png" });
  await page
    .getByRole("combobox", { name: "Connection type" })
    .selectOption("data");
  await expect(
    page.locator(
      `[data-select="${harness.id}"], [data-boundary-node="${harness.id}"]`,
    ),
  ).toHaveCount(0);
  await page.locator('[data-map-stage="all"]').click();
  await expect(page.locator(`[data-select="${harness.id}"]`)).toHaveCount(0);
  await expect(page.locator(".graph-node")).toHaveCount(87);
  await page
    .getByRole("combobox", { name: "Connection type" })
    .selectOption("control");
  await expect(page.locator(`[data-select="${harness.id}"]`)).toHaveCount(0);
  await expect(
    page.locator('.graph-edge[data-edge^="phase-skip-"]'),
  ).toHaveCount(1);
});
