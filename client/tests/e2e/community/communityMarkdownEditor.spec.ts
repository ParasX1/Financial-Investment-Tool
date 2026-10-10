import { expect, test } from "@playwright/test";

test("previews Community Markdown without leaving the create post", async ({
  page,
}) => {
  await page.goto("/CommunityCreate");
  await page.waitForLoadState("networkidle");

  const body = page.getByLabel("Discussion body");
  await body.fill(
    [
      "## Why I am watching this",
      "",
      "> Guidance matters more than one headline.",
      "",
      "- Revenue trend",
      "- Margin trend",
    ].join("\n"),
  );
  await expect(body).toHaveValue(/## Why I am watching this/);

  await page.getByRole("button", { name: "Preview", exact: true }).click();

  const preview = page.getByLabel("Markdown preview");
  await expect(
    preview.getByRole("heading", { name: "Why I am watching this" }),
  ).toBeVisible();
  await expect(
    preview.getByText("Guidance matters more than one headline."),
  ).toBeVisible();
  await expect(preview.getByText("Revenue trend")).toBeVisible();

  await page.getByRole("button", { name: "Write", exact: true }).click();
  await expect(body).toHaveValue(/## Why I am watching this/);
});
