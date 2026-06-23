import { expect, test } from "@playwright/test";

test.describe("Authentication Pages", () => {
  test("login redirects to sign-in", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL("/sign-in");
    await expect(
      page.getByText("WorkOS sign-in is not configured.")
    ).toBeVisible();
  });

  test("register redirects to sign-up", async ({ page }) => {
    await page.goto("/register");
    await expect(page).toHaveURL("/sign-up");
    await expect(
      page.getByText("WorkOS sign-up is not configured.")
    ).toBeVisible();
  });

  test("sign-in fallback is available without WorkOS config", async ({
    page,
  }) => {
    await page.goto("/sign-in");
    await expect(
      page.getByText("WorkOS sign-in is not configured.")
    ).toBeVisible();
  });

  test("sign-up fallback is available without WorkOS config", async ({
    page,
  }) => {
    await page.goto("/sign-up");
    await expect(
      page.getByText("WorkOS sign-up is not configured.")
    ).toBeVisible();
  });
});
