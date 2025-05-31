import { test, expect } from '@playwright/test';

test.describe('EstimatorForm Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Handle welcome dialog if it appears
    const welcomeDialog = page.getByRole('dialog', { name: 'Welcome to Estimating Agent' });
    if (await welcomeDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
      const gotItButton = welcomeDialog.getByRole('button', { name: 'Got it' });
      await gotItButton.click();
      await expect(welcomeDialog).not.toBeVisible();
    }
    
    // Handle login dialog if it appears
    const loginDialog = page.getByRole('dialog', { name: 'Login' });
    if (await loginDialog.isVisible({ timeout: 1000 }).catch(() => false)) {
      const closeButton = loginDialog.getByRole('button', { name: 'Close' });
      await closeButton.click();
      await expect(loginDialog).not.toBeVisible();
    }
  });

  test('displays estimator form elements correctly', async ({ page }) => {
    // Check main form elements are visible
    await expect(page.getByRole('heading', { name: 'Construction Estimator' })).toBeVisible();
    await expect(page.getByText('Describe your project to get an instant estimate')).toBeVisible();
    
    // Check textarea with full placeholder text
    const textarea = page.getByRole('textbox', { name: /Describe your construction project in detail/ });
    await expect(textarea).toBeVisible();
    
    // Check helper text is visible (desktop version)
    await expect(page.getByText('Press Enter to submit')).toBeVisible();
  });

  test('textarea accepts input and handles Enter key submission', async ({ page }) => {
    const textarea = page.getByRole('textbox', { name: /Describe your construction project in detail/ });
    
    // Type text in the textarea
    await textarea.click();
    await textarea.fill('Build a new garage with workshop space');
    
    // Verify text was entered
    await expect(textarea).toHaveValue('Build a new garage with workshop space');
    
    // Press Enter to submit
    await page.keyboard.press('Enter');
    
    // Should trigger login dialog for unauthenticated users
    const loginDialog = page.getByRole('dialog', { name: 'Login' });
    await expect(loginDialog).toBeVisible();
    
    // Close login dialog
    await loginDialog.getByRole('button', { name: 'Close' }).click();
    
    // Verify form data persists after closing login dialog
    await expect(textarea).toHaveValue('Build a new garage with workshop space');
  });

  test('handles Shift+Enter for new lines without submitting', async ({ page }) => {
    const textarea = page.getByRole('textbox', { name: /Describe your construction project in detail/ });
    
    await textarea.click();
    await textarea.fill('First line');
    
    // Press Shift+Enter to add new line
    await page.keyboard.press('Shift+Enter');
    await textarea.type('Second line');
    
    // Check that textarea contains both lines
    const textContent = await textarea.inputValue();
    expect(textContent).toContain('First line\nSecond line');
    
    // Verify no dialog appeared (form didn't submit)
    const loginDialog = page.getByRole('dialog', { name: 'Login' });
    await expect(loginDialog).not.toBeVisible();
  });

  test('shows error when trying to submit empty form', async ({ page }) => {
    const textarea = page.getByRole('textbox', { name: /Describe your construction project in detail/ });
    
    // Try to submit with empty textarea
    await textarea.click();
    await page.keyboard.press('Enter');
    
    // Should show error message
    await expect(page.getByText('Please provide a project description')).toBeVisible();
    
    // Login dialog should not appear for empty submission
    const loginDialog = page.getByRole('dialog', { name: 'Login' });
    await expect(loginDialog).not.toBeVisible();
  });

  test('shows error when trying to submit with only spaces', async ({ page }) => {
    const textarea = page.getByRole('textbox', { name: /Describe your construction project in detail/ });
    
    // Type only spaces
    await textarea.click();
    await textarea.fill('   ');
    await page.keyboard.press('Enter');
    
    // Should show error message (spaces are trimmed)
    await expect(page.getByText('Please provide a project description')).toBeVisible();
    
    // Login dialog should not appear
    const loginDialog = page.getByRole('dialog', { name: 'Login' });
    await expect(loginDialog).not.toBeVisible();
  });

  test('mobile submit button works correctly', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    const textarea = page.getByRole('textbox', { name: /Describe your construction project in detail/ });
    
    // Fill textarea with content
    await textarea.click();
    await textarea.fill('Mobile test project');
    
    // Find and click the mobile submit button
    const mobileSubmitButton = page.getByRole('button', { name: 'Submit' });
    await expect(mobileSubmitButton).toBeVisible();
    await mobileSubmitButton.click();
    
    // Should trigger login dialog
    const loginDialog = page.getByRole('dialog', { name: 'Login' });
    await expect(loginDialog).toBeVisible();
  });

  test('mobile submit button is not visible on desktop', async ({ page }) => {
    // Ensure desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    
    // Mobile submit button should not be visible on desktop
    const mobileSubmitButton = page.getByRole('button', { name: 'Submit' });
    await expect(mobileSubmitButton).not.toBeVisible();
  });

  test('displays correct helper text for mobile and desktop', async ({ page }) => {
    // Desktop helper text
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.getByText('Press Enter to submit')).toBeVisible();
    await expect(page.getByText('Tap the arrow to submit')).not.toBeVisible();
    
    // Mobile helper text
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.getByText('Tap the arrow to submit')).toBeVisible();
    await expect(page.getByText('Press Enter to submit')).not.toBeVisible();
  });

  test('form layout is responsive', async ({ page }) => {
    const heading = page.getByRole('heading', { name: 'Construction Estimator' });
    const textarea = page.getByRole('textbox', { name: /Describe your construction project in detail/ });
    
    // Desktop layout
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(heading).toBeVisible();
    await expect(textarea).toBeVisible();
    
    // Mobile layout
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(heading).toBeVisible();
    await expect(textarea).toBeVisible();
    
    // Tablet layout
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(heading).toBeVisible();
    await expect(textarea).toBeVisible();
  });

  test('form is accessible with proper roles and labels', async ({ page }) => {
    // Check accessibility features
    await expect(page.getByRole('heading', { name: 'Construction Estimator' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /Describe your construction project in detail/ })).toBeVisible();
    
    // Check that textarea has proper placeholder
    const textarea = page.getByRole('textbox', { name: /Describe your construction project in detail/ });
    await expect(textarea).toHaveAttribute('placeholder', /Include materials, scope, timeline/);
  });
});