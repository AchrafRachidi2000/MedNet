import { test, expect } from "@playwright/test";

for (const audience of ["technical", "business"]) {
  test(`${audience} arrows navigate to their destination without changing zoom`, async ({
    page,
  }) => {
    const data = await (
      await page.request.get(
        audience === "technical" ? "/api/layout" : "/api/business",
      )
    ).json();
    const diagram = audience === "technical" ? data.control : data.layout;
    const route = diagram.edges[0];
    await page.goto(`/#audience=${audience}`);
    await expect(page.locator(".graph-edge")).toHaveCount(diagram.edges.length);
    const zoom = await page.locator("#zoom-value").textContent();
    await page
      .locator(`.edge-hit[data-edge="${route.id}"]`)
      .dispatchEvent("click");
    await expect(page.locator("#inspector")).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`node=${route.target}`));
    await expect(page.locator("#zoom-value")).toHaveText(zoom);
    await expect(
      page.locator(`.graph-node[data-select="${route.target}"]`),
    ).toBeInViewport();
    await page.keyboard.press("Escape");
    const arrow = page.locator(`.graph-edge[data-edge="${route.id}"]`);
    await arrow.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#inspector")).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`node=${route.target}`));
    await expect(page.locator("#zoom-value")).toHaveText(zoom);
  });
}
test("branch paths are labeled, selectable and navigable without hiding nodes", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const c = await (await page.request.get("/api/catalog")).json();
  const source = c.nodes.find((n) => n.name.startsWith("R-04B"));
  const route = c.edges.find(
    (e) => e.source === source.id && e.label === "has_both = true",
  );
  await page.goto("/#audience=technical");
  await page
    .getByRole("textbox", { name: "Search nodes prompts fields or code" })
    .fill(source.name);
  await expect(page.locator(".search-match")).toHaveCount(1);
  await page.getByRole("button", { name: "Clear map search" }).click();
  await page.getByRole("button", { name: "Zoom out", exact: true }).click();
  await expect(
    page.locator(".stage-band, .graph-col-label, [data-scope]"),
  ).toHaveCount(0);
  await expect(page.locator(".graph-node")).toHaveCount(88);
  const label = page.locator(`.edge-label[data-edge="${route.id}"]`);
  // Pan the unlimited canvas to the route label; there is no native scrollbar
  // to automatically scroll an off-canvas element into view anymore.
  const labelBox = await label.boundingBox();
  const canvasBox = await page.locator("#graph-viewport").boundingBox();
  await page.locator("#graph-viewport").dispatchEvent("wheel", {
    deltaX: labelBox.x + labelBox.width / 2 - canvasBox.x - canvasBox.width / 2,
    deltaY:
      labelBox.y + labelBox.height / 2 - canvasBox.y - canvasBox.height / 2,
  });
  await label.click();
  await expect(page.locator("#edge-description")).toContainText(
    "has_both = true",
  );
  await expect(page.locator(".graph-node.path-endpoint")).toHaveCount(2);
  await expect(page.locator(".graph-edge.path-highlight")).toHaveCount(1);
  await page.screenshot({ path: "test-results/clinical-branch.png" });
  await page
    .locator(`#edge-description [data-select="${route.target}"]`)
    .click();
  await expect(page.locator("#inspector")).toContainText("IP Medical Coding");
  await expect(page.locator(".graph-node")).toHaveCount(88);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Go to start", exact: true }).click();
  await expect(
    page
      .locator(".graph-node")
      .filter({ hasText: "Claim Submission" }),
  ).toBeInViewport();
  expect(errors).toEqual([]);
});
