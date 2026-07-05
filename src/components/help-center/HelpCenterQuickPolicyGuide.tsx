import { helpCenter } from "@/config/help-center";

/** Quick Policy Guide — reuses pkg-compare table styling; content-only swap for Help Center. */
export default function HelpCenterQuickPolicyGuide() {
  const { quickPolicyGuide } = helpCenter;

  return (
    <div className="pkg-compare">
      <p className="pkg-compare__lead">{quickPolicyGuide.lead}</p>
      <div className="pkg-compare__scroll">
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
    </div>
  );
}
