import { test as setup, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, ".auth/user.json");

setup("authenticate as coach", async ({ page }) => {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "TEST_EMAIL and TEST_PASSWORD env vars are required. Copy .env.test.example to .env.test and fill in values."
    );
  }

  await page.goto("/login");
  await page.getByRole("tab", { name: /coach/i }).click().catch(() => {});
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();

  // Wait until we land somewhere in the coach area
  await page.waitForURL(/\/coach/, { timeout: 15000 });
  await expect(page).toHaveURL(/\/coach/);

  await page.context().storageState({ path: authFile });
});
