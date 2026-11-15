import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { connectHeartRate, parseHeartRate } from "./bluetooth.logic.ts";

const view = (bytes: number[]) => new DataView(new Uint8Array(bytes).buffer);

function fakeDevice(name?: string) {
  type Listener = (event: { target: { value?: DataView } }) => void;
  const listeners: Listener[] = [];
  const characteristic = {
    startNotifications: async () => characteristic,
    stopNotifications: async () => characteristic,
    addEventListener: (_type: string, cb: Listener) => void listeners.push(cb),
    removeEventListener: (_type: string, cb: Listener) => {
      const i = listeners.indexOf(cb);
      if (i >= 0) listeners.splice(i, 1);
    },
  };
  const server = {
    getPrimaryService: async () => ({ getCharacteristic: async () => characteristic }),
  };
  let connected = true;
  const device = {
    name,
    gatt: { connect: async () => server, disconnect: () => void (connected = false) },
  };
  return {
    device,
    emit: (bytes: number[]) => listeners.forEach((cb) => cb({ target: { value: view(bytes) } })),
    isConnected: () => connected,
  };
}

describe("parseHeartRate", () => {
  it("reads an 8-bit value", () => {
    assert.equal(parseHeartRate(view([0x00, 72])), 72);
  });

  it("reads a 16-bit little-endian value", () => {
    assert.equal(parseHeartRate(view([0x01, 0x2c, 0x01])), 300);
  });
});

describe("connectHeartRate", () => {
  it("is unsupported without Web Bluetooth", async () => {
    assert.deepEqual(await connectHeartRate(undefined, () => {}), {
      ok: false,
      error: "unsupported",
    });
  });

  it("reports a cancelled picker", async () => {
    const bluetooth = {
      requestDevice: async () => {
        throw Object.assign(new Error("none"), { name: "NotFoundError" });
      },
    };
    assert.deepEqual(await connectHeartRate(bluetooth, () => {}), {
      ok: false,
      error: "cancelled",
    });
  });

  it("reports an error when the device has no GATT or the connection fails", async () => {
    const noGatt = { requestDevice: async () => ({ name: "x" }) };
    assert.deepEqual(await connectHeartRate(noGatt, () => {}), { ok: false, error: "error" });

    const failing = {
      requestDevice: async () => ({
        name: "x",
        gatt: {
          connect: async () => {
            throw new Error("boom");
          },
          disconnect: () => {},
        },
      }),
    };
    assert.deepEqual(await connectHeartRate(failing, () => {}), { ok: false, error: "error" });
  });

  it("returns the device name, streams readings and stops cleanly", async () => {
    const fake = fakeDevice("Banda de pecho");
    const readings: number[] = [];
    const result = await connectHeartRate({ requestDevice: async () => fake.device }, (bpm) =>
      readings.push(bpm),
    );
    assert.ok(result.ok);
    if (!result.ok) return;
    assert.equal(result.value.name, "Banda de pecho");

    fake.emit([0, 70]);
    fake.emit([0, 72]);
    assert.deepEqual(readings, [70, 72]);

    result.value.stop();
    fake.emit([0, 99]);
    assert.deepEqual(readings, [70, 72]);
    assert.equal(fake.isConnected(), false);
  });

  it("falls back to a generic name for an unnamed device", async () => {
    const fake = fakeDevice();
    const result = await connectHeartRate({ requestDevice: async () => fake.device }, () => {});
    assert.ok(result.ok && result.value.name === "Dispositivo");
  });
});
