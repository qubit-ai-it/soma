import { LiveBoard } from "@/features/live/components/live-board";

import { escalateLiveAlert } from "./actions";

export const metadata = { title: "En vivo · Soma" };

export default function LivePage() {
  return (
    <main className="container-soma flex-1 py-12">
      <h1 className="reveal mb-8 text-headline">En vivo</h1>
      <LiveBoard escalate={escalateLiveAlert} />
    </main>
  );
}
