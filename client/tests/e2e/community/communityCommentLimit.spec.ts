import { expect, test } from "@playwright/test";
import { installWatchlistMockBackend } from "../watchlist/watchlistMockBackend";

test("keeps an overlong reply visible and prevents writes before accepting 2,000 emoji", async ({
  page,
}, testInfo) => {
  // Reuse the existing synthetic signed-in session. All provider requests below
  // are intercepted; this browser test does not claim live Supabase behavior.
  await installWatchlistMockBackend(page);
  const commentBodies: string[] = [];
  const storageWrites: string[] = [];
  const postId = "29200000-0000-4000-8000-000000000002";
  const headers = {
    "access-control-allow-origin": "*",
    "access-control-allow-headers":
      "authorization,apikey,content-type,prefer,x-client-info",
    "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "content-type": "application/json",
  };
  await page.route("https://watchlist-e2e.supabase.co/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers });
      return;
    }
    if (url.pathname.startsWith("/storage/") && request.method() !== "GET") {
      storageWrites.push(request.url());
    }
    let body: unknown = [];
    if (url.pathname.endsWith("/posts")) {
      body = [
        {
          id: postId,
          title: "Comment boundary discussion",
          body: "Synthetic browser fixture",
          author_id: "11111111-1111-4111-8111-111111111111",
          created_at: "2026-10-09T00:00:00.000Z",
          votes: 0,
          tags: [],
          post_type: "discussion",
          post_tickers: [],
        },
      ];
    } else if (
      url.pathname.endsWith("/comments") &&
      request.method() === "POST"
    ) {
      const values = request.postDataJSON() as { body: string };
      commentBodies.push(values.body);
      body = {
        ...values,
        id: "29200000-0000-4000-8000-000000000003",
        created_at: "2026-10-09T00:00:00.000Z",
      };
    }
    await route.fulfill({ status: 200, headers, body: JSON.stringify(body) });
  });

  await page.goto("/Community");
  const discussion = page
    .getByRole("article")
    .filter({ hasText: "Comment boundary discussion" });
  await discussion
    .getByRole("button", { name: /Toggle .* for Comment boundary discussion/ })
    .click();
  const input = discussion.getByLabel("Add a comment", { exact: true });
  await expect(input).toHaveCSS("resize", "none");
  await expect(input).toHaveAttribute("maxlength", "4000");
  await discussion.locator('input[type="file"]').setInputFiles({
    name: "chart.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+afo8AAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await input.fill("x".repeat(2001));
  await expect(input).toHaveValue("x".repeat(2001));
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(input).toHaveAccessibleDescription(
    /Keep the comment to 2,000 characters or fewer/,
  );
  await expect(discussion.getByRole("alert")).toHaveText(
    "Keep the comment to 2,000 characters or fewer.",
  );
  await expect(
    discussion.getByRole("button", { name: "Reply", exact: true }),
  ).toBeDisabled();
  // A direct submit event also exercises the form guard when disabled controls
  // are bypassed. It must not invoke the upload/write workflow.
  await input.evaluate((element) =>
    element
      .closest("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
  expect(commentBodies).toEqual([]);
  expect(storageWrites).toEqual([]);
  await expect(
    discussion.getByAltText("Selected comment attachment"),
  ).toBeVisible();
  await expect
    .poll(() =>
      discussion
        .getByAltText("Selected comment attachment")
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBe(1);
  await page.screenshot({
    path: testInfo.outputPath("comment-limit-feedback.png"),
    fullPage: true,
  });

  await discussion
    .getByRole("button", { name: "Remove attachment chart.png" })
    .click();
  const acceptedText = "😀".repeat(2000);
  await input.fill(acceptedText);
  await expect(input).toHaveValue(acceptedText);
  await expect(input).toHaveAttribute("aria-invalid", "false");
  await expect(discussion.getByRole("alert")).toHaveCount(0);
  await discussion.getByRole("button", { name: "Reply", exact: true }).click();
  await expect.poll(() => commentBodies).toEqual([acceptedText]);
  await expect(input).toHaveValue("");
  await expect(
    discussion.getByText(acceptedText, { exact: true }),
  ).toBeVisible();
  expect(storageWrites).toEqual([]);
});
