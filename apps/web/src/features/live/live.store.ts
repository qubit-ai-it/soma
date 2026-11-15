"use client";

import { useSyncExternalStore } from "react";

import {
  connectHeartRate,
  type BluetoothError,
  type BluetoothLike,
  type HeartRateConnection,
} from "./bluetooth.logic";
import type { Reading } from "./live.logic";

export type LiveState = {
  status: "idle" | "connecting" | "connected";
  deviceName: string | null;
  error: BluetoothError | null;
  readings: readonly Reading[];
};

const MAX_READINGS = 20000;
const IDLE: LiveState = { status: "idle", deviceName: null, error: null, readings: [] };

const listeners = new Set<() => void>();
let state: LiveState = IDLE;
let connection: HeartRateConnection | null = null;

function update(next: Partial<LiveState>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function addReading(bpm: number) {
  const readings = [...state.readings, { at: Date.now(), bpm }];
  update({ readings: readings.length > MAX_READINGS ? readings.slice(-MAX_READINGS) : readings });
}

export function getLiveState(): LiveState {
  return state;
}

export function disconnectLive() {
  connection?.stop();
  connection = null;
  update({ status: "idle", deviceName: null, readings: [] });
}

export async function connectLive(): Promise<BluetoothError | null> {
  connection?.stop();
  connection = null;
  update({ status: "connecting", error: null, readings: [] });

  const bluetooth = (navigator as unknown as { bluetooth?: BluetoothLike }).bluetooth;
  const result = await connectHeartRate(bluetooth, addReading);
  if (!result.ok) {
    update({ status: "idle", error: result.error });
    return result.error;
  }
  connection = result.value;
  update({ status: "connected", deviceName: result.value.name });
  return null;
}

export function useLiveState(): LiveState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => IDLE,
  );
}
