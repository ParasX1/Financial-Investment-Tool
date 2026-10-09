import { expect, test } from "@playwright/test";

test("retries an initial Community load failure in place", async ({ page }) => {
  let postRequests = 0;
  let navigations = 0;
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) navigations += 1;
  });
  await page.route("**/rest/v1/posts?**", async (route) => {
    postRequests += 1;
    await route.fulfill({
      status: postRequests === 1 ? 503 : 200,
      contentType: "application/json",
      body: JSON.stringify(
        postRequests === 1
          ? { code: "57014", message: "Temporary feed failure" }
          : [
              {
                id: "33333333-3333-4333-8333-333333333333",
                title: "Recovered research discussion",
                body: "Research notes",
                author_id: "31313131-3131-4131-8131-313131313131",
                tags: [],
                post_type: "discussion",
                post_tickers: [],
                image_url: null,
                image_path: null,
                votes: 0,
                created_at: "2026-10-09T00:00:00Z",
              },
            ],
      ),
    });
  });
  await page.route("**/rest/v1/comments?**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );
  await page.goto("/Community");
  await expect(page.getByText("Community is unavailable")).toBeVisible();
  const initialUrl = page.url();
  const initialNavigations = navigations;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.getByText("Recovered research discussion", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Community is unavailable")).toHaveCount(0);
  expect(page.url()).toBe(initialUrl);
  expect(navigations).toBe(initialNavigations);
  expect(postRequests).toBe(2);
});
