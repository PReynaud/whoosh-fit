import { Decoder, Encoder, Profile, Stream } from '@garmin/fitsdk';
import type { Mesg } from '@garmin/fitsdk';

interface DeviceMesg extends Mesg {
  manufacturer?: string | number;
  product?: number;
  productName?: string;
  timestamp?: Date | number;
  timeCreated?: Date | number;
  deviceIndex?: number;
}

/** Matches the existing modifier-fit.bat tool (Garmin profile also lists 3570 as Edge 1030 Plus). */
export const EDGE_1030_PLUS_PRODUCT_ID = 3095;
export const TARGET_DEVICE_NAME = 'Garmin Edge 1030 Plus';
export const GARMIN_IMPORT_URL = 'https://connect.garmin.com/modern/import-data';
export const MYWHOOSH_ACTIVITIES_URL = 'https://event.mywhoosh.com/user/activities';

const GARMIN_MANUFACTURER = 'garmin';
const MYWHOOSH_MANUFACTURER = 'mywhoosh';
const FILE_ID = Profile.MesgNum.FILE_ID ?? 0;
const DEVICE_INFO = Profile.MesgNum.DEVICE_INFO ?? 23;

export type FitAction = 'patched-mywhoosh' | 'patched-missing' | 'already-garmin';

export interface FitDeviceSummary {
  manufacturer: string | number | undefined;
  product: number | undefined;
  productName?: string;
  label: string;
}

export interface FitModifyResult {
  action: FitAction;
  changed: boolean;
  bytes: Uint8Array;
  device: FitDeviceSummary;
  previousDevice: FitDeviceSummary | null;
}

interface CollectedMesg {
  mesgNum: number;
  mesg: DeviceMesg;
}

function manufacturerKey(value: unknown): string {
  if (typeof value === 'string') {
    return value.toLowerCase();
  }

  if (typeof value === 'number') {
    const named = Profile.types.manufacturer?.[value];
    if (named) {
      return named.toLowerCase();
    }

    return String(value);
  }

  return '';
}

export function isMyWhooshManufacturer(value: unknown): boolean {
  const key = manufacturerKey(value);
  return key === MYWHOOSH_MANUFACTURER || key.includes('whoosh');
}

export function isGarminManufacturer(value: unknown): boolean {
  const key = manufacturerKey(value);
  return key === GARMIN_MANUFACTURER || key === '1';
}

export function describeDevice(
  manufacturer: unknown,
  product: unknown,
  productName?: unknown
): FitDeviceSummary {
  const productId = typeof product === 'number' ? product : undefined;
  const name = typeof productName === 'string' && productName.trim() ? productName.trim() : undefined;
  const mfg = manufacturerKey(manufacturer) || 'unknown';

  let label = name ?? 'Unknown device';
  if (!name) {
    if (isMyWhooshManufacturer(manufacturer)) {
      label = 'MyWhoosh';
    } else if (isGarminManufacturer(manufacturer) && productId === EDGE_1030_PLUS_PRODUCT_ID) {
      label = TARGET_DEVICE_NAME;
    } else if (isGarminManufacturer(manufacturer) && productId != null) {
      label = `Garmin product ${productId}`;
    } else if (mfg && mfg !== 'unknown') {
      label = productId != null ? `${mfg} (${productId})` : mfg;
    }
  }

  return {
    manufacturer: typeof manufacturer === 'string' || typeof manufacturer === 'number'
      ? manufacturer
      : undefined,
    product: productId,
    productName: name,
    label
  };
}

export function modifiedFileName(originalName: string): string {
  const trimmed = originalName.trim() || 'activity.fit';
  const base = trimmed.replace(/\.(fit|dms)$/i, '');
  return `${base}_modified.fit`;
}

function streamFromBytes(bytes: Uint8Array): Stream {
  return Stream.fromByteArray(Array.from(bytes));
}

