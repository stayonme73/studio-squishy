import type { CampaignRecord } from "@/config/studio-board";
import type { DesignRendererObserverResult } from "@/lib/studio-dispatch/design-renderer-observer";
import type { LaunchMenuObserverResult } from "@/lib/studio-dispatch/launch-menu-production-observer";
import type { JobDispatchRecord } from "@/lib/studio-dispatch/types";

import { assignProductionTeamJobs } from "./assign";
import { appendProductionReport, machineBrokerReport, readProductionTeamLog } from "./bus";
import { certifyPrintFileDeliverable } from "./print-file";
import { printFileRequired } from "./roster";

export function recordMachineProductionPass(input: {
  repoRoot: string;
  campaign: CampaignRecord;
  records: readonly JobDispatchRecord[];
  designResults: readonly DesignRendererObserverResult[];
  launchResults: readonly LaunchMenuObserverResult[];
}): void {
  const packets = assignProductionTeamJobs({
    repoRoot: input.repoRoot,
    campaign: input.campaign,
    records: input.records,
  });
  const byDispatch = new Map(packets.map((packet) => [packet.dispatchId, packet]));

  // A skipped observer result produced nothing and was never reviewed.
  for (const result of input.designResults) {
    if (result.action === "skipped") continue;
    const packet = byDispatch.get(result.dispatchId);
    if (!packet) continue;
    appendProductionReport(
      input.repoRoot,
      machineBrokerReport({
        packet,
        from: "MACHINE",
        to: "DESIGN_PRODUCTION",
        kind: result.ok ? "produced" : "blocker",
        status: result.ok
          ? (result.invocationOutcome ?? "produced")
          : (result.failureCode ?? "failed"),
        message: result.ok
          ? "Machine assigned Design Production and received an artifact."
          : (result.message ?? "Design Production did not pass."),
        artifactRelativePath: result.pngRelativePath,
        qaPassed: result.ok,
      }),
    );
    if (result.ok && printFileRequired(result.skuId)) {
      const print = certifyPrintFileDeliverable({
        repoRoot: input.repoRoot,
        skuId: result.skuId,
        pngRelativePath: result.pngRelativePath,
        pdfRelativePath: result.pdfRelativePath,
      });
      appendProductionReport(
        input.repoRoot,
        machineBrokerReport({
          packet,
          from: "MACHINE",
          to: "PRINT_FILE_PRODUCTION",
          kind: print.ok ? "produced" : "blocker",
          status: print.ok ? "print_file_certified" : print.code,
          message: print.ok
            ? "Print/File Production certified customer-ready digital files. No physical printing or shipping."
            : print.message,
          artifactRelativePath: result.pdfRelativePath ?? result.pngRelativePath,
          qaPassed: print.ok,
        }),
      );
    }
    appendProductionReport(
      input.repoRoot,
      machineBrokerReport({
        packet,
        from: "QUALITY_TEAM",
        to: "MACHINE",
        kind: "qa_result",
        status: result.ok ? "PASS" : "FAIL",
        message: result.ok
          ? "Quality Team passed. Machine may bind Review."
          : "Quality Team failed. Machine returns a correction brief to Design Production.",
        qaPassed: result.ok,
      }),
    );
  }

  for (const result of input.launchResults) {
    if (result.action === "skipped") continue;
    const packet = byDispatch.get(result.dispatchId);
    if (!packet) continue;
    const capability =
      result.skuId === "v2-rtu-short-video" ? "VIDEO_PRODUCTION" : "COPY_PRODUCTION";
    appendProductionReport(
      input.repoRoot,
      machineBrokerReport({
        packet,
        from: "MACHINE",
        to: capability,
        kind: result.ok ? "produced" : "blocker",
        status: result.ok
          ? (result.invocationOutcome ?? "produced")
          : (result.failureCode ?? "failed"),
        message: result.ok
          ? `Machine assigned ${capability} and received work.`
          : (result.message ?? `${capability} did not pass.`),
        artifactRelativePath: result.artifactRelativePath ?? result.mp4RelativePath,
        qaPassed: result.ok,
      }),
    );
    appendProductionReport(
      input.repoRoot,
      machineBrokerReport({
        packet,
        from: "QUALITY_TEAM",
        to: "MACHINE",
        kind: "qa_result",
        status: result.ok ? "PASS" : "FAIL",
        message: result.ok
          ? "Quality Team passed. Machine may bind Review."
          : "Quality Team failed. Machine returns the correction to the responsible capability.",
        qaPassed: result.ok,
      }),
    );
  }

  readProductionTeamLog(input.repoRoot, input.campaign.campaignId);
}
