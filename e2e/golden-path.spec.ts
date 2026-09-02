import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// A basic smoke test of the core loop: log in, see Fees, release a bottle,
// see Fees drop by exactly 1. This is deliberately not a deep test of
// every SQL function's edge cases -- it's a "does the actual website work
// for a real person" check, run against the real hosted Supabase project.
//
// One-time setup (not automated -- done once, by hand):
//   1. Register a dedicated test account through /register.
//   2. Confirm its email if your project requires that.
//   3. Log in and complete onboarding (pick any Home Shore).
//   4. Put its email/password in .env.local as E2E_TEST_EMAIL / E2E_TEST_PASSWORD.
//
// Every run resets that account's Fees to 5 first (via the service role
// key), so the test is repeatable indefinitely without manually topping
// up Fees or creating a fresh account each time.

const TEST_EMAIL = process.env.E2E_TEST_EMAIL;
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD;

test.beforeAll(async () => {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    throw new Error(
      "Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD in .env.local to a pre-registered, onboarded test account.",
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local.");
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: usersPage, error: listError } = await admin.auth.admin.listUsers();
  if (listError) throw listError;

  const testUser = usersPage.users.find((u) => u.email === TEST_EMAIL);
  if (!testUser) {
    throw new Error(`No auth user found for E2E_TEST_EMAIL=${TEST_EMAIL}. Register it once first.`);
  }

  const { error: updateError } = await admin
    .from("profiles")
    .update({ fees: 5 })
    .eq("id", testUser.id);
  if (updateError) throw updateError;
});

test("log in, send a bottle, Fees drops by 1", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(TEST_EMAIL!);
  await page.getByPlaceholder("Password").fill(TEST_PASSWORD!);
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page).toHaveURL("/");

  await page.goto("/bottles");
  await expect(page.getByText("You have 5 Fees")).toBeVisible();

  await page
    .getByPlaceholder("Write your message...")
    .fill(`E2E test message ${Date.now()}`);
  await page.getByRole("button", { name: "Seal and release" }).click();

  await expect(page).toHaveURL("/bottles");
  await expect(page.getByText("You have 4 Fees")).toBeVisible();
});
