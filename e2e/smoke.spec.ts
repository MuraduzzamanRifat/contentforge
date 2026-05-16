import { test, expect } from "@playwright/test";

/**
 * One end-to-end happy path that proves the production-critical flows still work:
 *   1. App boots and renders 260 rows
 *   2. Section nav (Sheet / Calendar / Analytics / Library / Settings) all swap views
 *   3. Track filter narrows the sheet
 *   4. Status filter narrows the sheet
 *   5. Search narrows the sheet
 *   6. Row selection populates preview panel
 *   7. Mark-published rejects invalid YouTube IDs, accepts valid ones
 *   8. Connections panel opens and shows Claude status
 *   9. Duplicate flag is present on at least one row
 */

test.beforeEach(async ({ page }) => {
  // Clear persisted Zustand state so every test starts from the fresh agarwood seed.
  await page.addInitScript(() => {
    try {
      localStorage.removeItem("contentforge");
      localStorage.removeItem("contentforge-agarwood-v1");
    } catch {}
  });
  await page.goto("/");
  // Default section is Sheet; wait for the seed rows to render.
  await page.locator("tbody tr").first().waitFor({ timeout: 10_000 });
});

test("the sheet renders all 260 rows", async ({ page }) => {
  await expect(page.locator("tbody tr")).toHaveCount(260);
});

test("section nav switches the main view", async ({ page }) => {
  await page.locator('aside button:has-text("Calendar")').first().click();
  await expect(page.getByRole("heading", { name: "Calendar" })).toBeVisible();

  await page.locator('aside button:has-text("Analytics")').first().click();
  await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();

  await page.locator('aside button:has-text("Library")').first().click();
  await expect(page.getByRole("heading", { name: "Library" })).toBeVisible();

  await page.locator('aside button:has-text("Settings")').first().click();
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

  await page.locator('aside button:has-text("Sheet")').first().click();
  await expect(page.locator("tbody tr").first()).toBeVisible();
});

test("track filter narrows the sheet", async ({ page }) => {
  const before = await page.locator("tbody tr").count();
  await page.getByTitle(/^Science \(/).click(); // Track A chip
  const after = await page.locator("tbody tr").count();
  expect(after).toBeLessThan(before);
  expect(after).toBeGreaterThan(0);
});

test("status filter narrows the sheet", async ({ page }) => {
  await page.getByRole("button", { name: /All status/ }).click();
  await page.getByRole("menuitem").filter({ hasText: "PUBLISHED" }).click();
  // No videos start as PUBLISHED, so the empty-state row should appear.
  await expect(page.getByText(/No rows match/)).toBeVisible();
});

test("search narrows the sheet", async ({ page }) => {
  await page.getByPlaceholder("Search videos…").fill("Kodo");
  // Only Kodo / kodo-related rows should remain (there are 2-3).
  const count = await page.locator("tbody tr").count();
  expect(count).toBeGreaterThan(0);
  expect(count).toBeLessThan(20);
});

test("clicking a row populates the preview panel", async ({ page }) => {
  // Click the # cell of row 1 to avoid hitting the title input.
  await page.locator("tbody tr").nth(0).locator("td").nth(1).click();
  await expect(page.getByText(/Production brief/)).toBeVisible();
  await expect(page.getByText(/Animation direction/)).toBeVisible();
});

test("Mark published rejects garbage and accepts a valid ID", async ({ page }) => {
  await page.locator("tbody tr").nth(0).locator("td").nth(1).click();
  const input = page.getByPlaceholder("YouTube ID or URL");
  await input.fill("not-an-id");
  await expect(page.getByText(/11-char ID or full YouTube URL/)).toBeVisible();
  const btn = page.getByRole("button", { name: "Mark published" });
  await expect(btn).toBeDisabled();

  await input.fill("dQw4w9WgXcQ");
  await expect(btn).toBeEnabled();
  await btn.click();
  // Status should now be PUBLISHED on the row's status chip.
  await expect(page.locator(".chip:has-text('PUBLISHED')").first()).toBeVisible();
});

test("Connections panel opens and shows Claude status", async ({ page }) => {
  await page.locator('button[aria-label="Open Connections panel"]').click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByText(/Claude/i).first()).toBeVisible();
});

test("workflow board: kanban renders, drawer opens, no infinite loop", async ({ page }) => {
  await page.locator('aside button:has-text("Workflow")').first().click();
  await expect(page.getByRole("heading", { name: "Workflow" })).toBeVisible();
  // 5 columns
  for (const col of ["Draft", "In Review", "Rejected", "Approved", "Ready for Production"]) {
    await expect(page.getByText(col, { exact: true }).first()).toBeVisible();
  }
  // Open first card → drawer shows the Korean summary section (proves no getSnapshot loop)
  await page.locator("div.overflow-y-auto > button").first().click();
  await expect(page.getByText(/클라이언트용 요약/)).toBeVisible();
  await expect(page.getByText(/Discussion \(0\)/)).toBeVisible();
  // DRAFT column action
  await expect(page.getByRole("button", { name: /Send to client review/i })).toBeVisible();
});

test("workflow: sheet is still reachable from the sidebar", async ({ page }) => {
  await page.locator('aside button:has-text("Sheet")').first().click();
  await expect(page.locator("tbody tr").first()).toBeVisible();
});

test("publish: empty until a script is approved, then row appears", async ({ page }) => {
  await page.locator('aside button:has-text("Publish")').first().click();
  await expect(page.getByRole("heading", { name: "Publish" })).toBeVisible();
  await expect(page.getByText(/Nothing to publish yet/)).toBeVisible();

  // Drive one row Draft → In Review → Approved via the Workflow drawer
  await page.locator('aside button:has-text("Workflow")').first().click();
  await page.locator("div.overflow-y-auto > button").first().click();
  await page.getByRole("button", { name: /Send to client review/i }).click();
  await page.waitForTimeout(400);
  await page.locator("div.overflow-y-auto").nth(1).locator("button").first().click();
  await page.locator("button.bg-emerald-600", { hasText: "Approve" }).first().click();
  await page.waitForTimeout(400);

  // Publish now lists the approved row; opening it shows the honest "no script" gate
  await page.locator('aside button:has-text("Publish")').first().click();
  await expect(page.locator('button:has-text("APPROVED")').first()).toBeVisible();
  await page.locator("button", { hasText: /Wounded Agarwood|Untitled|Agarwood/ }).first().click();
  await expect(page.getByText(/no script yet|Generate SEO/i).first()).toBeVisible();
});

test("at least one row has a duplicate-overlap flag", async ({ page }) => {
  // The 260-row plan has known overlaps (e.g. economy/price across weeks 1, 7, 33, 36).
  const flagged = await page.locator('button[aria-label$="possible duplicates"]').count();
  expect(flagged).toBeGreaterThan(0);
});
