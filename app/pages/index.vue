<script setup lang="ts">
import {
  GARMIN_IMPORT_URL,
  MYWHOOSH_ACTIVITIES_URL
} from '@/utils/fit-device';
</script>

<template>
  <div>
    <UPageHero
      title="WhooshFit"
      description="Rewrite a MyWhoosh activity as a Garmin Edge 1030 Plus, then drop the file on Garmin Connect. The FIT never leaves this browser."
    />

    <UPageSection>
      <div class="mx-auto flex max-w-3xl flex-col gap-8">
        <ol class="grid gap-4 sm:grid-cols-3">
          <li class="rounded-lg bg-elevated p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-primary">
              1. Export
            </p>
            <p class="mt-2 text-sm text-muted">
              Download the .fit from
              <NuxtLink
                :to="MYWHOOSH_ACTIVITIES_URL"
                target="_blank"
                class="text-highlighted underline"
              >
                MyWhoosh activities
              </NuxtLink>
              (no public API, so this step stays manual).
            </p>
          </li>
          <li class="rounded-lg bg-elevated p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-primary">
              2. Patch
            </p>
            <p class="mt-2 text-sm text-muted">
              Drop the file here. MyWhoosh is replaced with Garmin Edge 1030 Plus, same as modifier-fit.bat.
            </p>
          </li>
          <li class="rounded-lg bg-elevated p-4">
            <p class="text-xs font-semibold uppercase tracking-wide text-primary">
              3. Import
            </p>
            <p class="mt-2 text-sm text-muted">
              Open
              <NuxtLink
                :to="GARMIN_IMPORT_URL"
                target="_blank"
                class="text-highlighted underline"
              >
                Garmin Connect import
              </NuxtLink>
              while signed in, then drop the downloaded file.
            </p>
          </li>
        </ol>

        <FitDropzone />

        <UAlert
          color="neutral"
          variant="subtle"
          title="Why Garmin does not upload by itself"
          description="This site cannot use your Garmin Connect session. Browsers keep connect.garmin.com cookies on that domain only, so the patched file is downloaded and the import page opens next to it."
        />
      </div>
    </UPageSection>
  </div>
</template>
