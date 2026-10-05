import { test, expect } from "@playwright/test";

for (const audience of ["business", "technical"]) {
  test(`${audience} phase links name the actual connected steps and their phases`, async ({
    page,
  }) => {
    const data = await (
      await page.request.get(
        audience === "business" ? "/api/business" : "/api/catalog",
      )
    ).json();
    const catalog = audience === "business" ? data.catalog : data;
    const layouts =
      audience === "business"
        ? data.phases
        : (await (await page.request.get("/api/layout")).json()).phases;
    for (const stage of catalog.stages) {
      await page.goto(`/#audience=${audience}&phase=${stage.id}`);
      const diagram = layouts[stage.id].control;
      const boundaries = diagram.nodes.filter((n) => n.isBoundary);
      await expect(page.locator(".phase-boundary")).toHaveCount(
        boundaries.length,
      );
      for (const boundary of boundaries) {
        const node = catalog.nodes.find((n) => n.id === boundary.id);
        const phase = catalog.stages.find((s) => s.id === node.stage);
        const card = page.locator(`[data-boundary-node="${node.id}"]`);
        await expect(card.locator(":scope > strong")).toHaveText(node.title);
        await expect(card.locator(".node-description")).toHaveText(
          node.summary,
        );
        await expect(card.locator(".boundary-phase")).toHaveText(phase.name);
        await expect(card).toHaveAttribute("data-open-phase", phase.id);
        const incoming = diagram.edges.some((e) => e.source === node.id);
        const outgoing = diagram.edges.some((e) => e.target === node.id);
        await expect(card.locator(".business-card-kind")).toHaveText(
          incoming && outgoing
            ? "Connected step"
            : incoming
              ? "Previous step"
              : "Next step",
        );
        if (audience === "technical")
          await expect(card.locator(".boundary-code")).not.toBeEmpty();
      }
    }
    await page.goto(`/#audience=${audience}&phase=documents`);
    await page.screenshot({
      path: `test-results/${audience}-connected-steps.png`,
    });
    const card = page.locator(".phase-boundary").first();
    const targetPhase = await card.getAttribute("data-open-phase");
    await card.click();
    await expect(page).toHaveURL(new RegExp(`phase=${targetPhase}`));
  });
}
test("business map uses plain-language steps and opens individual phase workflows", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Business workflow", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".graph-node")).toHaveCount(28);
  await expect(page.locator(".graph-edge")).toHaveCount(42);
  await expect(page.locator(".graph-node .node-code")).toHaveCount(0);
  await expect(page.locator("#edge-mode")).toBeHidden();
  await expect(page.locator(".stage-cluster")).not.toHaveCount(0);
  await page.getByRole("button", { name: "Fit map to view" }).click();
  await page.screenshot({ path: "test-results/business-overview.png" });
  await page.locator('.map-stages [data-map-stage="review"]').click();
  await expect(
    page.getByRole("heading", { name: "Check documentation", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".graph-node:not(.phase-boundary)")).toHaveCount(3);
  await expect(page.locator(".phase-boundary")).not.toHaveCount(0);
  await page.screenshot({ path: "test-results/business-phase-review.png" });
  await page.locator('.graph-node[data-select="human-review"]').click();
  await expect(page.locator("#inspector")).toContainText("What comes in");
  await expect(page.locator("#inspector [role=tab]")).toHaveCount(0);
  await expect(page.locator("#inspector")).not.toContainText("OPR-01");
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.locator(".graph-node:not(.phase-boundary)")).toHaveCount(3);
  await page.locator('.map-stages [data-map-stage="all"]').click();
  await expect(page.locator(".graph-node")).toHaveCount(28);
  expect(errors).toEqual([]);
});
test("technical cards explain every node and selection preserves the exact camera", async ({
  page,
}) => {
  await page.goto("/#audience=technical");
  await expect(page.locator(".graph-node .node-description")).toHaveCount(88);
  const capture = () =>
    page.locator("#graph-viewport").evaluate((el) => ({
      left: Number(el.dataset.cameraX),
      top: Number(el.dataset.cameraY),
      zoom: document.querySelector("#zoom-value").textContent,
    }));
  const before = await capture();
  await page.locator(".graph-node").first().click();
  expect(await capture()).toEqual(before);
  await page.keyboard.press("Escape");
  await page.locator('.map-stages [data-map-stage="documents"]').click();
  await expect(page.locator(".graph-node:not(.phase-boundary)")).toHaveCount(6);
  await page.screenshot({ path: "test-results/technical-phase-documents.png" });
  await expect(
    page.locator(".stage-cluster:not(.stage-documents)"),
  ).toHaveCount(0);
  await page.locator(".phase-boundary").first().click();
  await expect(page).not.toHaveURL(/phase=documents/);
  await page.getByRole("button", { name: "Business map", exact: true }).click();
  await expect(page.locator(".graph-node")).toHaveCount(28);
});
