import type { Metadata } from "next";
import { SimulationConsole } from "@/features/simulation/simulation-console";

export const metadata: Metadata = { title: "Simulación de tripulación · Soma" };
export const instant = false;

export default function Home() {
  return <SimulationConsole />;
}
