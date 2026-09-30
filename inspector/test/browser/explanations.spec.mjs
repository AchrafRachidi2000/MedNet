import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("business explanations expose the actual intake and identity checks", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/#audience=business&phase=intake&node=intake-ready");
  const panel = page.locator("#inspector");
  await expect(panel).toContainText("What gets checked or done");
  await expect(panel).toContainText("the reference was missing");
  await expect(panel).toContainText("none has a usable download link");
  await expect(panel).toContainText(
    "not a check of required medical documents",
  );
  await page.screenshot({
    path: "test-results/business-intake-explanation.png",
  });
  await page.goto("/#audience=business&phase=identity&node=identify");
  await expect(panel).toContainText("full 18-digit member card");
  await expect(panel).toContainText("sanction indicator");
  await expect(panel).toContainText("Structured claim and bill facts");
  await expect(panel).toContainText("284, 405 and 501");
  await expect(panel.locator("[role=tab]")).toHaveCount(0);
  await page.screenshot({
    path: "test-results/business-member-explanation.png",
  });
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(result.violations).toEqual([]);
  expect(errors).toEqual([]);
});

test("technical explanation keeps service, actions and exact fields on one page", async ({
  page,
}) => {
  const c = await (await page.request.get("/api/catalog")).json();
  const n = c.nodes.find((n) => n.name.startsWith("API-003 "));
  await page.goto(`/#audience=technical&node=${n.id}`);
  const panel = page.locator("#inspector");
  await expect(panel.locator("[role=tab], [role=tablist]")).toHaveCount(0);
  await expect(panel).toContainText("MedNext+ member-policy lookup");
  await expect(panel).toContainText("Sent to the service");
  await expect(panel).toContainText("Full member card number");
  await expect(panel).toContainText("Returned by the service");
  await expect(panel).toContainText("eligibility/sanction");
  for (const direction of ["inputs", "outputs"])
    for (const f of n[direction])
      await expect(
        panel
          .locator(
            `[data-direction="${direction}"][data-field-path="${f.path}"]`,
          )
          .first(),
      ).toBeAttached();
  await expect(
    panel.locator('[data-detail-section="logic"]'),
  ).not.toHaveAttribute("open", "");
  await page.screenshot({ path: "test-results/technical-api-explanation.png" });
  await panel.locator('[data-detail-section="logic"] > summary').click();
  await expect(panel.locator("#code-content")).toContainText(
    "member-policy/get",
  );
});

test("all business steps render detailed explanations and are searchable", async ({
  page,
}) => {
  const { catalog } = await (await page.request.get("/api/business")).json();
  for (const n of catalog.nodes) {
    await page.goto(`/#audience=business&node=${n.id}`);
    await expect(page.locator("#inspector")).toContainText(
      n.businessDetails.checks[0],
    );
    await expect(page.locator("#inspector")).toContainText(
      n.businessDetails.outputs[0][1],
    );
  }
  await page.goto("/#audience=business");
  await page
    .getByRole("textbox", { name: "Search business steps" })
    .fill("18-digit");
  await expect(page.locator('.graph-node[data-select="identify"]')).toHaveClass(
    /search-match/,
  );
});
