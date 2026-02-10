import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should load and display hero section', async ({ page }) => {
    await page.goto('/');
    
    // Check hero title
    await expect(page.getByRole('heading', { name: 'The Island' })).toBeVisible();
    
    // Check station info
    await expect(page.getByText('WART 95.5 FM')).toBeVisible();
    
    // Check DJ info
    await expect(page.getByText(/DJ Dub Tractor/)).toBeVisible();
  });

  test('should have working Listen Live button', async ({ page }) => {
    await page.goto('/');
    
    const listenLiveButton = page.getByRole('link', { name: 'Listen Live' });
    await expect(listenLiveButton).toBeVisible();
    
    const href = await listenLiveButton.getAttribute('href');
    expect(href).toContain('voscast.com');
  });

  test('should have working Show Archive button', async ({ page }) => {
    await page.goto('/');
    
    const archiveButton = page.getByRole('link', { name: 'Show Archive' });
    await expect(archiveButton).toBeVisible();
    
    await archiveButton.click();
    await expect(page).toHaveURL(/.*recordings/);
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Hero should still be visible
    await expect(page.getByRole('heading', { name: 'The Island' })).toBeVisible();
    
    // Buttons should stack vertically
    const buttons = page.locator('.btn');
    const firstButton = buttons.first();
    const secondButton = buttons.nth(1);
    
    const firstBox = await firstButton.boundingBox();
    const secondBox = await secondButton.boundingBox();
    
    if (firstBox && secondBox) {
      // Second button should be below first button
      expect(secondBox.y).toBeGreaterThan(firstBox.y + firstBox.height);
    }
  });
});

