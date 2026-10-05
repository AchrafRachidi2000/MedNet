import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const highlighted = (page) =>
  page
    .locator(".graph-edge.arrival-path")
    .evaluateAll((paths) => paths.map((p) => p.dataset.edge).sort());
const intake = "70559819-ff17-4bf5-a5f3-ad83c81e059b";
const sharedExit = "22a9fad3-cb6b-4975-aa68-152174b08c16";
const intakeExitEdge = "b51b5a31-f082-4f00-bbd1-68c38467348a";

test("data mapping navigation uses declared mapping paths and clears on mode change", async ({
  page,
}) => {
  const catalog = await (await page.request.get("/api/catalog")).json();
  const layout = await (await page.request.get("/api/layout")).json();
  const byId = new Map(catalog.nodes.map((node) => [node.id, node]));
  const edges = layout.phases.intake.data.edges;
  const edge = edges.find((e) => byId.get(e.target).stage !== "intake");
  const target = byId.get(edge.target);
  const expected = edges
    .filter(
      (e) =>
        (e.source === target.id || e.target === target.id) &&
        (byId.get(e.source).stage === "intake" ||
          byId.get(e.target).stage === "intake"),
    )
    .map((e) => e.id)
    .sort();
  await page.goto("/#audience=technical&phase=intake");
  await page
    .getByRole("combobox", { name: "Connection type" })
    .selectOption("data");
  await page.getByRole("button", { name: "Fit map to view" }).click();
  await page.locator(`[data-boundary-node="${target.id}"]`).click();
  await expect(page).toHaveURL(new RegExp(`phase=${target.stage}`));
  expect(await highlighted(page)).toEqual(expected);
  await page
    .getByRole("combobox", { name: "Connection type" })
    .selectOption("control");
  expect(await highlighted(page)).toEqual([]);
  await expect(page.locator(".phase-arrival")).toHaveCount(0);
});

for (const via of ["connected card", "arrow", "inspector link"]) {
  test(`technical intake → shared exits retains the exact arrival path via ${via}`, async ({
    page,
  }) => {
    await page.goto(
      `/#audience=technical&phase=intake${via === "inspector link" ? `&node=${intake}` : ""}`,
    );
    await expect(page.locator(".graph-node").first()).toBeVisible();
    const zoom = await page
      .locator("#graph-viewport")
      .getAttribute("data-camera-zoom");
    if (via === "connected card")
      await page.locator(`[data-boundary-node="${sharedExit}"]`).click();
    else if (via === "arrow") {
      await page.locator(`.graph-edge[data-edge="${intakeExitEdge}"]`).focus();
      await page.keyboard.press("Enter");
    } else
      await page
        .locator(`#inspector [data-select="${sharedExit}"]`)
        .first()
        .click();
    await expect(page).toHaveURL(/phase=handoff/);
    await expect(page.locator(".phase-arrival")).toContainText(
      "From Receive the claim",
    );
    await expect(page.locator(".phase-arrival")).toContainText(
      "EXIT-02 - Intake Checkpoint → EXIT-01 - Exit Rail",
    );
    expect(await highlighted(page)).toEqual([intakeExitEdge]);
    await expect(page.locator(".graph-node.arrival-node")).toHaveCount(2);
    if (via !== "connected card") {
      expect(
        await page.locator("#graph-viewport").getAttribute("data-camera-zoom"),
      ).toBe(zoom);
      await page.getByRole("button", { name: "Close node inspector" }).click();
    }
    const other = page.locator(".graph-edge:not(.arrival-path)").first();
    await other.dispatchEvent("pointerover");
    await other.dispatchEvent("pointerout");
    expect(await highlighted(page)).toEqual([intakeExitEdge]);
    await page.locator(`[data-select="${sharedExit}"]`).first().click();
    await page.getByRole("button", { name: "Close node inspector" }).click();
    expect(await highlighted(page)).toEqual([intakeExitEdge]);
    await page.getByRole("button", { name: "Fit map to view" }).click();
    await page.screenshot({
      path: `test-results/arrival-${via.replaceAll(" ", "-")}.png`,
    });
    if (via === "connected card")
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page
      .getByRole("button", { name: "Clear previous phase highlight" })
      .click();
    await expect(page.locator(".phase-arrival")).toHaveCount(0);
    expect(await highlighted(page)).toEqual([]);
  });
}

for (const audience of ["business", "technical"]) {
  test(`${audience} direct phase tabs highlight only connections to the latest phase`, async ({
    page,
  }) => {
    const data = await (
      await page.request.get(
        audience === "business" ? "/api/business" : "/api/catalog",
      )
    ).json();
    const catalog = audience === "business" ? data.catalog : data;
    const nodes = new Map(catalog.nodes.map((n) => [n.id, n]));
    const expected = (from, to) =>
      catalog.edges
        .filter(
          (e) =>
            (nodes.get(e.source).stage === from &&
              nodes.get(e.target).stage === to) ||
            (nodes.get(e.source).stage === to &&
              nodes.get(e.target).stage === from),
        )
        .map((e) => e.id)
        .sort();
    await page.goto(`/#audience=${audience}&phase=intake`);
    await page.locator('[data-map-stage="handoff"]').click();
    expect(await highlighted(page)).toEqual(expected("intake", "handoff"));
    await expect(page.locator(".phase-arrival")).toHaveAttribute(
      "data-arrival-from",
      "intake",
    );
    await page.locator('[data-map-stage="identity"]').click();
    expect(await highlighted(page)).toEqual(expected("handoff", "identity"));
    await expect(page.locator(".phase-arrival")).toHaveAttribute(
      "data-arrival-from",
      "handoff",
    );
    // Same-phase fit keeps the context; the entire flow clears it.
    await page.locator('[data-map-stage="identity"]').click();
    expect(await highlighted(page)).toEqual(expected("handoff", "identity"));
    await page.locator('[data-map-stage="all"]').click();
    expect(await highlighted(page)).toEqual([]);
    await expect(page.locator(".phase-arrival")).toHaveCount(0);
    await page.locator('[data-map-stage="intake"]').click();
    await page.locator('[data-map-stage="invoices"]').click();
    expect(await highlighted(page)).toEqual(expected("intake", "invoices"));
    await expect(page.locator(".phase-arrival")).toHaveCount(0);
  });
}

test("mobile arrival indicator is visible and can be cleared without moving the map", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#audience=business&phase=intake");
  await page.locator('[data-map-stage="handoff"]').click();
  await expect(page.locator(".phase-arrival")).toBeInViewport();
  const camera = () =>
    page
      .locator("#graph-viewport")
      .evaluate((el) => [
        el.dataset.cameraX,
        el.dataset.cameraY,
        el.dataset.cameraZoom,
      ]);
  const before = await camera();
  await page
    .getByRole("button", { name: "Clear previous phase highlight" })
    .click();
  expect(await camera()).toEqual(before);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
});
