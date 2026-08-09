import { studioKitchenProductionCapability } from "@/config/studio-kitchen-production-capability-v1";
import type { KitchenJobProjection } from "@/lib/studio-kitchen";

type Props = {
  jobs: readonly KitchenJobProjection[];
};

export default function StudioKitchenProductionContractPanel({ jobs }: Props) {
  const copy = studioKitchenProductionCapability;

  return (
    <section className="utility-card" aria-labelledby="sk-production-contract">
      <h2 id="sk-production-contract">{copy.sectionTitle}</h2>
      <p>{copy.sectionLead}</p>
      <p role="note">{copy.readinessDisclaimer}</p>
      {jobs.length === 0 ? (
        <p>{copy.emptyContract}</p>
      ) : (
        <ul>
          {jobs.map((job) => {
            const contract = job.productionContract;
            if (!contract) {
              return (
                <li key={job.jobId}>
                  <strong>
                    {job.serviceName} ({job.skuId})
                  </strong>
                  {" — "}
                  {copy.emptyContract}
                </li>
              );
            }
            return (
              <li key={job.jobId}>
                <strong>
                  {job.serviceName} ({job.skuId})
                </strong>
                {" — "}
                {contract.readinessLabel}
                {` · producer: ${contract.producerRoleLabel}`}
                {` · tool: ${contract.primaryToolLabel}`}
                {` · inputs: ${contract.requiredInputCount}`}
                {` · QA checks: ${contract.qaItemCount}`}
                {` · deliverables: ${contract.deliverableCount}`}
                <br />
                <span>{contract.readinessNotes}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
