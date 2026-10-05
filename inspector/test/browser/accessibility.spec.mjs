import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("map, node detail, and map help meet automated accessibility checks", async ({
  page,
}) => {
  await page.goto("/#audience=technical");
  await expect(page.locator(".graph-node")).toHaveCount(88);
  for (const surface of ["map", "node", "help"]) {
    if (surface === "node") await page.locator(".graph-node").first().click();
    if (surface === "help")
      await page
        .getByRole("button", { name: "How to read this map", exact: true })
        .click();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    ).toEqual([]);
  }
});
test("business workflow and phase view meet accessibility checks", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".graph-node")).toHaveCount(28);
  for (const phase of ["all", "review"]) {
    if (phase !== "all")
      await page.locator(`.map-stages [data-map-stage="${phase}"]`).click();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    ).toEqual([]);
  }
});
