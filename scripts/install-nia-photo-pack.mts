/**
 * Install controlled fictional Nia photo pack from Cursor chat attachments.
 */
import { copyFileSync, mkdirSync, writeFileSync } from "fs";
import path from "path";
import sharp from "sharp";

const repoRoot = process.cwd();
const srcDir = path.join(
  process.env.USERPROFILE || "",
  ".cursor/projects/c-Users-tagia-studio-squishy-kitchen-foundation-1/assets",
);
const destDir = path.join(
  repoRoot,
  "docs/launch/studio-operating-room-4b-launch-toolbox-certification-1/nia-photo-pack",
);

mkdirSync(destDir, { recursive: true });

const pairs: Array<{ from: string; to: string; kind: "logo" | "photo" }> = [
  {
    from: "c__Users_tagia_AppData_Roaming_Cursor_User_workspaceStorage_e157292c6e7653c86d2101fccb50a7af_images_ChatGPT_Image_Aug_19__2026__10_01_10_PM__1_-a8fb714f-d269-470d-8878-3f9d5b650b5e.png",
    to: "nia-logo.png",
    kind: "logo",
  },
  {
    from: "c__Users_tagia_AppData_Roaming_Cursor_User_workspaceStorage_e157292c6e7653c86d2101fccb50a7af_images_ChatGPT_Image_Aug_19__2026__10_01_10_PM__2_-1cce5d9c-0ada-45a9-9c6a-7c8e8e4d2e7f.png",
    to: "nia-photo-good-1.jpg",
    kind: "photo",
  },
  {
    from: "c__Users_tagia_AppData_Roaming_Cursor_User_workspaceStorage_e157292c6e7653c86d2101fccb50a7af_images_ChatGPT_Image_Aug_19__2026__10_01_10_PM__3_-e5959755-f7f7-4d73-8b62-c121f1f0e8f4.png",
    to: "nia-photo-good-2.jpg",
    kind: "photo",
  },
  {
    from: "c__Users_tagia_AppData_Roaming_Cursor_User_workspaceStorage_e157292c6e7653c86d2101fccb50a7af_images_ChatGPT_Image_Aug_19__2026__10_01_11_PM__4_-f9a4d01b-49b6-48cd-8bee-7476c267645a.png",
    to: "nia-photo-good-3.jpg",
    kind: "photo",
  },
  {
    from: "c__Users_tagia_AppData_Roaming_Cursor_User_workspaceStorage_e157292c6e7653c86d2101fccb50a7af_images_ChatGPT_Image_Aug_19__2026__10_01_12_PM__5_-f4bfd509-e338-4e7f-8626-49f48f3f416c.png",
    to: "nia-photo-good-4.jpg",
    kind: "photo",
  },
  {
    from: "c__Users_tagia_AppData_Roaming_Cursor_User_workspaceStorage_e157292c6e7653c86d2101fccb50a7af_images_ChatGPT_Image_Aug_19__2026__10_01_12_PM__6_-c9ebb170-ed2e-418b-8149-617921f2a600.png",
    to: "nia-photo-mediocre-1.jpg",
    kind: "photo",
  },
  {
    from: "c__Users_tagia_AppData_Roaming_Cursor_User_workspaceStorage_e157292c6e7653c86d2101fccb50a7af_images_ChatGPT_Image_Aug_19__2026__10_01_13_PM__7_-7e096c3b-ddc0-4bf0-8e30-077e3286fc96.png",
    to: "nia-photo-mediocre-2.jpg",
    kind: "photo",
  },
];

for (const p of pairs) {
  const absFrom = path.join(srcDir, p.from);
  const absTo = path.join(destDir, p.to);
  if (p.kind === "logo") {
    copyFileSync(absFrom, absTo);
    const meta = await sharp(absTo).metadata();
    console.log(p.to, `${meta.width}x${meta.height}`);
    continue;
  }
  const meta = await sharp(absFrom).metadata();
  const minEdge = Math.min(meta.width || 0, meta.height || 0);
  let pipeline = sharp(absFrom);
  if (minEdge > 0 && minEdge < 800) {
    const scale = 800 / minEdge;
    pipeline = pipeline.resize(
      Math.round((meta.width || 0) * scale),
      Math.round((meta.height || 0) * scale),
      { kernel: "lanczos3" },
    );
  }
  await pipeline.jpeg({ quality: 92 }).toFile(absTo);
  const out = await sharp(absTo).metadata();
  console.log(
    p.to,
    `${meta.width}x${meta.height}`,
    "->",
    `${out.width}x${out.height}`,
  );
}

writeFileSync(
  path.join(destDir, "MANIFEST.md"),
  `# Controlled fictional Nia photo pack

**Purpose:** Room 4B photo-led live certification style/system testing only.
**Not** final customer deliverables.

| File | Asset ID | Source label |
|------|----------|--------------|
| nia-logo.png | nia-logo | nia_rooted_wellness_botanical_logo |
| nia-photo-good-1.jpg | nia-photo-good-1 | serene_wellness_portrait_by_the_window (default hero) |
| nia-photo-good-2.jpg | nia-photo-good-2 | serene_modern_wellness_studio |
| nia-photo-good-3.jpg | nia-photo-good-3 | grounded_morning_self_care_ritual |
| nia-photo-good-4.jpg | nia-photo-good-4 | nia_rooted_wellness_storefront |
| nia-photo-mediocre-1.jpg | nia-photo-mediocre-1 | cozy_spa_portrait_with_locs |
| nia-photo-mediocre-2.jpg | nia-photo-mediocre-2 | cozy_home_office_portrait |

Campaign copy still uses Rooted & Ready Fall Reset fixture facts.
Logo artwork reads “Nia Rooted Wellness” (fictional cert brand mark).
`,
  "utf8",
);

console.log("PACK_READY", destDir);
