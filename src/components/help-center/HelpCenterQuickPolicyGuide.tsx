import { helpCenter } from "@/config/help-center";

/** Quick Policy Guide — desktop table + mobile stacked cards (same content). */
export default function HelpCenterQuickPolicyGuide() {
  const { quickPolicyGuide } = helpCenter;

  return (
    <div className="pkg-compare">
      <p className="pkg-compare__lead">{quickPolicyGuide.lead}</p>

      {/* Desktop / wide: table */}
      <div className="pkg-compare__scroll hc-qpg-table">
        <table className="pkg-compare__table">
          <caption className="sr-only">{quickPolicyGuide.title}</caption>
          <thead>
            <tr>
              <th scope="col" className="pkg-compare__feature-head">
                Situation
              </th>
              <th scope="col" className="pkg-compare__pkg-head">
                What Happens
              </th>
              <th scope="col" className="pkg-compare__pkg-head">
                Learn More
              </th>
            </tr>
          </thead>
          <tbody>
            {quickPolicyGuide.rows.map((row) => (
              <tr key={row.id}>
                <th scope="row" className="pkg-compare__feature">
                  {row.situation}
                </th>
                <td className="pkg-compare__cell">{row.summary}</td>
                <td className="pkg-compare__cell">
                  <a href={`#${row.anchor}`} className="hc-toc__link">
                    {row.learnMoreLabel}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phone: stacked cards — same rows, readable without sideways scroll */}
      <ul className="hc-qpg-cards" aria-label={quickPolicyGuide.title}>
        {quickPolicyGuide.rows.map((row) => (
          <li key={row.id} className="hc-qpg-card">
            <p className="hc-qpg-card__situation">{row.situation}</p>
            <p className="hc-qpg-card__summary">{row.summary}</p>
            <a href={`#${row.anchor}`} className="hc-qpg-card__link">
              {row.learnMoreLabel}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
