import Link from "next/link";

import {
  STUDIO_SELF_TEST_CAMPAIGN_ID,
  STUDIO_SELF_TEST_ROUTE,
  studioSelfTest,
} from "@/config/studio-self-test";
import { FILE_ROOM_ROUTE } from "@/config/file-room";
import type { SelfTestScoreboardView } from "@/lib/studio-self-test/load-results";

type FileRoomSelfTestScoreboardProps = {
  view: SelfTestScoreboardView;
};

function statusLabel(status: string): string {
  switch (status) {
    case "pass":
      return studioSelfTest.summaryPass;
    case "fail":
      return studioSelfTest.summaryFail;
    case "pending":
      return studioSelfTest.summaryPending;
    default:
      return studioSelfTest.summaryNotRun;
  }
}

function statusClass(status: string): string {
  return `fr-self-test__status fr-self-test__status--${status}`;
}

export default function FileRoomSelfTestScoreboard({ view }: FileRoomSelfTestScoreboardProps) {
  const categories = [...new Set(view.rows.map((row) => row.category))];

  return (
    <div className="fr-self-test">
      <p className="fr-lead">{studioSelfTest.pageLead}</p>

      <div className="fr-self-test__summary utility-card">
        <p className="fr-self-test__summary-line">
          <strong>{view.summary.pass}</strong> pass · <strong>{view.summary.fail}</strong> fail ·{" "}
          <strong>{view.summary.pending}</strong> pending · <strong>{view.summary.notRun}</strong>{" "}
          not run · {view.summary.total} total
        </p>
        <p className="fr-header__meta">
          {view.lastSeededAt ? (
            <>
              {studioSelfTest.lastSeededLabel}: {new Date(view.lastSeededAt).toLocaleString()}
              {" · "}
            </>
          ) : null}
          {view.lastRunAt ? (
            <>
              {studioSelfTest.lastRunLabel}: {new Date(view.lastRunAt).toLocaleString()}
            </>
          ) : (
            "Runner not executed yet"
          )}
        </p>
        <p className="fr-header__meta">
          Seed: <code>{studioSelfTest.seedHint}</code> · Run:{" "}
          <code>{studioSelfTest.runHint}</code>
        </p>
        <p className="fr-header__meta">
          <Link href={`${FILE_ROOM_ROUTE}/${STUDIO_SELF_TEST_CAMPAIGN_ID}`}>
            {studioSelfTest.campaignLinkLabel}
          </Link>
        </p>
      </div>

      {categories.map((category) => {
        const rows = view.rows.filter((row) => row.category === category);
        return (
          <section key={category} className="utility-card fr-self-test__section">
            <h2 className="fr-section-title">{category.replace(/-/g, " ")}</h2>
            <div className="fr-self-test__table-wrap">
              <table className="fr-self-test__table">
                <thead>
                  <tr>
                    <th scope="col">Scenario</th>
                    <th scope="col">Expected</th>
                    <th scope="col">Verify</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className={row.status === "fail" ? "fr-self-test__row--fail" : undefined}>
                      <td>
                        <span className="fr-self-test__id">{row.id}</span>
                        <span>{row.scenario}</span>
                        {row.seeded ? (
                          <span className="fr-self-test__badge">seeded</span>
                        ) : null}
                      </td>
                      <td>{row.expectedOutcome}</td>
                      <td>{row.verification}</td>
                      <td>
                        <span className={statusClass(row.status)}>{statusLabel(row.status)}</span>
                        {row.error ? (
                          <p className="fr-self-test__error">{row.error}</p>
                        ) : null}
                        {row.evidence?.length ? (
                          <ul className="fr-self-test__evidence">
                            {row.evidence.map((line) => (
                              <li key={line}>{line}</li>
                            ))}
                          </ul>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      <p className="fr-header__meta">
        <Link href={STUDIO_SELF_TEST_ROUTE}>Refresh scoreboard</Link>
      </p>
    </div>
  );
}
