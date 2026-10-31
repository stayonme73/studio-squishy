import path from "path";
import { fileURLToPath } from "url";

/** October 2026 DigitalOcean droplet studio-company-1 — do not retarget without Owner GO. */
export const DROPLET_EXPECTED = {
  name: "studio-company-1",
  digitalOceanId: "611581495",
  publicIpv4: "68.183.142.179",
  sshUser: "studioadmin",
};

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export function dropletSshIdentityPath() {
  return process.env.STUDIO_DO_SSH_IDENTITY?.trim() || path.join(process.env.USERPROFILE || process.env.HOME || "", ".ssh", "studio-do-ed25519");
}

export function dropletSshTarget(user = DROPLET_EXPECTED.sshUser) {
  return `${user}@${DROPLET_EXPECTED.publicIpv4}`;
}

export function dropletSshBaseArgs() {
  return [
    "-i",
    dropletSshIdentityPath(),
    "-o",
    "IdentitiesOnly=yes",
    "-o",
    "BatchMode=yes",
    "-o",
    "StrictHostKeyChecking=accept-new",
    "-o",
    "ConnectTimeout=25",
  ];
}

export function assertRemoteHostAllowed(remoteHost) {
  const allowed = [
    DROPLET_EXPECTED.publicIpv4,
    `${DROPLET_EXPECTED.sshUser}@${DROPLET_EXPECTED.publicIpv4}`,
    DROPLET_EXPECTED.name,
  ];
  if (!allowed.includes(remoteHost.trim())) {
    throw new Error(`Refusing SSH target ${remoteHost}; expected studio-company-1 @ ${DROPLET_EXPECTED.publicIpv4}.`);
  }
}

export { repoRoot as dropletRepoRoot };
