import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should navigate to all main pages', async ({ page }) => {
    await page.goto('/');
    
    // Test Playlists link
    await page.getByRole('link', { name: 'Playlists' }).click();
    await expect(page).toHaveURL(/.*playlists/);
    
    // Test Recordings link
    await page.getByRole('link', { name: 'Recordings' }).click();
    await expect(page).toHaveURL(/.*recordings/);
    
    // Test Events link
    await page.getByRole('link', { name: 'Events' }).click();
    await expect(page).toHaveURL(/.*events/);
    
    // Test Contact link
    await page.getByRole('link', { name: 'Contact' }).click();
    await expect(page).toHaveURL(/.*contact/);
  });

  test('should highlight active page in navigation', async ({ page }) => {
    await page.goto('/playlists/');
    
    const playlistsLink = page.getByRole('link', { name: 'Playlists' });
    const classes = await playlistsLink.getAttribute('class');
    expect(classes).toContain('bg-black');
  });

  test('should have accessible navigation', async ({ page }) => {
    await page.goto('/');
    
    const nav = page.getByRole('navigation', { name: 'Primary navigation' });
    await expect(nav).toBeVisible();
    
    // All links should be keyboard accessible
    const links = nav.locator('a');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
  });
});

