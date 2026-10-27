/**
 * Hosted Preview HTTP — vercel curl with cookie jar (T5 pattern) and robust response parse.
 */
import { spawnSync } from "child_process";
import { randomBytes } from "crypto";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";

export function parseHttpResponse(out) {
  const text = String(out ?? "");
  const httpIdx = text.indexOf("HTTP/");
  const slice = httpIdx >= 0 ? text.slice(httpIdx) : text;
  const headerEnd = slice.indexOf("\r\n\r\n");
  const headerBlock = headerEnd >= 0 ? slice.slice(0, headerEnd) : slice;
  const bodyRaw = headerEnd >= 0 ? slice.slice(headerEnd + 4) : "";
  const statusMatch = headerBlock.match(/^HTTP\/[\d.]+ (\d+)/m);
  const status = statusMatch ? Number(statusMatch[1]) : 0;
  return { status, headerBlock, bodyText: bodyRaw.trim() };
}

export function parseJsonBody(bodyText) {
  const jsonStart = bodyText.indexOf("{");
  if (jsonStart < 0) return null;
  const slice = bodyText.slice(jsonStart);
  try {
    return JSON.parse(slice);
  } catch {
    // curl may append transfer stats after the JSON body on Windows shells.
    for (let end = slice.length; end > 0; end--) {
      if (slice[end - 1] !== "}") continue;
      try {
        return JSON.parse(slice.slice(0, end));
      } catch {
        continue;
      }
    }
    return null;
  }
}

export function createHostedVercelCurl({ repoRoot, deploymentId, tmpDir }) {
  mkdirSync(tmpDir, { recursive: true });

  function vercelCurl(
    route,
    {
      method = "GET",
      body,
      rawBody,
      jar,
      headers = [],
      stripeSignature,
      binaryOutPath,
    } = {},
  ) {
    const args = ["vercel", "curl", route, "--deployment", deploymentId, "-i"];
    if (binaryOutPath) {
      args.push("-o", binaryOutPath.replace(/\\/g, "/"));
    }
    if (method !== "GET") args.push("-X", method);
    for (const h of headers) args.push("-H", h);
    if (stripeSignature) args.push("-H", `Stripe-Signature: ${stripeSignature}`);

    if (rawBody != null) {
      const bodyPath = path.join(tmpDir, `raw-${randomBytes(4).toString("hex")}.json`);
      writeFileSync(bodyPath, rawBody, "utf8");
      args.push("-H", "Content-Type: application/json", "--data-binary", `@${bodyPath.replace(/\\/g, "/")}`);
    } else if (body != null) {
      const bodyPath = path.join(tmpDir, `body-${randomBytes(4).toString("hex")}.json`);
      writeFileSync(bodyPath, JSON.stringify(body), "utf8");
      args.push("-H", "Content-Type: application/json", "--data-binary", `@${bodyPath.replace(/\\/g, "/")}`);
    }

    if (jar) {
      if (!existsSync(jar)) writeFileSync(jar, "", "utf8");
      const jarPath = jar.replace(/\\/g, "/");
      args.push("-b", jarPath, "-c", jarPath);
    }

    const r = spawnSync("npx", args, {
      cwd: repoRoot,
      shell: true,
      maxBuffer: 24 * 1024 * 1024,
      encoding: "utf8",
    });
    if (r.error) {
      return { status: 0, headerBlock: "", bodyText: String(r.error.message), spawnError: true };
    }
    return parseHttpResponse(`${r.stdout ?? ""}${r.stderr ?? ""}`);
  }

  /** Signed Stripe webhook POST (PowerShell reads signature file — comma-safe on Windows). */
  function vercelStripeWebhook(rawBody, stripeSignature) {
    const bodyPath = path.join(tmpDir, `wh-${randomBytes(4).toString("hex")}.json`);
    const sigPath = path.join(tmpDir, `wh-sig-${randomBytes(4).toString("hex")}.txt`);
    writeFileSync(bodyPath, rawBody, "utf8");
    writeFileSync(sigPath, stripeSignature.trim(), "utf8");
    const bodyArg = bodyPath.replace(/\\/g, "/");
    const sigFile = sigPath.replace(/'/g, "''");
    const ps =
      `$sig = Get-Content -Raw '${sigFile}'; ` +
      `npx vercel curl '/api/payments/webhook' --deployment ${deploymentId} -X POST -i ` +
      `-H 'Content-Type: application/json' -H ('Stripe-Signature: ' + $sig.Trim()) ` +
      `--data-binary '@${bodyArg}'`;
    const r = spawnSync("powershell", ["-NoProfile", "-Command", ps], {
      cwd: repoRoot,
      maxBuffer: 24 * 1024 * 1024,
      encoding: "utf8",
    });
    if (r.error) {
      return { status: 0, headerBlock: "", bodyText: String(r.error.message), spawnError: true };
    }
    return parseHttpResponse(`${r.stdout ?? ""}${r.stderr ?? ""}`);
  }

  /** GET binary body to disk (no response headers in output file). */
  function vercelCurlBinary(route, { jar, outPath } = {}) {
    // Do not pass `-sS`: Vercel CLI treats `-S` as `--scope` on Windows.
    const args = [
      "vercel",
      "curl",
      route,
      "--deployment",
      deploymentId,
      "--silent",
      "--show-error",
      "--write-out",
      "%{http_code}",
      "--output",
      outPath.replace(/\\/g, "/"),
    ];
    if (jar) {
      if (!existsSync(jar)) writeFileSync(jar, "", "utf8");
      const jarPath = jar.replace(/\\/g, "/");
      args.push("-b", jarPath, "-c", jarPath);
    }
    const r = spawnSync("npx", args, {
      cwd: repoRoot,
      shell: true,
      maxBuffer: 24 * 1024 * 1024,
      encoding: "utf8",
    });
    const status = Number(String(r.stdout ?? "").trim()) || 0;
    return { status, spawnError: Boolean(r.error) };
  }

  return { vercelCurl, vercelCurlBinary, vercelStripeWebhook, parseJsonBody };
}
