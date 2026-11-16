import { describeValidation } from "../plan.display";
import type { CarePlanDTO } from "../plan.types";

export function CarePlanDetail({ plan }: { plan: CarePlanDTO }) {
  return (
    <>
      <p>Status: {describeValidation(plan.validation)}</p>
      <ol className="list-decimal space-y-1 pl-5">
        {plan.steps.map((step, index) => (
          <li key={index} className="whitespace-pre-wrap">
            {step}
          </li>
        ))}
      </ol>
      <p className="whitespace-pre-wrap">Uncertainty: {plan.uncertainty}</p>
      <p>This is not a diagnosis. Do not start these steps without medical validation.</p>
    </>
  );
}
