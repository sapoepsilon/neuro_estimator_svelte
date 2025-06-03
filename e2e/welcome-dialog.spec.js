import { test, expect } from '@playwright/test';

test.describe('Welcome Dialog', () => {
  test('displays welcome dialog on first visit', async ({ page }) => {
    await page.goto('/');
    
    // Verify welcome dialog appears
    const welcomeDialog = page.getByRole('dialog', { name: 'Welcome to Estimating Agent' });
    await expect(welcomeDialog).toBeVisible();
    
    // Verify dialog content
    await expect(welcomeDialog.getByRole('heading', { name: 'Welcome to Estimating Agent' })).toBeVisible();
    await expect(welcomeDialog.getByText('AI-Powered Construction Estimation')).toBeVisible();
    await expect(welcomeDialog.getByText('Alpha Release')).toBeVisible();
    await expect(welcomeDialog.getByText('This project is in alpha and may contain bugs. Feedback is appreciated!')).toBeVisible();
    
    // Verify roadmap sections are visible
    await expect(welcomeDialog.getByText('Development Timeline')).toBeVisible();
    await expect(welcomeDialog.getByText('Our Roadmap')).toBeVisible();
    await expect(welcomeDialog.getByText('Phase 1: AI-Enhanced Estimate Sheets')).toBeVisible();
    await expect(welcomeDialog.getByText('Completed')).toBeVisible();
    
    // Verify action buttons are present
    await expect(welcomeDialog.getByRole('button', { name: 'Got it' })).toBeVisible();
    await expect(welcomeDialog.getByRole('button', { name: 'Close' })).toBeVisible();
  });

  test('can be dismissed with "Got it" button', async ({ page }) => {
    await page.goto('/');
    
    const welcomeDialog = page.getByRole('dialog', { name: 'Welcome to Estimating Agent' });
    await expect(welcomeDialog).toBeVisible();
    
    // Click "Got it" button
    const gotItButton = welcomeDialog.getByRole('button', { name: 'Got it' });
    await gotItButton.click();
    
    // Verify dialog is dismissed
    await expect(welcomeDialog).not.toBeVisible();
    
    // Verify main app is accessible
    await expect(page.getByRole('heading', { name: 'Construction Estimator' })).toBeVisible();
    await expect(page.getByPlaceholder('Describe your construction project')).toBeVisible();
  });

  test('can be dismissed with close (X) button', async ({ page }) => {
    await page.goto('/');
    
    const welcomeDialog = page.getByRole('dialog', { name: 'Welcome to Estimating Agent' });
    await expect(welcomeDialog).toBeVisible();
    
    // Click close button (X)
    const closeButton = welcomeDialog.getByRole('button', { name: 'Close' });
    await closeButton.click();
    
    // Verify dialog is dismissed
    await expect(welcomeDialog).not.toBeVisible();
    
    // Verify main app is accessible
    await expect(page.getByRole('heading', { name: 'Construction Estimator' })).toBeVisible();
  });

  test('roadmap phases can be expanded/collapsed', async ({ page }) => {
    await page.goto('/');
    
    const welcomeDialog = page.getByRole('dialog', { name: 'Welcome to Estimating Agent' });
    await expect(welcomeDialog).toBeVisible();
    
    // Phase 1 should be expanded by default
    const phase1Button = welcomeDialog.getByRole('button', { name: /Phase 1.*Completed/ });
    await expect(phase1Button).toHaveAttribute('aria-expanded', 'true');
    await expect(welcomeDialog.getByText('Instantly generate highly accurate sheets')).toBeVisible();
    
    // Test collapsing Phase 1
    await phase1Button.click();
    await expect(phase1Button).toHaveAttribute('aria-expanded', 'false');
    await expect(welcomeDialog.getByText('Instantly generate highly accurate sheets')).not.toBeVisible();
    
    // Test expanding Phase 2
    const phase2Button = welcomeDialog.getByRole('button', { name: /Phase 2.*In Progress/ });
    await expect(phase2Button).toHaveAttribute('aria-expanded', 'false');
    await phase2Button.click();
    await expect(phase2Button).toHaveAttribute('aria-expanded', 'true');
  });

  test('dialog does not appear on subsequent visits within session', async ({ page }) => {
    // First visit - dialog should appear
    await page.goto('/');
    const welcomeDialog = page.getByRole('dialog', { name: 'Welcome to Estimating Agent' });
    await expect(welcomeDialog).toBeVisible();
    
    // Dismiss the dialog
    await welcomeDialog.getByRole('button', { name: 'Got it' }).click();
    await expect(welcomeDialog).not.toBeVisible();
    
    // Navigate away and back - dialog should not appear again
    await page.goto('/#/estimator');
    await page.goto('/');
    
    // Wait a moment to see if dialog would appear
    await page.waitForTimeout(1000);
    
    // Dialog should not be visible on return visit
    await expect(welcomeDialog).not.toBeVisible();
    
    // Main content should be immediately accessible
    await expect(page.getByRole('heading', { name: 'Construction Estimator' })).toBeVisible();
  });

  test('timeline visualization is displayed correctly', async ({ page }) => {
    await page.goto('/');
    
    const welcomeDialog = page.getByRole('dialog', { name: 'Welcome to Estimating Agent' });
    await expect(welcomeDialog).toBeVisible();
    
    // Check current date indicator (dynamic based on actual date)
    const currentDateText = await welcomeDialog.locator('span:has-text("Currently:")').textContent();
    expect(currentDateText).toMatch(/Currently: \w+ \d{4}/);
    
    // Check timeline months are displayed (target only the month labels below timeline)
    const monthLabels = welcomeDialog.locator('.flex.justify-between.text-xs.text-gray-600');
    await expect(monthLabels.getByText('Apr 2025')).toBeVisible();
    await expect(monthLabels.getByText('May 2025')).toBeVisible();
    await expect(monthLabels.getByText('Jun 2025')).toBeVisible();
    await expect(monthLabels.getByText('Jul 2025')).toBeVisible();
    await expect(monthLabels.getByText('Aug 2025')).toBeVisible();
    
    // Check numbered timeline steps (more specific selectors to avoid ambiguity)
    await expect(welcomeDialog.locator('.relative.h-14 span').getByText('1')).toBeVisible();
    await expect(welcomeDialog.locator('.relative.h-14 span').getByText('2')).toBeVisible();
    await expect(welcomeDialog.locator('.relative.h-14 span').getByText('3')).toBeVisible();
    await expect(welcomeDialog.locator('.relative.h-14 span').getByText('4')).toBeVisible();
    await expect(welcomeDialog.locator('.relative.h-14 span').getByText('5')).toBeVisible();
  });

  test('MCP tools phase shows correct content when expanded', async ({ page }) => {
    await page.goto('/');
    
    const welcomeDialog = page.getByRole('dialog', { name: 'Welcome to Estimating Agent' });
    await expect(welcomeDialog).toBeVisible();
    
    // Find and expand Phase 3 (MCP Tool Integration)
    const phase3Button = welcomeDialog.getByRole('button', { name: /Phase 3.*MCP Tool Integration.*In Progress/ });
    await expect(phase3Button).toBeVisible();
    await phase3Button.click();
    await expect(phase3Button).toHaveAttribute('aria-expanded', 'true');
    
    // Verify MCP-specific content is visible
    await expect(welcomeDialog.getByText('Web search integration for real-time pricing data')).toBeVisible();
    await expect(welcomeDialog.getByText('File system operations for document management')).toBeVisible();
    await expect(welcomeDialog.getByText('External service connections via MCP protocol')).toBeVisible();
  });

  test('timeline red marker shows current position dynamically', async ({ page }) => {
    await page.goto('/');
    
    const welcomeDialog = page.getByRole('dialog', { name: 'Welcome to Estimating Agent' });
    await expect(welcomeDialog).toBeVisible();
    
    // Find the red timeline marker
    const redMarker = welcomeDialog.locator('.bg-red-500');
    await expect(redMarker).toBeVisible();
    
    // Verify the marker has a style attribute with left position
    const markerStyle = await redMarker.getAttribute('style');
    expect(markerStyle).toMatch(/left:\s*\d+%/);
    
    // Calculate expected position for current date
    const today = new Date();
    const startDate = new Date('2025-04-01');
    const endDate = new Date('2025-08-30');
    
    let expectedPercentage;
    if (today < startDate) {
      expectedPercentage = 0;
    } else if (today > endDate) {
      expectedPercentage = 100;
    } else {
      const totalDuration = endDate.getTime() - startDate.getTime();
      const currentProgress = today.getTime() - startDate.getTime();
      expectedPercentage = Math.round((currentProgress / totalDuration) * 100);
    }
    
    // Verify the position matches expected calculation
    expect(markerStyle).toContain(`left: ${expectedPercentage}%`);
  });
});