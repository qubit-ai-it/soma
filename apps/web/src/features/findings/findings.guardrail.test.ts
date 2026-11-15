import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { checkFindings } from "./findings.guardrail.ts";

function blocked(text: string): string {
  const result = checkFindings(text);
  assert.equal(result.allowed, false, `should block: ${text}`);
  assert.ok(!result.allowed && result.reason.length > 0);
  return result.allowed ? "" : result.reason;
}

describe("checkFindings", () => {
  it("allows a descriptive preliminary finding", () => {
    const text =
      "La imagen muestra una estructura central de contorno regular. No se realizaron mediciones automáticas.";
    assert.deepEqual(checkFindings(text), { allowed: true });
  });

  it("allows a text that denies being a diagnosis", () => {
    assert.equal(
      checkFindings("Estos hallazgos no son un diagnóstico y requieren revisión del médico.").allowed,
      true,
    );
    assert.equal(checkFindings("This is not a diagnosis; a physician must review it.").allowed, true);
  });

  it("blocks Spanish diagnostic statements", () => {
    blocked("El paciente tiene una colecistitis aguda.");
    blocked("El astronauta padece litiasis.");
    blocked("Usted sufre de una hernia.");
    blocked("Se diagnostica apendicitis.");
    blocked("El diagnóstico es neumotórax.");
    blocked("Se confirma el diagnóstico de trombosis.");
  });

  it("blocks English diagnostic statements", () => {
    blocked("The patient has a gallstone.");
    blocked("You have appendicitis.");
    blocked("This is diagnosed as a pneumothorax.");
    blocked("The diagnosis is a fracture.");
    blocked("Findings confirm a diagnosis of thrombosis.");
  });

  it("blocks Spanish prescriptions", () => {
    blocked("Se recomienda tomar ibuprofeno cada 8 horas.");
    blocked("Se receta paracetamol.");
    blocked("Debe administrar 500 mg de amoxicilina.");
    blocked("Inyecte la dosis indicada.");
  });

  it("blocks English prescriptions", () => {
    blocked("Take 400 mg of ibuprofen twice a day.");
    blocked("I prescribe antibiotics.");
    blocked("You should take the medication every 8 hours.");
    blocked("Administer the drug immediately.");
  });

  it("is case and accent insensitive", () => {
    blocked("EL PACIENTE TIENE UNA HERNIA");
    blocked("el diagnostico es neumotorax");
  });

  it("returns a reason that names the kind of violation", () => {
    assert.match(blocked("El paciente tiene una hernia."), /diagn/i);
    assert.match(blocked("Se receta paracetamol."), /prescrip/i);
  });
});
