import { DemoConductor } from "@/features/demo/components/demo-conductor";
import { DEMO_STEPS } from "@/features/demo/demo.script";
import { raiseDemoF3Alert } from "./actions";

export default function DemoPage() {
  return (
    <main className="container-soma flex-1 py-10">
      <h1 className="mb-2 text-display">Demo guiada</h1>
      <p className="mb-8 text-sm text-ink">
        Datos sintéticos y reglas de demostración. Prototipo de investigación, no es un dispositivo
        médico ni una escala clínica.
      </p>
      <DemoConductor steps={DEMO_STEPS} raiseF3={raiseDemoF3Alert} />
    </main>
  );
}
