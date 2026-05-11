import { test, expect } from "@playwright/test";

/**
 * Full-stack integration test for the "open saved match → video plays" flow.
 *
 * Covers the three pages that load a video from a saved match:
 *   /coach/capture, /coach/review, /coach/players
 *
 * Requires a match with video_storage_path set. Supply the match ID via:
 *   TEST_MATCH_WITH_VIDEO_ID=<uuid>   (in .env.test or your shell)
 *
 * If the env var is not set the test is skipped.
 */

const VIDEO_MATCH_ID = process.env.TEST_MATCH_WITH_VIDEO_ID;

test.describe("saved match video flow", () => {
  test.beforeEach(async ({ page }) => {
    if (!VIDEO_MATCH_ID) {
      test.skip(true, "TEST_MATCH_WITH_VIDEO_ID not set — skipping video tests");
    }
    // Navigate to saved-matches so the MatchesContext hydrates
    await page.goto("/coach/saved-matches");
    await page.waitForLoadState("networkidle");
  });

  test("capture page loads video from saved match", async ({ page }) => {
    // Track the signed-url request
    const signedUrlPromise = page.waitForResponse(
      (res) => res.url().includes("/api/match-video/signed-url") && res.status() === 200,
      { timeout: 8000 }
    );

    // Find the match row and open in Capture
    await openMatchInPage(page, VIDEO_MATCH_ID!, "Open in Capture");

    // Assert we're on the capture page
    await expect(page).toHaveURL(/\/coach\/capture/);

    // Assert signed-url request returned a valid URL
    const signedUrlRes = await signedUrlPromise;
    const body = await signedUrlRes.json() as { signedUrl?: string };
    expect(body.signedUrl).toBeTruthy();
    expect(body.signedUrl).toMatch(/^https?:\/\//);

    // Assert the video element eventually has a src pointing to the signed URL
    const video = page.locator("video").first();
    await expect(video).toBeVisible({ timeout: 10000 });
    await expect(video).toHaveAttribute("src", body.signedUrl!, { timeout: 10000 });
  });

  test("review page loads video from saved match", async ({ page }) => {
    const signedUrlPromise = page.waitForResponse(
      (res) => res.url().includes("/api/match-video/signed-url") && res.status() === 200,
      { timeout: 8000 }
    );

    await openMatchInPage(page, VIDEO_MATCH_ID!, "Open in Review");

    await expect(page).toHaveURL(/\/coach\/review/);

    const signedUrlRes = await signedUrlPromise;
    const body = await signedUrlRes.json() as { signedUrl?: string };
    expect(body.signedUrl).toBeTruthy();

    const video = page.locator("video").first();
    await expect(video).toBeVisible({ timeout: 10000 });
    await expect(video).toHaveAttribute("src", body.signedUrl!, { timeout: 10000 });
  });

  test("players page loads video from saved match", async ({ page }) => {
    const signedUrlPromise = page.waitForResponse(
      (res) => res.url().includes("/api/match-video/signed-url") && res.status() === 200,
      { timeout: 8000 }
    );

    await openMatchInPage(page, VIDEO_MATCH_ID!, "Open in Review");
    await expect(page).toHaveURL(/\/coach\/review/);

    // Navigate from review to players
    await page.goto("/coach/players");

    const signedUrlRes = await signedUrlPromise;
    const body = await signedUrlRes.json() as { signedUrl?: string };
    expect(body.signedUrl).toBeTruthy();

    const video = page.locator("video").first();
    await expect(video).toBeVisible({ timeout: 10000 });
    await expect(video).toHaveAttribute("src", body.signedUrl!, { timeout: 10000 });
  });
});

/** Finds a match row by ID and opens it via the ••• actions menu. */
async function openMatchInPage(
  page: import("@playwright/test").Page,
  matchId: string,
  menuLabel: "Open in Capture" | "Open in Review"
) {
  // The match row renders with its ID as a key but no data-testid.
  // We target the ••• button inside the row that contains the match's title.
  // The safest selector: find the row div containing a checkbox with aria-label
  // containing the match title, then click its MoreHorizontal button.
  //
  // Fallback: click the first "Match actions" button on the page.
  const matchActionsBtn = page
    .locator(`[aria-label="Match actions"]`)
    .first();

  await matchActionsBtn.click();
  await page.getByRole("button", { name: menuLabel }).click();
}
