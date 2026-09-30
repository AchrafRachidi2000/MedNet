import { test, expect } from "@playwright/test";
test("inspector is narrower and expands into a full-height reader without losing its explanation", async ({
  page,
}) => {
  const c = await (await page.request.get("/api/catalog")).json();
  const node = c.nodes.find((n) => n.name.startsWith("ENV-00"));
  await page.goto("/#view=map&node=" + node.id + "&tab=fields");
  const inspector = page.locator("#inspector");
  await expect(inspector).toBeVisible();
  const normal = await inspector.boundingBox();
  expect(normal.width).toBe(560);
  expect(normal.y).toBeLessThanOrEqual(60);
  expect(normal.height).toBeGreaterThan(900);
  expect(
    (await page.locator(".inspector-content").boundingBox()).height,
  ).toBeGreaterThan(430);
  expect(
    await inspector.evaluate((el) => el.scrollHeight <= el.clientHeight + 1),
  ).toBe(true);
  await page.screenshot({ path: "test-results/wider-inspector.png" });
  await page.getByRole("button", { name: "Expand node inspector" }).click();
  const expanded = await inspector.boundingBox();
  expect(expanded.width).toBeGreaterThan(1100);
  expect(expanded.height).toBeGreaterThan(930);
  await expect(page.locator("#inspector [role=tab]")).toHaveCount(0);
  await page.screenshot({ path: "test-results/expanded-inspector.png" });
  await page.getByRole("button", { name: "Restore inspector size" }).click();
  expect((await inspector.boundingBox()).width).toBe(normal.width);
  await page.keyboard.press("Escape");
  await expect(inspector).toBeHidden();
  await expect(page.locator(".graph-node")).toHaveCount(87);
});

for (const audience of ["technical", "business"]) {
  test(`${audience} panel resizes with pointer and keyboard and remembers its width`, async ({
    page,
  }) => {
    await page.goto(`/#audience=${audience}`);
    await page.locator(".graph-node").first().click();
    const panel = page.locator("#inspector");
    const handle = page.getByRole("separator", {
      name: "Resize details panel",
    });
    await expect(page.locator("#inspector [role=tab]")).toHaveCount(0);
    const camera = () =>
      page.locator("#graph-viewport").evaluate((el) => ({
        left: Number(el.dataset.cameraX),
        top: Number(el.dataset.cameraY),
        zoom: document.querySelector("#zoom-value").textContent,
      }));
    const before = await camera();
    await page.locator(".inspector-content").evaluate((el) => {
      el.scrollTop = 40;
    });
    const scroll = await page
      .locator(".inspector-content")
      .evaluate((el) => el.scrollTop);
    const box = await handle.boundingBox();
    await page.mouse.move(box.x + 6, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x - 174, box.y + box.height / 2, { steps: 8 });
    await page.mouse.up();
    expect((await panel.boundingBox()).width).toBe(740);
    expect(await camera()).toEqual(before);
    expect(
      await page.locator(".inspector-content").evaluate((el) => el.scrollTop),
    ).toBe(scroll);
    await expect(page.locator("#inspector [role=tab]")).toHaveCount(0);
    await handle.focus();
    await page.keyboard.press("ArrowRight");
    expect((await panel.boundingBox()).width).toBe(720);
    await expect(handle).toHaveAttribute("aria-valuenow", "720");
    await page.getByRole("button", { name: "Expand node inspector" }).click();
    await expect(handle).toBeHidden();
    await page.getByRole("button", { name: "Restore inspector size" }).click();
    expect((await panel.boundingBox()).width).toBe(720);
    await page.reload();
    await expect(panel).toBeVisible();
    expect((await panel.boundingBox()).width).toBe(720);
    await handle.focus();
    await page.keyboard.press("Home");
    expect((await panel.boundingBox()).width).toBe(420);
    await page.keyboard.press("End");
    expect((await panel.boundingBox()).width).toBe(1000);
    await page.setViewportSize({ width: 800, height: 982 });
    expect((await panel.boundingBox()).width).toBeLessThanOrEqual(752);
    await handle.dblclick();
    expect((await panel.boundingBox()).width).toBe(560);
    await page.setViewportSize({ width: 1512, height: 982 });
    await page.screenshot({
      path: `test-results/resizable-${audience}-panel.png`,
    });
  });
}
test("reader fits smaller screens and keeps close controls available", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#audience=technical");
  await page.locator(".graph-node").first().click();
  const inspector = page.locator("#inspector");
  const normal = await inspector.boundingBox();
  expect(normal.height).toBeGreaterThan(750);
  await expect(
    page.getByRole("separator", {
      name: "Resize details panel",
      includeHidden: true,
    }),
  ).toBeHidden();
  await page.getByRole("button", { name: "Expand node inspector" }).click();
  const expanded = await inspector.boundingBox();
  expect(expanded.x).toBeGreaterThanOrEqual(0);
  expect(expanded.x + expanded.width).toBeLessThanOrEqual(390);
  expect(expanded.y + expanded.height).toBeLessThanOrEqual(844);
  await page.getByRole("button", { name: "Close node inspector" }).click();
  await expect(inspector).toBeHidden();
});
