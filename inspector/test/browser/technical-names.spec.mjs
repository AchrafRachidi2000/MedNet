import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const raw = await readFile(
  new URL("../../../mednetstructure.json", import.meta.url),
  "utf8",
);
const exported = JSON.parse(raw);

test("technical map uses current exported names without clipping and preserves explanations", async ({ page }) => {
  const catalog = await (await page.request.get("/api/catalog")).json();
  expect(catalog.sourceHash).toBe(createHash("sha256").update(raw).digest("hex"));
  await page.goto("/#audience=technical");
  await expect(page.locator(".graph-node")).toHaveCount(catalog.nodes.length);
  const cards = await page.locator(".graph-node").evaluateAll((elements) =>
    elements.map((card) => {
      const title = card.querySelector("strong");
      return {
        id: card.dataset.select,
        title: title.textContent,
        description: card.querySelector(".node-description").textContent,
        clipped: title.scrollHeight > title.clientHeight + 1 || title.scrollWidth > title.clientWidth + 1,
      };
    }),
  );
  for (const card of cards) {
    expect(card.title).toBe(exported.nodes.find((n) => n.id === card.id).data.name);
    expect(card.description).toBe(catalog.nodes.find((n) => n.id === card.id).summary);
    expect(card.clipped, card.title).toBe(false);
  }
  const splitter = catalog.nodes.find((n) => n.name.startsWith("C-15"));
  await page.goto(`/#audience=technical&phase=clinical&node=${splitter.id}`);
  await expect(page.locator("#inspector h2")).toHaveText(splitter.name);
  await expect(page.locator("#inspector .source-name")).toHaveText(splitter.explanatoryTitle);
  await page.screenshot({ path: "test-results/technical-source-names.png" });
  await page.keyboard.press("Escape");
  await page.locator("#search").fill(splitter.explanatoryTitle);
  await expect(page.locator(".search-current > strong")).toHaveText(splitter.name);
  await page.locator("#search").fill(splitter.name);
  await expect(page.locator(".search-current > strong")).toHaveText(splitter.name);
});

test("technical names work on phones while business step names stay plain English", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#audience=technical&phase=intake");
  await expect(page.locator(".graph-node").first()).toBeVisible();
  const catalog = await (await page.request.get("/api/catalog")).json();
  for (const card of await page.locator(".graph-node").all()) {
    const id = (await card.getAttribute("data-select")) || (await card.getAttribute("data-boundary-node"));
    await expect(card.locator(":scope > strong")).toHaveText(catalog.nodes.find((n) => n.id === id).name);
  }
  await page.screenshot({ path: "test-results/technical-source-names-mobile.png" });
  await page.goto("/#audience=business&phase=intake");
  await expect(page.locator('[data-select="receive"] > strong')).toHaveText("Receive the claim");
  await expect(page.locator('[data-select="intake-ready"] > strong')).toHaveText("Check the submission");
});
