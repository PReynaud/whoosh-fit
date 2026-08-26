import { test, expect } from '@playwright/test';
import { waitForNuxtHydration } from './helpers/wait-for-hydration';

test('landing page shows the FIT drop zone', async ({ page }) => {
  await page.goto('/');
  await waitForNuxtHydration(page);

  await expect(page.getByRole('heading', { name: 'WhooshFit' })).toBeVisible();
  await expect(page.getByTestId('fit-dropzone')).toBeVisible();
  await expect(page.getByRole('link', { name: 'MyWhoosh activities' })).toBeVisible();
});
