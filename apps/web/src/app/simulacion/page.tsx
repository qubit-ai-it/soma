import type { Metadata } from "next";
import { SimulationConsole } from "@/features/simulation/simulation-console";

export const metadata: Metadata = { title: "Simulación de tripulación · Soma" };

export default function SimulationPage() {
  return <SimulationConsole />;
}
