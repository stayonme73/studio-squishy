import { promises as fs } from "fs";
import path from "path";

import {
  STUDIO_SELF_TEST_CAMPAIGN_ID,
  STUDIO_SELF_TEST_RESULTS_RELATIVE_PATH,
} from "@/config/studio-self-test";
import {
  STUDIO_SELF_TEST_MATRIX,
  type SelfTestMatrixStatus,
} from "@/config/studio-self-test-matrix";

export type SelfTestRowResult = {
  status: SelfTestMatrixStatus;
  lastRunAt?: string;
  evidence?: readonly string[];
  error?: string;
};

export type SelfTestResultsFile = {
  campaignId: string;
  lastSeededAt?: string;
  lastRunAt?: string;
  rows: Record<string, SelfTestRowResult>;
};

function resultsPath(): string {
  return path.join(process.cwd(), STUDIO_SELF_TEST_RESULTS_RELATIVE_PATH);
}

export function buildEmptySelfTestResults(now = new Date().toISOString()): SelfTestResultsFile {
  const rows: Record<string, SelfTestRowResult> = {};
  for (const row of STUDIO_SELF_TEST_MATRIX) {
    rows[row.id] = { status: "not_run" };
  }
  return {
    campaignId: STUDIO_SELF_TEST_CAMPAIGN_ID,
    lastRunAt: undefined,
    lastSeededAt: now,
    rows,
  };
}

export async function readSelfTestResults(): Promise<SelfTestResultsFile> {
  try {
    const raw = await fs.readFile(resultsPath(), "utf8");
    const parsed = JSON.parse(raw) as SelfTestResultsFile;
    return mergeResultsWithMatrix(parsed);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return buildEmptySelfTestResults();
    }
    throw error;
  }
}

/** Ensure every matrix row has a results entry (matrix is source of truth for rows). */
export function mergeResultsWithMatrix(file: SelfTestResultsFile): SelfTestResultsFile {
  const rows = { ...file.rows };
  for (const row of STUDIO_SELF_TEST_MATRIX) {
    if (!rows[row.id]) {
      rows[row.id] = { status: "not_run" };
    }
  }
  return { ...file, campaignId: STUDIO_SELF_TEST_CAMPAIGN_ID, rows };
}

export async function writeSelfTestResults(file: SelfTestResultsFile): Promise<void> {
  const target = resultsPath();
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, JSON.stringify(mergeResultsWithMatrix(file), null, 2), "utf8");
}

export type SelfTestScoreboardRow = {
  id: string;
  category: string;
  scenario: string;
  expectedOutcome: string;
  verification: string;
  seeded: boolean;
  status: SelfTestMatrixStatus;
  lastRunAt?: string;
  evidence?: readonly string[];
  error?: string;
};

export type SelfTestScoreboardView = {
  campaignId: string;
  lastSeededAt?: string;
  lastRunAt?: string;
  rows: SelfTestScoreboardRow[];
  summary: {
    pass: number;
    fail: number;
    pending: number;
    notRun: number;
    total: number;
  };
};

export async function loadSelfTestScoreboard(): Promise<SelfTestScoreboardView> {
  const results = await readSelfTestResults();
  const rows: SelfTestScoreboardRow[] = STUDIO_SELF_TEST_MATRIX.map((matrixRow) => {
    const result = results.rows[matrixRow.id] ?? { status: "not_run" as const };
    return {
      id: matrixRow.id,
      category: matrixRow.category,
      scenario: matrixRow.scenario,
      expectedOutcome: matrixRow.expectedOutcome,
      verification: matrixRow.verification,
      seeded: matrixRow.seeded,
      status: result.status,
      lastRunAt: result.lastRunAt,
      evidence: result.evidence,
      error: result.error,
    };
  });

  const summary = {
    pass: rows.filter((row) => row.status === "pass").length,
    fail: rows.filter((row) => row.status === "fail").length,
    pending: rows.filter((row) => row.status === "pending").length,
    notRun: rows.filter((row) => row.status === "not_run").length,
    total: rows.length,
  };

  return {
    campaignId: results.campaignId,
    lastSeededAt: results.lastSeededAt,
    lastRunAt: results.lastRunAt,
    rows,
    summary,
  };
}