function collectMessages(bytes: Uint8Array): CollectedMesg[] {
  const stream = streamFromBytes(bytes);

  if (!Decoder.isFIT(stream)) {
    throw new Error('This file is not a FIT activity.');
  }

  const decoder = new Decoder(stream);
  const collected: CollectedMesg[] = [];
  const { errors } = decoder.read({
    applyScaleAndOffset: true,
    expandSubFields: false,
    expandComponents: false,
    mergeHeartRates: false,
    convertTypesToStrings: true,
    convertDateTimesToDates: true,
    mesgListener: (mesgNum: number, mesg: Mesg) => {
      collected.push({ mesgNum, mesg: mesg as DeviceMesg });
    }
  });

  if (collected.length === 0) {
    const detail = errors[0]?.message;
    throw new Error(detail ? `Could not read this FIT file: ${detail}` : 'Could not read this FIT file.');
  }

  return collected;
}

function deviceFromMessages(messages: CollectedMesg[]): FitDeviceSummary | null {
  const fileId = messages.find(item => item.mesgNum === FILE_ID)?.mesg;
  const deviceInfo = messages.find(item => item.mesgNum === DEVICE_INFO)?.mesg;
  const source = deviceInfo ?? fileId;

  if (!source || (source.manufacturer == null && source.product == null && source.productName == null)) {
    return null;
  }

  return describeDevice(source.manufacturer, source.product, source.productName);
}

function decideAction(messages: CollectedMesg[]): FitAction {
  const relevant = messages.filter(item => item.mesgNum === FILE_ID || item.mesgNum === DEVICE_INFO);

  if (relevant.some(item => isMyWhooshManufacturer(item.mesg.manufacturer)
    || (typeof item.mesg.productName === 'string' && item.mesg.productName.toLowerCase().includes('whoosh')))) {
    return 'patched-mywhoosh';
  }

  const hasGarminProduct = relevant.some(item => (
    isGarminManufacturer(item.mesg.manufacturer) && typeof item.mesg.product === 'number'
  ));

  if (hasGarminProduct) {
    return 'already-garmin';
  }

  return 'patched-missing';
}

function applyTargetDevice(mesg: DeviceMesg): DeviceMesg {
  return {
    ...mesg,
    manufacturer: GARMIN_MANUFACTURER,
    product: EDGE_1030_PLUS_PRODUCT_ID,
    productName: TARGET_DEVICE_NAME
  };
}

function encodeMessages(messages: CollectedMesg[]): Uint8Array {
  const encoder = new Encoder();

  for (const item of messages) {
    encoder.onMesg(item.mesgNum, item.mesg);
  }

  return encoder.close();
}

export function modifyFitDevice(bytes: Uint8Array): FitModifyResult {
  const messages = collectMessages(bytes);
  const previousDevice = deviceFromMessages(messages);
  const action = decideAction(messages);

  if (action === 'already-garmin') {
    return {
      action,
      changed: false,
      bytes,
      device: previousDevice ?? describeDevice(GARMIN_MANUFACTURER, EDGE_1030_PLUS_PRODUCT_ID),
      previousDevice
    };
  }

  let sawDeviceInfo = false;
  const patched = messages.map((item) => {
    if (item.mesgNum === FILE_ID || item.mesgNum === DEVICE_INFO) {
      if (item.mesgNum === DEVICE_INFO) {
        sawDeviceInfo = true;
      }

      return { mesgNum: item.mesgNum, mesg: applyTargetDevice(item.mesg) };
    }

    return item;
  });

  if (!sawDeviceInfo) {
    const fileId = patched.find(item => item.mesgNum === FILE_ID);
    const insertAt = fileId ? patched.indexOf(fileId) + 1 : 0;
    patched.splice(insertAt, 0, {
      mesgNum: DEVICE_INFO,
      mesg: applyTargetDevice({
        timestamp: fileId?.mesg.timeCreated ?? new Date(),
        deviceIndex: 0
      })
    });
  }

  const bytesOut = encodeMessages(patched);

  return {
    action,
    changed: true,
    bytes: bytesOut,
    device: describeDevice(GARMIN_MANUFACTURER, EDGE_1030_PLUS_PRODUCT_ID, TARGET_DEVICE_NAME),
    previousDevice
  };
}
