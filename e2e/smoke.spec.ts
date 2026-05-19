import { test, expect, type Page } from "@playwright/test";

/**
 * End-to-end happy paths for the CURRENT product:
 *   - Generate is the default landing screen (Sheet starts empty)
 *   - Empty Sheet shows its honest empty-state CTA
 *   - With a board present (injected as a deterministic fixture — the 260-row
 *     seed was retired in favour of AI-invented topics), the Sheet / filters /
 *     preview / Production / Publish flows still work (Workflow removed)
 *   - Connections panel renders
 *
 * Fixtures are injected via localStorage in the exact zustand-persist shape
 * ({ state: <partialized>, version }). On CI there is no GITHUB_TOKEN, so
 * /api/board returns 412 and BoardSync stays local-only — it never clobbers
 * the injected board. No test depends on the AI provider (none on CI).
 */

const PERSIST_KEY = "contentforge-agarwood-v1";
const PERSIST_VERSION = 7;

type Row = Record<string, unknown>;

function rows(): Row[] {
  const now = "2026-05-17T00:00:00.000Z";
  const base = {
    brief: "Topic angle: factual cold-open. Track source map applies.",
    script: "Hook: ... Cold-open: ... Proof: ... Synthesis: ... CTA: ...",
    description: "", tags: [], aiCost: 0, createdAt: now, updatedAt: now,
  };
  const mk = (i: number, p: Row): Row => ({
    id: `r${i}`, rowIndex: i, status: "DRAFT", hook: "Opening line.", ...base, ...p,
  });
  return [
    mk(0, { title: "What Happens Inside a Wounded Agarwood Tree", track: "A", category: "Formation" }),
    mk(1, { title: "What Happens Inside a Wounded Agarwood Tree (First Hours)", track: "A", category: "Formation" }),
    mk(2, { title: "The Molecule That Makes Oud Smell Like Oud", track: "A", category: "Chemistry" }),
    mk(3, { title: "Agarwood on the Maritime Incense Road", track: "B", category: "History" }),
    mk(4, { title: "Kodo: The Japanese Art of Listening to Incense", track: "C", category: "Japanese ritual" }),
    mk(5, { title: "Why Temples Burn Agarwood", track: "C", category: "Culture" }),
    mk(6, { title: "Why Agarwood Costs More Than Gold", track: "D", category: "Economy" }),
    mk(7, { title: "Why Agarwood Is More Expensive Than Gold", track: "D", category: "Economy" }),
  ];
}

/** Inject a persisted board (section=sheet) before the app's JS runs. */
async function seedBoard(page: Page) {
  const payload = JSON.stringify({
    state: {
      rows: rows(),
      dark: false,
      section: "sheet",
      comments: {},
      viewerLang: "en",
      viewerRole: "operator",
    },
    version: PERSIST_VERSION,
  });
  await page.addInitScript(
    ([key, value]) => {
      try { localStorage.setItem(key as string, value as string); } catch {}
    },
    [PERSIST_KEY, payload],
  );
}

async function clearBoard(page: Page) {
  await page.addInitScript((key) => {
    try { localStorage.removeItem(key as string); } catch {}
  }, PERSIST_KEY);
}

// ---------------------------------------------------------------------------

test.describe("fresh app (no board)", () => {
  test.beforeEach(async ({ page }) => {
    await clearBoard(page);
    await page.goto("/");
  });

  test("Generate is the default landing screen", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Generate topics/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Generate 5 topics/i }).first()).toBeVisible();
  });

  test("Sheet shows its empty-state CTA", async ({ page }) => {
    await page.locator('nav button:has-text("Sheet")').first().click();
    await expect(page.getByText(/The Sheet is empty/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Go to Generate/i })).toBeVisible();
  });

  test("Connections panel opens and shows Claude status", async ({ page }) => {
    await page.locator('button[aria-label="Open Connections panel"]').click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog").getByText(/Claude/i).first()).toBeVisible();
  });
});

test.describe("seeded board", () => {
  test.beforeEach(async ({ page }) => {
    await seedBoard(page);
    await page.goto("/");
    await page.locator("tbody tr").first().waitFor({ timeout: 15_000 });
  });

  test("the sheet renders the injected rows", async ({ page }) => {
    await expect(page.locator("tbody tr")).toHaveCount(8);
  });

  test("topbar nav switches the main view (no sidebar)", async ({ page }) => {
    await expect(page.locator('header nav button:has-text("Production")')).toBeVisible();
    await page.locator('nav button:has-text("Production")').first().click();
    await expect(page.getByRole("heading", { name: "Production" })).toBeVisible();
    await page.locator('nav button:has-text("Publish")').first().click();
    await expect(page.getByRole("heading", { name: "Publish" })).toBeVisible();
    await page.locator('nav button:has-text("Settings")').first().click();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await page.locator('nav button:has-text("Sheet")').first().click();
    await expect(page.locator("tbody tr").first()).toBeVisible();
  });

  test("track filter narrows the sheet", async ({ page }) => {
    const before = await page.locator("tbody tr").count();
    await page.getByTitle(/^Science \(/).click(); // Track A chip → 3 rows
    const after = await page.locator("tbody tr").count();
    expect(after).toBeLessThan(before);
    expect(after).toBeGreaterThan(0);
  });

  test("status filter narrows the sheet", async ({ page }) => {
    await page.getByRole("button", { name: /All status/ }).click();
    await page.getByRole("menuitem").filter({ hasText: "PUBLISHED" }).click();
    await expect(page.getByText(/No rows match/)).toBeVisible();
  });

  test("search narrows the sheet", async ({ page }) => {
    await page.getByPlaceholder("Search…").fill("Kodo");
    const count = await page.locator("tbody tr").count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(8);
  });

  test("clicking a row populates the preview panel", async ({ page }) => {
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
    await expect(page.locator(".chip:has-text('PUBLISHED')").first()).toBeVisible();
  });

  test("production lists scripted rows directly (no Workflow gate)", async ({ page }) => {
    await page.locator('nav button:has-text("Production")').first().click();
    await expect(page.getByRole("heading", { name: "Production" })).toBeVisible();
    // Seeded rows carry scripts → Production-ready straight away.
    await expect(
      page.getByText("Kodo: The Japanese Art of Listening to Incense").first(),
    ).toBeVisible();
  });

  test("publish: empty until a video is finalized", async ({ page }) => {
    await page.locator('nav button:has-text("Publish")').first().click();
    await expect(page.getByRole("heading", { name: "Publish" })).toBeVisible();
    await expect(page.getByText(/Nothing to publish yet/)).toBeVisible();
  });

  test("at least one row has a duplicate-overlap flag", async ({ page }) => {
    // The fixture has two near-identical pairs (rows 0/1 and 6/7).
    const flagged = await page.locator('button[aria-label$="possible duplicates"]').count();
    expect(flagged).toBeGreaterThan(0);
  });
});
