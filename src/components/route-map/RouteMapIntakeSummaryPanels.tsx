import type { RouteMapClientSummary, RouteMapProductionBrief } from "@/lib/route-map-production-brief";

type ClientProps = {
  summary: RouteMapClientSummary;
};

/** Client-facing Route Map intake summary for Campaign Record. */
export function RouteMapClientSummaryPanel({ summary }: ClientProps) {
  return (
    <div className="cd-vision" data-testid="route-map-client-summary">
      <article className="cd-vision__section">
        <p className="cd-vision__eyebrow">{summary.title}</p>
        {summary.clientNote ? (
          <p className="sb-record-drawer__hint">{summary.clientNote}</p>
        ) : null}
        <div className="cd-vision__answers">
          {summary.items.map((item) => (
            <div key={item.label} className="cd-vision__answer">
              <p className="cd-vision__label">{item.label}</p>
              <p className="cd-vision__value">{item.value}</p>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}

type ProductionProps = {
  brief: RouteMapProductionBrief;
};

/** Internal production brief — team-facing work instructions. */
export function RouteMapProductionBriefPanel({ brief }: ProductionProps) {
  return (
    <div className="cd-vision" data-testid="route-map-production-brief">
      {brief.sections.map((section) => (
        <article key={section.title} className="cd-vision__section">
          <p className="cd-vision__eyebrow">{section.title}</p>
          <div className="cd-vision__answers">
            {section.items.map((item) => (
              <div key={`${section.title}-${item.label}`} className="cd-vision__answer">
                <p className="cd-vision__label">{item.label}</p>
                <p className="cd-vision__value">{item.value}</p>
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
