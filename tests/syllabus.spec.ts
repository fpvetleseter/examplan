// First-run CTA and the syllabus path: paste, scope, build, reload, plan persists.
// Signs up one extra disposable account derived from QA_EMAIL_A, so it needs never-used QA emails too.
import { test, expect } from "@playwright/test";

const env = (k: string) => {
  const v = process.env[k];
  if (!v) throw Error(`Missing ${k}`);
  return v;
};

const SYLLABUS = [
  "Public International Law, fall term",
  "Session 1: Sources of international law",
  "Session 2: Treaties",
  "Session 3",
  "Customary international law",
  "Session 4: State responsibility",
  "Session 5: Use of force",
].join("\n");

test("new user sees the first-step CTA, then builds a plan from a pasted syllabus", async ({ browser, baseURL }) => {
  if (process.env.QA_ALLOW_SIGNUPS !== "yes") throw Error("Explicit disposable signup consent required");
  if (!baseURL) throw Error("Set BASE_URL in Playwright config");
  const [local, domain] = env("QA_EMAIL_A").split("@");
  const email = `${local}.syl@${domain}`;
  const context = await browser.newContext({ baseURL });
  const page = await context.newPage();

  await page.goto("/signup");
  await page.getByTestId("signup-email").fill(email);
  await page.getByTestId("signup-password").fill(env("QA_PASSWORD_A"));
  await page.getByTestId("signup-submit").click();
  await expect(page).toHaveURL(/\/app\/?$/);

  await test.step("zero exams: one-line explanation and a single primary CTA", async () => {
    await expect(page.getByText(/^Start with one exam/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Add your first exam" })).toBeVisible();
    await expect(page.getByTestId("core-submit")).toHaveText("Add your first exam");
    await expect(page.locator("main .btn-primary")).toHaveCount(1);
  });

  const title = `PIL final ${crypto.randomUUID().slice(0, 8)}`;
  await page.getByTestId("core-input").fill(title);
  await page.getByTestId("core-submit").click();
  const item = page.getByTestId("core-item").filter({ hasText: title });
  await expect(item).toHaveCount(1);
  await expect(item.getByRole("button", { name: "Set date and topics" })).toHaveClass(/btn-primary/);

  await test.step("paste a syllabus, fix the list, set scope and format", async () => {
    await item.getByRole("button", { name: "Add your syllabus" }).click();
    await item.getByLabel("Paste your syllabus").fill(SYLLABUS);
    await item.getByRole("button", { name: "Find sessions" }).click();
    await expect(item.getByText(/^Found 5 sessions/)).toBeVisible();
    await expect(item.getByLabel("Session 3 title")).toHaveValue("Session 3: Customary international law");
    await item.getByLabel("Session 2 is shaky").check();
    await item.getByLabel("Exam covers sessions 1 to").selectOption("3");
    await item.getByLabel("Exam type").selectOption("written");
    await item.getByLabel("Duration in minutes").fill("90");
    await item.getByLabel("Closed book").check();
    await item.getByRole("button", { name: "Save syllabus" }).click();
    await expect(item.getByText(/Syllabus added/)).toBeVisible();
  });

  const expectPlan = async () => {
    await expect(item.getByText("Plan from your syllabus")).toBeVisible();
    await expect(item.getByText(/Learn Session 3: Customary international law/).first()).toBeVisible();
    await expect(item.getByText(/Why today: Next in syllabus order \(2 of 3\); marked shaky/).first()).toBeVisible();
    await expect(item.getByText(/Write an answer/).first()).toBeVisible();
    await expect(item.getByText(/Light review/).first()).toBeVisible();
    await expect(item.getByText(/Session 4|Session 5/)).toHaveCount(0);
  };

  await test.step("build the plan", async () => {
    await expect(item.getByRole("button", { name: "Build study plan" })).toHaveClass(/btn-primary/);
    await item.getByRole("button", { name: "Build study plan" }).click();
    await item.getByRole("button", { name: "Build study plan" }).click();
    await expectPlan();
  });

  await test.step("plan persists after a reload", async () => {
    await page.reload();
    await expect(item.getByText("Plan ready")).toBeVisible();
    await item.getByRole("button", { name: "Open study plan" }).click();
    await expectPlan();
  });

  await context.close();
});
