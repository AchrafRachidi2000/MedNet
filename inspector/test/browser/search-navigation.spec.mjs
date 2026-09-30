import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("search shows 1/3 and cycles accurately in both directions without changing zoom", async ({
  page,
}) => {
  const { catalog } = await (await page.request.get("/api/business")).json();
  const matches = catalog.nodes
    .filter((n) => n.searchText.includes("translation"))
    .sort((a, b) => a.order - b.order);
  expect(matches).toHaveLength(3);
  await page.goto("/#audience=business");
  await page.locator("#search").fill("translation");
  const counter = page.locator(".map-match-count");
  await expect(counter).toHaveText("1/3");
  const check = async (index) => {
    await expect(counter).toHaveText(`${index + 1}/3`);
    await expect(page.locator(".search-current")).toHaveCount(1);
    await expect(page.locator(".search-current")).toHaveAttribute(
      "data-select",
      matches[index].id,
    );
    await expect(page.locator(".search-current")).toHaveAttribute(
      "aria-current",
      "true",
    );
    await expect(page.locator(".search-current")).toBeInViewport();
  };
  await check(0);
  const zoom = await page
    .locator("#graph-viewport")
    .getAttribute("data-camera-zoom");
  await page.getByRole("button", { name: "Next match", exact: true }).click();
  await check(1);
  await page.getByRole("button", { name: "Next match", exact: true }).click();
  await check(2);
  await page.getByRole("button", { name: "Next match", exact: true }).click();
  await check(0);
  await page
    .getByRole("button", { name: "Previous match", exact: true })
    .click();
  await check(2);
  await page
    .getByRole("button", { name: "Previous match", exact: true })
    .click();
  await check(1);
  expect(
    await page.locator("#graph-viewport").getAttribute("data-camera-zoom"),
  ).toBe(zoom);
  await expect(page.locator("#inspector")).toBeHidden();
  await page.screenshot({ path: "test-results/search-position.png" });
  await page.locator("#search").fill("lookup");
  await expect(counter).toHaveText("1/3");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("search counts connected steps consistently and handles empty and single results", async ({
  page,
}) => {
  await page.goto("/#audience=technical&phase=intake");
  await page.locator("#search").fill("Handle shared exits");
  await expect(page.locator(".map-match-count")).toHaveText("1/1");
  await expect(page.locator(".search-current")).toHaveClass(/phase-boundary/);
  await expect(page.locator(".search-current")).toBeInViewport();
  await expect(
    page.getByRole("button", { name: "Previous match", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Next match", exact: true }),
  ).toBeDisabled();
  await page.locator("#search").fill("not-a-workflow-match-xyz");
  await expect(page.locator(".map-match-count")).toHaveText("0/0");
  await expect(page.locator(".search-current")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Next match", exact: true }),
  ).toBeDisabled();
  await page.locator("#search").fill("   ");
  await expect(page.locator(".map-toolbar")).toBeHidden();
  await expect(
    page.locator(".search-match,.search-dimmed,.search-current"),
  ).toHaveCount(0);
});

test("phone search keeps Previous, Next and position together without overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/#audience=business");
  await page.getByRole("button", { name: "Map controls", exact: true }).click();
  await page.locator("#search").fill("translation");
  await expect(page.locator(".map-match-count")).toHaveText("1/3");
  await page.getByRole("button", { name: "Close map controls" }).click();
  await page.getByRole("button", { name: "Next match", exact: true }).click();
  await expect(page.locator(".map-match-count")).toHaveText("2/3");
  await page
    .getByRole("button", { name: "Previous match", exact: true })
    .click();
  await expect(page.locator(".map-match-count")).toHaveText("1/3");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    320,
  );
});

test("business intake reads forward with a straight main sequence and short branch connectors", async ({
  page,
}) => {
  const { phases } = await (await page.request.get("/api/business")).json();
  const diagram = phases.intake.control;
  const byId = new Map(diagram.nodes.map((n) => [n.id, n]));
  const first = byId.get("receive"),
    second = byId.get("intake-ready");
  expect(second.x).toBeGreaterThan(first.x + first.width);
  expect(Math.abs(first.y - second.y)).toBeLessThanOrEqual(first.height / 2);
  for (const edge of diagram.edges) {
    const source = byId.get(edge.source),
      target = byId.get(edge.target);
    expect(target.x).toBeGreaterThan(source.x);
    for (const section of edge.sections) {
      const points = [
        section.startPoint,
        ...(section.bendPoints || []),
        section.endPoint,
      ];
      for (let i = 1; i < points.length; i++)
        expect(points[i].x).toBeGreaterThanOrEqual(points[i - 1].x);
    }
  }
  await page.goto("/#audience=business&phase=intake");
  await expect(page.locator(".graph-node")).toHaveCount(4);
  await page.screenshot({ path: "test-results/straight-business-intake.png" });
});
