import { test, expect } from '@playwright/test';

test.describe('EstimatorForm Fixes - Enter Key and Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Handle any initial dialogs
    const welcomeDialog = page.getByRole('dialog', { name: 'Welcome to Estimating Agent' });
    if (await welcomeDialog.isVisible({ timeout: 3000 }).catch(() => false)) {
      const closeButton = welcomeDialog.getByRole('button', { name: 'Close' });
      await closeButton.click();
      await expect(welcomeDialog).not.toBeVisible();
    }
    
    // Close login dialog if it auto-opens
    const loginDialog = page.getByRole('dialog', { name: 'Login' });
    if (await loginDialog.isVisible({ timeout: 1000 }).catch(() => false)) {
      const closeButton = loginDialog.getByRole('button', { name: 'Close' });
      await closeButton.click();
      await expect(loginDialog).not.toBeVisible();
    }
  });

  test.describe('Enter Key Functionality', () => {
    test('pressing Enter submits the form when text is present', async ({ page }) => {
      const textarea = page.getByPlaceholder('Describe your construction project in detail');
      
      // Type text in the textarea
      await textarea.click();
      await textarea.fill('Build a two-story house with modern design');
      
      // Press Enter
      await page.keyboard.press('Enter');
      
      // Verify that either login dialog appears (if not logged in) or form submits
      // In this case, we expect login dialog since we're not authenticated
      const loginDialog = page.getByRole('dialog', { name: 'Login' });
      await expect(loginDialog).toBeVisible({ timeout: 5000 });
    });

    test('pressing Shift+Enter creates a new line instead of submitting', async ({ page }) => {
      const textarea = page.getByPlaceholder('Describe your construction project in detail');
      
      await textarea.click();
      await textarea.fill('First line');
      
      // Press Shift+Enter
      await page.keyboard.press('Shift+Enter');
      
      // Type more text
      await textarea.type('Second line');
      
      // Check that the textarea contains both lines
      const textContent = await textarea.inputValue();
      expect(textContent).toContain('First line\nSecond line');
      
      // Verify no dialog appeared
      const loginDialog = page.getByRole('dialog', { name: 'Login' });
      await expect(loginDialog).not.toBeVisible();
    });

    test('Enter key does not submit when textarea is empty', async ({ page }) => {
      const textarea = page.getByPlaceholder('Describe your construction project in detail');
      
      await textarea.click();
      await page.keyboard.press('Enter');
      
      // Should show error message
      await expect(page.getByText('Please provide a project description')).toBeVisible();
      
      // Login dialog should not appear
      const loginDialog = page.getByRole('dialog', { name: 'Login' });
      await expect(loginDialog).not.toBeVisible();
    });

    test('Enter key does not submit when textarea has only spaces', async ({ page }) => {
      const textarea = page.getByPlaceholder('Describe your construction project in detail');
      
      await textarea.click();
      await textarea.fill('   '); // Only spaces
      await page.keyboard.press('Enter');
      
      // Should show error message
      await expect(page.getByText('Please provide a project description')).toBeVisible();
    });
  });

  test.describe('Login Dialog Integration', () => {
    test('login dialog appears when unauthenticated user submits form', async ({ page }) => {
      const textarea = page.getByPlaceholder('Describe your construction project in detail');
      
      // Fill and submit the form
      await textarea.click();
      await textarea.fill('Renovate kitchen with new cabinets');
      await page.keyboard.press('Enter');
      
      // Verify login dialog appears
      const loginDialog = page.getByRole('dialog', { name: 'Login' });
      await expect(loginDialog).toBeVisible();
      
      // Verify dialog has expected elements
      await expect(loginDialog.getByRole('heading', { name: 'Login' })).toBeVisible();
      await expect(loginDialog.getByRole('textbox', { name: 'Email' })).toBeVisible();
      await expect(loginDialog.getByRole('textbox', { name: 'Password' })).toBeVisible();
      await expect(loginDialog.getByRole('button', { name: 'Login' })).toBeVisible();
      await expect(loginDialog.getByRole('button', { name: 'Need an account? Sign up' })).toBeVisible();
    });

    test('form data persists after closing login dialog', async ({ page }) => {
      const textarea = page.getByPlaceholder('Describe your construction project in detail');
      const testText = 'Build a garage with workshop space';
      
      // Fill form and submit
      await textarea.click();
      await textarea.fill(testText);
      await page.keyboard.press('Enter');
      
      // Wait for login dialog
      const loginDialog = page.getByRole('dialog', { name: 'Login' });
      await expect(loginDialog).toBeVisible();
      
      // Close the dialog
      await loginDialog.getByRole('button', { name: 'Close' }).click();
      await expect(loginDialog).not.toBeVisible();
      
      // Verify form data is still there
      await expect(textarea).toHaveValue(testText);
    });
  });

  test.describe('Navbar Login Button', () => {
    test('navbar login button is clickable and opens login dialog', async ({ page }) => {
      // Find and click the login button in navbar
      const loginButton = page.getByRole('button', { name: 'Login / Sign Up' });
      await expect(loginButton).toBeVisible();
      
      // Click the button
      await loginButton.click();
      
      // Verify login dialog opens
      const loginDialog = page.getByRole('dialog', { name: 'Login' });
      await expect(loginDialog).toBeVisible();
    });

    test('navbar login button works even when form has content', async ({ page }) => {
      // Add content to form
      const textarea = page.getByPlaceholder('Describe your construction project in detail');
      await textarea.click();
      await textarea.fill('Some project description');
      
      // Click navbar login button
      const loginButton = page.getByRole('button', { name: 'Login / Sign Up' });
      await loginButton.click();
      
      // Verify login dialog opens
      const loginDialog = page.getByRole('dialog', { name: 'Login' });
      await expect(loginDialog).toBeVisible();
    });

    test('navbar remains accessible with proper z-index', async ({ page }) => {
      // This test verifies the navbar button isn't blocked by other elements
      const loginButton = page.getByRole('button', { name: 'Login / Sign Up' });
      
      // Check button is visible and has proper styling
      await expect(loginButton).toBeVisible();
      
      // Get the navbar container
      const navbar = page.locator('.border-b.w-full.relative.z-50.bg-white');
      await expect(navbar).toBeVisible();
      
      // Verify the button can be clicked without timeout
      await expect(loginButton).toBeEnabled();
      const startTime = Date.now();
      await loginButton.click({ timeout: 1000 }); // Short timeout to ensure no blocking
      const clickTime = Date.now() - startTime;
      
      // Click should happen quickly (less than 500ms)
      expect(clickTime).toBeLessThan(500);
      
      // Verify dialog opened
      const loginDialog = page.getByRole('dialog', { name: 'Login' });
      await expect(loginDialog).toBeVisible();
    });
  });

  test.describe('Mobile Submit Button', () => {
    test('mobile submit button appears and works on small screens', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      const textarea = page.getByPlaceholder('Describe your construction project in detail');
      await textarea.click();
      await textarea.fill('Mobile test project');
      
      // Find the mobile submit button (arrow icon)
      const mobileSubmitButton = page.locator('button[aria-label="Submit"]');
      await expect(mobileSubmitButton).toBeVisible();
      
      // Click the button
      await mobileSubmitButton.click();
      
      // Verify login dialog appears
      const loginDialog = page.getByRole('dialog', { name: 'Login' });
      await expect(loginDialog).toBeVisible();
    });

    test('mobile submit button is disabled when textarea is empty', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      const mobileSubmitButton = page.locator('button[aria-label="Submit"]');
      await expect(mobileSubmitButton).toBeVisible();
      await expect(mobileSubmitButton).toBeDisabled();
    });
  });

  test.describe('Form Textarea Auto-resize', () => {
    test('textarea expands as content is added', async ({ page }) => {
      const textarea = page.getByPlaceholder('Describe your construction project in detail');
      
      // Get initial height
      const initialHeight = await textarea.evaluate(el => el.offsetHeight);
      
      // Add multiple lines of content
      await textarea.click();
      await textarea.fill('Line 1\nLine 2\nLine 3\nLine 4\nLine 5');
      
      // Get new height
      const expandedHeight = await textarea.evaluate(el => el.offsetHeight);
      
      // Verify textarea expanded
      expect(expandedHeight).toBeGreaterThan(initialHeight);
    });
  });
});

test.describe('Authentication Flow', () => {
  test('sign out button appears when user is logged in', async ({ page, context }) => {
    // Mock authentication by setting a fake session cookie
    await context.addCookies([{
      name: 'sb-access-token',
      value: 'fake-token',
      domain: 'localhost',
      path: '/'
    }]);
    
    await page.goto('/');
    
    // Look for sign out button instead of login
    const signOutButton = page.getByRole('button', { name: 'Sign Out' });
    
    // Note: This test might not work without actual auth setup
    // It's included as a template for when auth is properly configured
  });
});