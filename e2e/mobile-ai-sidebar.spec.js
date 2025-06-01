import { test, expect } from "@playwright/test";

test.describe("Mobile AI Sidebar", () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport dimensions FIRST, before any navigation
    await page.setViewportSize({ width: 375, height: 667 });
  });

  async function handleWelcomeDialog(page) {
    const welcomeDialog = page.getByRole("dialog", {
      name: "Welcome to Estimating Agent",
    });
    if (await welcomeDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
      const closeButton = welcomeDialog.locator('button:text("Got it")');
      if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await closeButton.click();
      } else {
        await welcomeDialog.getByRole("button", { name: "Close" }).click();
      }
      await expect(welcomeDialog).not.toBeVisible();
    }
  }

  async function bringMobileNavigationBar(page) {
    const toggleSidebarButton = page.getByRole("button", {
      name: "Toggle sidebar",
    });
    await toggleSidebarButton.click();
  }

  async function handleSidebarLoginDialog(page) {
    const loginButton = page.getByTestId("sidebar-login-button");
    await loginButton.click();
    await expect(page.getByRole("dialog", { name: "Login" })).toBeVisible();
  }

  async function logIn(page) {
    const email = "g1@viusbuilt.com";
    const password = "123456";
    const emailInput = page.getByRole("textbox", { name: "Email" });
    const passwordInput = page.getByRole("textbox", { name: "Password" });
    const loginButton = page.getByTestId("login-button");
    await emailInput.fill(email);
    await passwordInput.fill(password);
    await loginButton.click();
    await expect(page.getByRole("dialog", { name: "Login" })).not.toBeHidden();
  }

  async function signIn(page) {
    await page.goto("/");
    await handleWelcomeDialog(page);
    await bringMobileNavigationBar(page);
    await handleSidebarLoginDialog(page);
    await logIn(page);
  }

  test("can login successfully on mobile", async ({ page }) => {
    await signIn(page);
    await bringMobileNavigationBar(page);
    await expect(
      page.getByRole("button", { name: "Sign Out" }).first()
    ).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: "mobile-logged-in.png" });
  });

  test("can navigate to a project page after login", async ({ page }) => {
    await signIn(page);
    await bringMobileNavigationBar(page);
    await expect(
      page.getByRole("button", { name: "Sign Out" }).first()
    ).toBeVisible({ timeout: 5000 });
    await page.goto("/#/estimator?id=3");
    await page.waitForTimeout(2000);
    await expect(page.locator("h1")).toContainText("Construction Estimator");
    await page.screenshot({ path: "mobile-project-page.png" });
  });

  test("can open and close welcome dialog", async ({ page }) => {
    await page.goto("/");
    await handleWelcomeDialog(page);
    const welcomeDialog = page.getByRole("dialog", {
      name: "Welcome to Estimating Agent",
    });
    await expect(welcomeDialog).not.toBeVisible();
    await page.screenshot({ path: "mobile-welcome-dismissed.png" });
  });

  test("can open and close AI sidebar on mobile", async ({ page }) => {
    await signIn(page);
    await page.goto("/#/estimator?id=3");
    await page.waitForTimeout(2000);
    const aiButton = page.getByTestId("ai-sidebar-toggle-button");
    await expect(aiButton).toBeVisible();
    await aiButton.click();
    await expect(page.getByText("AI Agent")).toBeVisible();
    await expect(page.getByTestId("ai-sidebar-backdrop")).toBeVisible();
    await page.screenshot({ path: "mobile-ai-sidebar-open.png" });
    await page.getByTestId("ai-sidebar-backdrop").click();
    await page.waitForTimeout(1000);
    await expect(page.getByTestId("ai-sidebar-mobile")).not.toBeInViewport();
    await page.screenshot({ path: "mobile-ai-sidebar-closed.png" });
  });

  test("can interact with AI sidebar backdrop on mobile", async ({ page }) => {
    await signIn(page);
    await page.goto("/#/estimator?id=3");
    await page.waitForTimeout(2000);
    const aiButton = page.getByTestId("ai-sidebar-toggle-button");
    await aiButton.click();
    await expect(page.getByText("AI Agent")).toBeVisible();
    await page.getByTestId("ai-sidebar-backdrop").click();
    await page.waitForTimeout(1000);
    await expect(page.getByTestId("ai-sidebar-mobile")).not.toBeInViewport();
  });
});
