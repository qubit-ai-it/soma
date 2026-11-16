import { DeviceCard } from "@/features/live/components/device-card";
import { HeadsetCard } from "@/features/xr/components/headset-card";

export const metadata = { title: "Devices · Soma" };

export default function DevicesPage() {
  return (
    <div className="space-y-10">
      <section aria-labelledby="measurement" className="space-y-4">
        <h2 id="measurement" className="font-heading text-xl font-bold">
          Measurement
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <DeviceCard />
        </div>
      </section>

      <section aria-labelledby="experiences" className="space-y-4">
        <h2 id="experiences" className="font-heading text-xl font-bold">
          Experiences
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <HeadsetCard />
        </div>
      </section>
    </div>
  );
}
