import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { getErrorMessage } from '@/utils/error-message';
import {
  GARMIN_IMPORT_URL,
  modifiedFileName,
  modifyFitDevice,
  type FitModifyResult
} from '@/utils/fit-device';

export interface FitJob {
  id: string;
  sourceName: string;
  outputName: string;
  result: FitModifyResult | null;
  error: string | null;
}

function downloadBytes(name: string, bytes: Uint8Array) {
  const copy = new Uint8Array(bytes);
  const blob = new Blob([copy], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export const useFitStore = defineStore('fit', () => {
  const jobs = ref<FitJob[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const latest = computed(() => jobs.value[0] ?? null);
  const hasJobs = computed(() => jobs.value.length > 0);

  const setError = (message: string | null) => {
    error.value = message;
  };

  const processFiles = async (files: File[]) => {
    loading.value = true;
    error.value = null;
    const next: FitJob[] = [];

    try {
      for (const file of files) {
        const outputName = modifiedFileName(file.name);

        try {
          const bytes = new Uint8Array(await file.arrayBuffer());
          const result = modifyFitDevice(bytes);
          const name = result.changed ? outputName : file.name.replace(/\.dms$/i, '.fit');
          next.push({
            id: `${file.name}-${file.size}-${file.lastModified}`,
            sourceName: file.name,
            outputName: name,
            result,
            error: null
          });
          downloadBytes(name, result.bytes);
        } catch (err: unknown) {
          next.push({
            id: `${file.name}-${file.size}-${file.lastModified}`,
            sourceName: file.name,
            outputName,
            result: null,
            error: getErrorMessage(err, 'Could not modify this FIT file')
          });
        }
      }

      jobs.value = [...next, ...jobs.value];
      return { data: next, error: null };
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err, 'Could not read the dropped files');
      error.value = errorMessage;
      return { data: null, error: errorMessage };
    } finally {
      loading.value = false;
    }
  };

  const downloadJob = (job: FitJob) => {
    if (!job.result?.bytes.length || job.error) {
      return;
    }

    downloadBytes(job.outputName, job.result.bytes);
  };

  const openGarminImport = () => {
    window.open(GARMIN_IMPORT_URL, '_blank', 'noopener,noreferrer');
  };

  return {
    jobs,
    loading,
    error,
    latest,
    hasJobs,
    processFiles,
    downloadJob,
    openGarminImport,
    setError
  };
});
