import { Decoder, Encoder, Profile, Stream } from '@garmin/fitsdk';
import { describe, expect, it } from 'vitest';
import {
  EDGE_1030_PLUS_PRODUCT_ID,
  isGarminManufacturer,
  isMyWhooshManufacturer,
  modifiedFileName,
  modifyFitDevice
} from '@/utils/fit-device';

function encodeFit(messages: Array<{ mesgNum: number; mesg: Record<string, unknown> }>): Uint8Array {
  const encoder = new Encoder();

  for (const item of messages) {
    encoder.onMesg(item.mesgNum, item.mesg);
  }

  return encoder.close();
}

function decodeDevice(bytes: Uint8Array) {
  const decoder = new Decoder(Stream.fromByteArray(Array.from(bytes)));
  const { messages } = decoder.read({
    expandSubFields: false,
    expandComponents: false,
    mergeHeartRates: false,
    convertTypesToStrings: true
  });

  return {
    fileId: messages.fileIdMesgs?.[0],
    deviceInfo: messages.deviceInfoMesgs?.[0],
    record: messages.recordMesgs?.[0]
  };
}

describe('modifiedFileName', () => {
  it('adds the _modified suffix and normalizes .dms', () => {
    expect(modifiedFileName('MyWhoosh_Ride.fit')).toBe('MyWhoosh_Ride_modified.fit');
    expect(modifiedFileName('activity.dms')).toBe('activity_modified.fit');
  });
});

describe('manufacturer helpers', () => {
  it('detects MyWhoosh and Garmin ids', () => {
    expect(isMyWhooshManufacturer('mywhoosh')).toBe(true);
    expect(isMyWhooshManufacturer(331)).toBe(true);
    expect(isGarminManufacturer('garmin')).toBe(true);
    expect(isGarminManufacturer(1)).toBe(true);
  });
});

describe('modifyFitDevice', () => {
  it('replaces a MyWhoosh device with Garmin Edge 1030 Plus and keeps records', () => {
    const input = encodeFit([
      {
        mesgNum: Profile.MesgNum.FILE_ID,
        mesg: {
          type: 'activity',
          manufacturer: 'mywhoosh',
          product: 0,
          timeCreated: new Date('2026-08-01T10:00:00Z')
        }
      },
      {
        mesgNum: Profile.MesgNum.DEVICE_INFO,
        mesg: {
          timestamp: new Date('2026-08-01T10:00:00Z'),
          deviceIndex: 0,
          manufacturer: 'mywhoosh',
          product: 0
        }
      },
      {
        mesgNum: Profile.MesgNum.RECORD,
        mesg: {
          timestamp: new Date('2026-08-01T10:01:00Z'),
          heartRate: 148,
          power: 220
        }
      }
    ]);

    const result = modifyFitDevice(input);

    expect(result.changed).toBe(true);
    expect(result.action).toBe('patched-mywhoosh');
    expect(result.device.product).toBe(EDGE_1030_PLUS_PRODUCT_ID);

    const decoded = decodeDevice(result.bytes);
    expect(decoded.fileId?.manufacturer).toBe('garmin');
    expect(decoded.fileId?.product).toBe(EDGE_1030_PLUS_PRODUCT_ID);
    expect(decoded.deviceInfo?.manufacturer).toBe('garmin');
    expect(decoded.deviceInfo?.product).toBe(EDGE_1030_PLUS_PRODUCT_ID);
    expect(decoded.record?.heartRate).toBe(148);
    expect(decoded.record?.power).toBe(220);
  });

  it('adds a Garmin device when none is present', () => {
    const input = encodeFit([
      {
        mesgNum: Profile.MesgNum.FILE_ID,
        mesg: {
          type: 'activity',
          timeCreated: new Date('2026-08-01T10:00:00Z')
        }
      },
      {
        mesgNum: Profile.MesgNum.RECORD,
        mesg: {
          timestamp: new Date('2026-08-01T10:01:00Z'),
          cadence: 90
        }
      }
    ]);

    const result = modifyFitDevice(input);
    const decoded = decodeDevice(result.bytes);

    expect(result.action).toBe('patched-missing');
    expect(decoded.deviceInfo?.manufacturer).toBe('garmin');
    expect(decoded.deviceInfo?.product).toBe(EDGE_1030_PLUS_PRODUCT_ID);
    expect(decoded.record?.cadence).toBe(90);
  });

  it('leaves an existing Garmin device unchanged', () => {
    const input = encodeFit([
      {
        mesgNum: Profile.MesgNum.FILE_ID,
        mesg: {
          type: 'activity',
          manufacturer: 'garmin',
          product: 3121,
          timeCreated: new Date('2026-08-01T10:00:00Z')
        }
      },
      {
        mesgNum: Profile.MesgNum.DEVICE_INFO,
        mesg: {
          timestamp: new Date('2026-08-01T10:00:00Z'),
          manufacturer: 'garmin',
          product: 3121
        }
      }
    ]);

    const result = modifyFitDevice(input);

    expect(result.changed).toBe(false);
    expect(result.action).toBe('already-garmin');
    expect(result.bytes).toBe(input);
    expect(decodeDevice(result.bytes).deviceInfo?.product).toBe(3121);
  });

  it('rejects non-FIT bytes', () => {
    expect(() => modifyFitDevice(new Uint8Array([1, 2, 3, 4]))).toThrow(/not a FIT/i);
  });
});
