/**
 * Hosted Preview HTTP — vercel curl with cookie jar (T5 pattern) and robust response parse.
 */
import { spawnSync } from "child_process";
import { randomBytes } from "crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
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
  const lines = String(bodyText ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (!line.startsWith("{")) continue;
    try {
      const parsed = JSON.parse(line);
      if (!parsed || typeof parsed !== "object") continue;
      if (parsed.heartbeat === true && parsed.mode == null && parsed.launchResults == null) {
        continue;
      }
      if (
        parsed.mode != null ||
        parsed.launchResults != null ||
        parsed.error != null ||
        parsed.ok === false
      ) {
        return parsed;
      }
    } catch {
      continue;
    }
  }
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

function quoteCmdArg(value) {
  return `"${String(value).replace(/"/g, '\\"')}"`;
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
      /** Serverless clip/SFV production may run several minutes on Preview. */
      longRunning = false,
    } = {},
  ) {
    const parts = ["npx", "vercel", "curl", quoteCmdArg(route), "--deployment", deploymentId, "-i"];
    if (binaryOutPath) {
      parts.push("-o", quoteCmdArg(binaryOutPath.replace(/\\/g, "/")));
    }
    if (method !== "GET") parts.push("-X", method);
    for (const h of headers) parts.push("-H", quoteCmdArg(h));
    if (stripeSignature) {
      parts.push("-H", quoteCmdArg(`Stripe-Signature: ${stripeSignature}`));
    }

    if (rawBody != null) {
      const bodyPath = path.join(tmpDir, `raw-${randomBytes(4).toString("hex")}.json`);
      writeFileSync(bodyPath, rawBody, "utf8");
      parts.push(
        "-H",
        quoteCmdArg("Content-Type: application/json"),
        "--data-binary",
        `@${bodyPath.replace(/\\/g, "/")}`,
      );
    } else if (body != null) {
      const bodyPath = path.join(tmpDir, `body-${randomBytes(4).toString("hex")}.json`);
      writeFileSync(bodyPath, JSON.stringify(body), "utf8");
      parts.push(
        "-H",
        quoteCmdArg("Content-Type: application/json"),
        "--data-binary",
        `@${bodyPath.replace(/\\/g, "/")}`,
      );
    }

    if (jar) {
      if (!existsSync(jar)) writeFileSync(jar, "", "utf8");
      const jarPath = jar.replace(/\\/g, "/");
      parts.push("-b", quoteCmdArg(jarPath), "-c", quoteCmdArg(jarPath));
    }

    const r = spawnSync(parts.join(" "), {
      cwd: repoRoot,
      shell: true,
      maxBuffer: 24 * 1024 * 1024,
      encoding: "utf8",
      ...(longRunning ? { timeout: 2_700_000 } : {}),
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

  /** Multipart upload (materials API uses PATCH, not POST). */
  function vercelCurlMultipart(route, { method = "PATCH", jar, fields, fileField, filePath } = {}) {
    const bodyPath = path.join(tmpDir, `multipart-body-${randomBytes(4).toString("hex")}.txt`);
    const args = [
      "vercel",
      "curl",
      route,
      "--deployment",
      deploymentId,
      "-X",
      method,
      "--silent",
      "--show-error",
      "--write-out",
      "%{http_code}",
      "--output",
      bodyPath.replace(/\\/g, "/"),
    ];
    for (const [key, value] of Object.entries(fields ?? {})) {
      args.push("-F", `${key}=${value}`);
    }
    if (fileField && filePath) {
      args.push("-F", `${fileField}=@${filePath.replace(/\\/g, "/")}`);
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
    const status = Number(String(r.stdout ?? "").trim()) || 0;
    let bodyText = "";
    try {
      bodyText = existsSync(bodyPath) ? readFileSync(bodyPath, "utf8") : "";
    } catch {
      bodyText = "";
    }
    return { status, headerBlock: "", bodyText };
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

  return { vercelCurl, vercelCurlBinary, vercelCurlMultipart, vercelStripeWebhook, parseJsonBody };
}
