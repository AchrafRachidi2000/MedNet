import { test, expect } from "@playwright/test";
async function openCompleteness(page) {
  const response = await page.request.get("/api/catalog");
  const catalog = await response.json();
  const node = catalog.nodes.find((n) => n.name.startsWith("A-08"));
  await page.goto("/#view=map&node=" + node.id);
  await expect(page.locator("#inspector")).toBeVisible();
}
test("map node details preserve exact prompts, nested contracts and field tracing", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await openCompleteness(page);
  await expect(
    page.getByRole("heading", { name: "Claim workflow", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".graph-node")).toHaveCount(87);
  await expect(page.locator("#inspector")).toContainText(
    "A-08 - Completeness Check",
  );
  await page.screenshot({
    path: "test-results/node-detail-desktop.png",
    fullPage: false,
  });
  await page.locator('[data-detail-section="prompts"] > summary').click();
  await expect(page.locator("#prompt-content")).toContainText(
    "DOC MATRIX GROUND TRUTH",
  );
  await page
    .getByRole("textbox", { name: "Find in prompt" })
    .fill("FINAL AUTHORITY");
  await expect(page.locator(".line-match").first()).toBeVisible();
  await page
    .getByRole("button", { name: "User template", exact: true })
    .click();
  await expect(page.locator("#prompt-content")).toContainText("{{pic_code}}");
  await expect(page.locator(".unresolved-variable").first()).toBeVisible();
  await expect(page.locator("#inspector [role=tab]")).toHaveCount(0);
  await page.locator('[data-field-path="doc_texts"]').click();
  await expect(page.getByRole("dialog")).toContainText(
    "T-02 - Extracted Text Truth",
  );
  await page.locator("[data-trace-source]").first().click();
  await expect(page.getByRole("dialog")).toContainText("Output");
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.keyboard.press("Escape");
  await page.locator('.map-stages [data-map-stage="review"]').click();
  await page.screenshot({
    path: "test-results/node-fields-desktop.png",
    fullPage: false,
  });
  expect(errors).toEqual([]);
});
test("global search finds hidden prompt and code content", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await openCompleteness(page);
  await page.keyboard.press("Escape");
  await page
    .getByRole("textbox", { name: "Search nodes prompts fields or code" })
    .fill("FINAL AUTHORITY");
  await expect(page.locator(".graph-node.search-match")).not.toHaveCount(87);
  await expect(page.locator(".graph-node.search-match")).not.toHaveCount(0);
  await page.getByRole("button", { name: "Clear map search" }).click();
  await page.keyboard.press("Escape");
  await expect(page.locator(".graph-node")).toHaveCount(87);
  await page
    .getByRole("textbox", { name: "Search nodes prompts fields or code" })
    .fill("R-03 - Validate Policy");
  await page
    .getByRole("button", {
      name: "Inspect R-03 - Validate Policy",
      exact: true,
    })
    .click();
  await expect(page.locator(".inspector-label")).toContainText("AI agent");
  await expect(page.locator("#inspector")).toContainText(
    "Assess six policy checks",
  );
  await page.locator('[data-detail-section="prompts"] > summary').click();
  await expect(page.locator("#prompt-content")).toContainText(
    "THE SUBMISSION WINDOW IS AN ATTENTION ITEM",
  );
  await page.reload();
  await expect(page.locator("#prompt-content")).toContainText(
    "THE SUBMISSION WINDOW IS AN ATTENTION ITEM",
  );
  expect(errors).toEqual([]);
});
test("map supports process graph, data lineage, zoom and all-node coverage", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await openCompleteness(page);
  await page.keyboard.press("Escape");
  await expect(
    page.locator("[data-scope], [data-action='focus-map'], .stage-band"),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Claim workflow", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".graph-node")).toHaveCount(87);
  await page
    .getByRole("combobox", { name: "Connection type" })
    .selectOption("data");
  await expect(page.locator(".graph-node")).toHaveCount(87);
  await expect(page.locator(".graph-edge")).toHaveCount(234);
  await page.getByRole("button", { name: "Fit map to view" }).click();
  await page.screenshot({
    path: "test-results/lineage-map.png",
    fullPage: false,
  });
  await expect(page.locator(".graph-node")).toHaveCount(87);
  await page
    .getByRole("combobox", { name: "Connection type" })
    .selectOption("control");
  await expect(page.locator(".graph-edge")).toHaveCount(110);
  await page.locator(".graph-edge").first().dispatchEvent("click");
  await expect(page.locator("#inspector")).toBeVisible();
  expect(errors).toEqual([]);
});
test("map marks unavailable internals and keeps contextual source evidence", async ({
  page,
}) => {
  await page.goto("/#audience=technical");
  await expect(page.locator(".missing-internals")).toHaveCount(6);
  await page
    .getByRole("textbox", { name: "Search nodes prompts fields or code" })
    .fill("SUB-01 Download API-002 Files");
  await expect(page.locator(".graph-node.search-match")).toHaveCount(1);
  await page
    .locator(".graph-node")
    .filter({ hasText: "Internals missing" })
    .first()
    .click();
  await page.locator('[data-detail-section="logic"] > summary').click();
  await expect(page.locator("#inspector")).toContainText(
    "No internal code or prompts are included",
  );
  await page.locator('[data-detail-section="evidence"] > summary').click();
  await expect(page.locator("#inspector")).toContainText("Source locator");
  await page
    .getByRole("button", { name: "How to read this map", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "four external workflows",
  );
  await expect(page.getByRole("dialog")).toContainText("not execution order");
  await page.screenshot({ path: "test-results/map-help.png" });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("removed views resolve to the map with no alternate navigation", async ({
  page,
}) => {
  for (const view of ["directory", "fields", "sources"]) {
    await page.goto("/#view=" + view);
    await expect(page.locator(".graph-node")).toHaveCount(87);
    await expect(page.locator(".sidebar, [data-view]")).toHaveCount(0);
    await expect(page).toHaveURL(/audience=technical/);
  }
});

test("mobile layout and keyboard-accessible terminology", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#audience=technical");
  await expect(
    page.getByRole("heading", { name: "Claim workflow", exact: true }),
  ).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  expect(overflow).toBe(false);
  await page.screenshot({ path: "test-results/mobile.png", fullPage: false });
  await page.setViewportSize({ width: 1512, height: 982 });
  await page.getByRole("button", { name: "Open terminology guide" }).click();
  await expect(page.getByRole("dialog")).toContainText("NIGO");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.keyboard.press("/");
  await expect(
    page.getByRole("textbox", { name: "Search nodes prompts fields or code" }),
  ).toBeFocused();
});
