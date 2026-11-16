import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { getSessionCaller } from "@/features/roles/roles.session";
import { CPR_EXPERIENCE, cardiacArrestIncident } from "@/features/simulation/simulation.experience";
import { getSimulation } from "@/features/simulation/simulation.store";
import { Icon } from "@/shared/ui/icon";

export const metadata = { title: "CPR experience · Soma" };

export default function CprExperiencePage() {
  return (
    <main className="container-soma flex-1 py-16">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-ink transition-colors duration-[var(--duration-micro)] hover:text-foreground"
      >
        <Icon name="arrow_back" />
        Back to the simulation
      </Link>
      <h1 className="reveal mt-8 text-headline">{CPR_EXPERIENCE.title}</h1>
      <div className="mt-8">
        <Suspense fallback={<p className="text-ink">Loading the experience…</p>}>
          <Experience />
        </Suspense>
      </div>
    </main>
  );
}

async function Experience() {
  await connection();
  if (!(await getSessionCaller())) redirect("/sign-in");
  const incident = cardiacArrestIncident(await getSimulation());

  if (!incident) {
    return (
      <p role="status" className="rounded-2xl bg-card p-5 text-base text-ink">
        There is no emergency right now. This experience starts when a crew member&apos;s pulse drops to 20 bpm or
        below in the crew simulation.
      </p>
    );
  }

  return (
    <section aria-label="CPR guided experience" className="grid gap-4">
      <p className="rounded-2xl bg-card p-5 text-base">
        <strong>{incident.name}</strong> has no reliable pulse. Follow the video and keep the compressions going until
        help takes over.
      </p>
      <video
        controls
        autoPlay
        playsInline
        preload="auto"
        src="/api/experience/cpr/video"
        className="aspect-video w-full rounded-3xl bg-black"
      />
    </section>
  );
}
