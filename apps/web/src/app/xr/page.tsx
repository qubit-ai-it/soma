import type { Metadata } from "next";

import seed from "../../../data/seed/procedures.json";
import { XrExperience } from "@/features/xr/components/xr-experience";
import { procedureFileSchema } from "@/features/xr/procedure.schema";

export const metadata: Metadata = {
  title: "Procedimiento XR | Soma",
  description: "Procedimiento guiado en XR con captura de imagen",
};

const procedure = procedureFileSchema.parse(seed).procedures[0];

export default function XrPage() {
  return (
    <main className="container-soma flex-1 py-12">
      <h1 className="reveal mb-8 text-headline">{procedure.title}</h1>
      <XrExperience procedure={procedure} />
    </main>
  );
}
