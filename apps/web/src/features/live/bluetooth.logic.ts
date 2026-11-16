import { err, ok, type Result } from "../../shared/result.ts";

const HEART_RATE_SERVICE = "heart_rate";
const HEART_RATE_MEASUREMENT = "heart_rate_measurement";

type MeasurementEvent = { target: { value?: DataView } };
type Listener = (event: MeasurementEvent) => void;

type Characteristic = {
  startNotifications(): Promise<unknown>;
  stopNotifications(): Promise<unknown>;
  addEventListener(type: string, listener: Listener): void;
  removeEventListener(type: string, listener: Listener): void;
};

type GattServer = {
  getPrimaryService(service: string): Promise<{
    getCharacteristic(characteristic: string): Promise<Characteristic>;
  }>;
};

type Device = {
  name?: string;
  gatt?: { connect(): Promise<GattServer>; disconnect(): void };
};

export type BluetoothLike = {
  requestDevice(options: { filters: { services: string[] }[] }): Promise<Device>;
};

export type BluetoothError = "unsupported" | "cancelled" | "error";

export type HeartRateConnection = { name: string; stop: () => void };

export function parseHeartRate(view: DataView): number {
  const sixteenBit = (view.getUint8(0) & 0x01) === 1;
  return sixteenBit ? view.getUint16(1, true) : view.getUint8(1);
}

export async function connectHeartRate(
  bluetooth: BluetoothLike | undefined,
  onReading: (bpm: number) => void,
): Promise<Result<HeartRateConnection, BluetoothError>> {
  if (bluetooth === undefined) return err("unsupported");

  let device: Device;
  try {
    device = await bluetooth.requestDevice({ filters: [{ services: [HEART_RATE_SERVICE] }] });
  } catch (cause) {
    return err((cause as { name?: string }).name === "NotFoundError" ? "cancelled" : "error");
  }
  if (device.gatt === undefined) return err("error");
  const gatt = device.gatt;

  try {
    const server = await gatt.connect();
    const service = await server.getPrimaryService(HEART_RATE_SERVICE);
    const characteristic = await service.getCharacteristic(HEART_RATE_MEASUREMENT);

    const listener: Listener = (event) => {
      if (event.target.value) onReading(parseHeartRate(event.target.value));
    };
    characteristic.addEventListener("characteristicvaluechanged", listener);
    await characteristic.startNotifications();

    return ok({
      name: device.name ?? "Device",
      stop: () => {
        characteristic.removeEventListener("characteristicvaluechanged", listener);
        void characteristic.stopNotifications().catch(() => {});
        gatt.disconnect();
      },
    });
  } catch {
    return err("error");
  }
}
