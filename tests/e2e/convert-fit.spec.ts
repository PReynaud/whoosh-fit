import { Encoder, Profile } from '@garmin/fitsdk';
import { expect, test } from '@playwright/test';
import { waitForNuxtHydration } from './helpers/wait-for-hydration';

function buildMyWhooshFit(): Buffer {
  const encoder = new Encoder();
  encoder.onMesg(Profile.MesgNum.FILE_ID, {
    type: 'activity',
    manufacturer: 'mywhoosh',
    product: 0,
    timeCreated: new Date('2026-08-01T10:00:00Z')
  });
  encoder.onMesg(Profile.MesgNum.DEVICE_INFO, {
    timestamp: new Date('2026-08-01T10:00:00Z'),
    deviceIndex: 0,
    manufacturer: 'mywhoosh',
    product: 0
  });
  encoder.onMesg(Profile.MesgNum.RECORD, {
    timestamp: new Date('2026-08-01T10:01:00Z'),
    heartRate: 148,
    power: 220
  });

  return Buffer.from(encoder.close());
}

test('converts a dropped MyWhoosh FIT and offers Garmin import', async ({ page }) => {
  await page.goto('/');
  await waitForNuxtHydration(page);

  const downloadPromise = page.waitForEvent('download');

  await page.getByTestId('fit-file-input').setInputFiles({
    name: 'MyWhoosh_Ride.fit',
    mimeType: 'application/octet-stream',
    buffer: buildMyWhooshFit()
  });

  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('MyWhoosh_Ride_modified.fit');

  await expect(page.getByText('MyWhoosh replaced with Edge 1030 Plus')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Garmin import' })).toBeVisible();
});
