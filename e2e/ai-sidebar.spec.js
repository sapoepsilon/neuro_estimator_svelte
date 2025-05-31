import { test, expect } from '@playwright/test';

test.describe('AI Sidebar', () => {
  test.beforeEach(async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    
    // Handle welcome dialog if it appears
    const handleWelcomeDialog = async () => {
      const welcomeDialog = page.getByRole('dialog', { name: 'Welcome to Estimating Agent' });
      if (await welcomeDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
        const gotItButton = welcomeDialog.getByRole('button', { name: 'Got it' });
        await gotItButton.click();
        await expect(welcomeDialog).not.toBeVisible();
      }
    };
    
    // Handle login dialog if it appears
    const handleLoginDialog = async () => {
      const loginDialog = page.getByRole('dialog', { name: 'Login' });
      if (await loginDialog.isVisible({ timeout: 1000 }).catch(() => false)) {
        const closeButton = loginDialog.getByRole('button', { name: 'Close' });
        await closeButton.click();
        await expect(loginDialog).not.toBeVisible();
      }
    };

    await handleWelcomeDialog();
    await handleLoginDialog();
  });

  test('AI sidebar is hidden when user is not authenticated', async ({ page }) => {
    // Navigate to estimator page without authentication
    await page.goto('/#/estimator');
    
    // Wait for page load
    await page.waitForLoadState('networkidle');
    
    // Verify AI sidebar content is not visible
    const sidebarHeading = page.getByRole('heading', { name: 'AI Estimating Agent' });
    await expect(sidebarHeading).not.toBeVisible();
    
    // Verify toggle button is not visible (since user is not authenticated)
    const toggleButton = page.getByRole('button', { name: 'Toggle AI Estimator' });
    await expect(toggleButton).not.toBeVisible();
  });

  test('AI sidebar toggle button hidden for invalid project IDs', async ({ page }) => {
    // Navigate with invalid project ID
    await page.goto('/#/estimator?id=test');
    
    // Wait for page load
    await page.waitForLoadState('networkidle');
    
    // Verify AI sidebar is not visible
    const sidebarHeading = page.getByRole('heading', { name: 'AI Estimating Agent' });
    await expect(sidebarHeading).not.toBeVisible();
    
    // Verify toggle button is not visible for invalid project ID
    const toggleButton = page.getByRole('button', { name: 'Toggle AI Estimator' });
    await expect(toggleButton).not.toBeVisible();
  });

  test('keyboard shortcut Ctrl+K does not open sidebar when unauthenticated', async ({ page }) => {
    // Navigate to estimator page
    await page.goto('/#/estimator');
    
    // Wait for page load
    await page.waitForLoadState('networkidle');
    
    // Try to use keyboard shortcut
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(500);
    
    // Verify sidebar is still not visible
    const sidebarHeading = page.getByRole('heading', { name: 'AI Estimating Agent' });
    await expect(sidebarHeading).not.toBeVisible();
  });

  test('main content displays correctly without sidebar interference', async ({ page }) => {
    // Navigate to estimator page
    await page.goto('/#/estimator');
    
    // Wait for page load
    await page.waitForLoadState('networkidle');
    
    // Verify main content is visible and properly positioned
    await expect(page.getByRole('heading', { name: 'Construction Estimator' })).toBeVisible();
    await expect(page.getByText('Describe your project to get an instant estimate')).toBeVisible();
    await expect(page.getByPlaceholder('Describe your construction project')).toBeVisible();
    
    // Verify main content takes full width (no sidebar interference)
    const mainContent = page.locator('main');
    const mainBoundingBox = await mainContent.boundingBox();
    
    // Main content should be reasonably wide (not constrained by a sidebar)
    expect(mainBoundingBox.width).toBeGreaterThan(800);
  });

  test('displays login button when user is not authenticated', async ({ page }) => {
    // Navigate to estimator page
    await page.goto('/#/estimator');
    
    // Wait for page load
    await page.waitForLoadState('networkidle');
    
    // Verify login button is visible
    const loginButton = page.getByRole('button', { name: 'Login / Sign Up' });
    await expect(loginButton).toBeVisible();
    
    // Note: We don't test clicking the login button here because it may be 
    // intercepted by dialog overlays in some browsers. The important thing 
    // is that the button is visible when user is not authenticated.
  });
});