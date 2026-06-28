import { promises as fs } from "fs";
import path from "path";

import type { StudioUser, StudioUserRecord } from "@/lib/campaign-store/types";

import seedUsers from "./studio-users.seed.json";

const USERS_PATH = path.join(process.cwd(), "data", "studio-users.json");

async function ensureUsersFile(): Promise<void> {
  await fs.mkdir(path.dirname(USERS_PATH), { recursive: true });
  try {
    await fs.access(USERS_PATH);
  } catch {
    await fs.writeFile(USERS_PATH, JSON.stringify(seedUsers, null, 2), "utf8");
  }
}

export async function listStudioUsers(): Promise<StudioUserRecord[]> {
  await ensureUsersFile();
  const raw = await fs.readFile(USERS_PATH, "utf8");
  return JSON.parse(raw) as StudioUserRecord[];
}

export async function findUserByEmail(email: string): Promise<StudioUserRecord | null> {
  const normalized = email.trim().toLowerCase();
  const users = await listStudioUsers();
  return users.find((user) => user.email.toLowerCase() === normalized) ?? null;
}

export async function findUserById(id: string): Promise<StudioUserRecord | null> {
  const users = await listStudioUsers();
  return users.find((user) => user.id === id) ?? null;
}

export function toPublicUser(record: StudioUserRecord): StudioUser {
  const { password: _password, ...user } = record;
  return user;
}

export async function verifyLogin(
  email: string,
  password: string,
): Promise<StudioUser | null> {
  const user = await findUserByEmail(email);
  if (!user || user.password !== password) return null;
  return toPublicUser(user);
}

export async function updateUserCurrentCampaign(
  userId: string,
  campaignId: string | undefined,
): Promise<StudioUser | null> {
  const users = await listStudioUsers();
  const index = users.findIndex((user) => user.id === userId);
  if (index === -1) return null;

  users[index] = {
    ...users[index],
    currentCampaignId: campaignId,
  };

  await fs.writeFile(USERS_PATH, JSON.stringify(users, null, 2), "utf8");
  return toPublicUser(users[index]);
}
