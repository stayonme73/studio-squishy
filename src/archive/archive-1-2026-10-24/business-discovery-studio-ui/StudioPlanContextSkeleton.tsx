/** Left-column Studio Plan context shell — structure only until Discovery Mapping wires data. */
export default function StudioPlanContextSkeleton() {
  return (
    <aside className="bds-plan-context" aria-label="Your Studio Plan">
      <p className="bds-plan-context__eyebrow">Your Studio Plan</p>

      <section className="bds-plan-context__section" aria-labelledby="bds-plan-context-services">
        <h2 id="bds-plan-context-services" className="bds-plan-context__title">
          Services
        </h2>
        <ul className="bds-plan-context__skeleton-list" aria-hidden="true">
          <li>
            <span className="bds-plan-context__skeleton-line bds-plan-context__skeleton-line--wide" />
          </li>
          <li>
            <span className="bds-plan-context__skeleton-line bds-plan-context__skeleton-line--wide" />
          </li>
          <li>
            <span className="bds-plan-context__skeleton-line bds-plan-context__skeleton-line--medium" />
          </li>
        </ul>
      </section>

      <section className="bds-plan-context__section" aria-labelledby="bds-plan-context-included">
        <h2 id="bds-plan-context-included" className="bds-plan-context__title">
          Included / Additional
        </h2>
        <ul className="bds-plan-context__skeleton-list" aria-hidden="true">
          <li>
            <span className="bds-plan-context__skeleton-line bds-plan-context__skeleton-line--medium" />
          </li>
          <li>
            <span className="bds-plan-context__skeleton-line bds-plan-context__skeleton-line--short" />
          </li>
        </ul>
      </section>

      <div className="bds-plan-context__total">
        <span className="bds-plan-context__total-label">Estimated total</span>
        <span
          className="bds-plan-context__skeleton-line bds-plan-context__skeleton-line--short"
          aria-hidden="true"
        />
      </div>
    </aside>
  );
}
