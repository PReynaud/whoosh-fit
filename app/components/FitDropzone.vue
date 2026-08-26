<script setup lang="ts">
import { ref } from 'vue';
import { useFitStore, type FitJob } from '@/stores/fit';

const store = useFitStore();
const fileInput = ref<HTMLInputElement | null>(null);
const dragging = ref(false);

const statusTitle = (job: FitJob) => {
  if (job.error) {
    return 'Could not convert';
  }

  if (job.result?.action === 'already-garmin') {
    return 'Already a Garmin device';
  }

  if (job.result?.action === 'patched-mywhoosh') {
    return 'MyWhoosh replaced with Edge 1030 Plus';
  }

  return 'Device set to Edge 1030 Plus';
};

function onFiles(fileList: FileList | File[] | null) {
  if (!fileList) {
    return;
  }

  const files = Array.from(fileList).filter(file => (
    /\.(fit|dms)$/i.test(file.name) || file.type === 'application/octet-stream'
  ));

  if (files.length === 0) {
    store.setError('Drop a .fit or .dms file exported from MyWhoosh.');
    return;
  }

  void store.processFiles(files);
}

function onDrop(event: DragEvent) {
  dragging.value = false;
  event.preventDefault();
  onFiles(event.dataTransfer?.files ?? null);
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <button
      type="button"
      class="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition"
      :class="dragging
        ? 'border-primary bg-primary/5'
        : 'border-muted hover:border-primary hover:bg-elevated'"
      :disabled="store.loading"
      data-testid="fit-dropzone"
      @click="fileInput?.click()"
      @dragenter.prevent="dragging = true"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop="onDrop"
    >
      <UIcon
        name="i-lucide-gauge"
        class="size-10 text-primary"
      />
      <div>
        <p class="text-lg font-semibold text-highlighted">
          Drop a MyWhoosh FIT file
        </p>
        <p class="mt-1 text-sm text-muted">
          .fit or .dms — rewritten in your browser, original file untouched.
        </p>
      </div>
      <UButton
        label="Choose file"
        icon="i-lucide-upload"
        :loading="store.loading"
        @click.stop="fileInput?.click()"
      />
    </button>

    <input
      ref="fileInput"
      type="file"
      class="sr-only"
      accept=".fit,.dms,application/octet-stream"
      multiple
      data-testid="fit-file-input"
      :disabled="store.loading"
      @change="onFiles(($event.target as HTMLInputElement).files)"
    >

    <UAlert
      v-if="store.error"
      color="error"
      variant="subtle"
      :title="store.error"
    />

    <UCard
      v-for="job in store.jobs"
      :key="job.id"
      :data-testid="`fit-job-${job.sourceName}`"
    >
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p class="font-semibold text-highlighted">
            {{ statusTitle(job) }}
          </p>
          <p class="mt-1 text-sm text-muted">
            {{ job.sourceName }}
            <span v-if="job.result">
              → {{ job.result.previousDevice?.label ?? 'no device' }}
              → {{ job.result.device.label }}
            </span>
          </p>
          <p
            v-if="job.error"
            class="mt-2 text-sm text-error"
          >
            {{ job.error }}
          </p>
        </div>

        <div class="flex flex-wrap gap-2">
          <UButton
            v-if="job.result"
            label="Download FIT"
            icon="i-lucide-download"
            color="neutral"
            variant="subtle"
            @click="store.downloadJob(job)"
          />
          <UButton
            v-if="job.result"
            label="Open Garmin import"
            icon="i-lucide-external-link"
            @click="store.openGarminImport()"
          />
        </div>
      </div>
    </UCard>
  </div>
</template>
