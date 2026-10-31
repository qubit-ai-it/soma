import { getCrewCards } from "../crew.queries";
import { CrewCard } from "./crew-card";

export async function CrewSection() {
  const crew = await getCrewCards();
  return (
    <section aria-labelledby="crew-heading">
      <h2 id="crew-heading" className="mb-4 text-xl font-semibold">
        Tripulación
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {crew.map((member) => (
          <CrewCard key={member.id} member={member} />
        ))}
      </div>
      <p className="mt-4 text-xs text-zinc-500">
        Datos de demostración desde JSON local. Los umbrales son ilustrativos, no
        orientación clínica.
      </p>
    </section>
  );
}
