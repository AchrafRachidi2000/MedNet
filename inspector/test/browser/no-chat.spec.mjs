import { test, expect } from "@playwright/test";

test("workflow map loads without chatbot controls or chat network requests", async ({
  page,
}) => {
  const chatRequests = [];
  page.on("request", (request) => {
    if (
      /local-chat|\/api\/chat\/|auth\.openai\.com|api\.openai\.com/.test(
        request.url(),
      )
    )
      chatRequests.push(request.url());
  });
  await page.goto("/");
  await expect(page.locator(".graph-node").first()).toBeVisible();
  await expect(
    page.locator("#local-chat-root, .chat-launcher, #workflow-chat"),
  ).toHaveCount(0);
  await page.locator(".graph-node:not(.phase-boundary)").first().click();
  await expect(page).toHaveURL(/node=/);
  expect(chatRequests).toEqual([]);
});
