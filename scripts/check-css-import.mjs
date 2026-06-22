import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import fs from "fs";
import path from "path";

const appDir = path.join(process.cwd(), "src/app");

async function check(label, css) {
  try {
    const result = await postcss([tailwind()]).process(css, {
      from: path.join(appDir, "globals.css"),
    });
    const sb = (result.css.match(/\.sb--v4/g) ?? []).length;
    console.log(`${label}: ok len=${result.css.length} sb--v4=${sb}`);
  } catch (e) {
    console.log(`${label}: FAIL ${e.message}`);
  }
}

const globals = fs.readFileSync(path.join(appDir, "globals.css"), "utf8");
await check("full globals", globals);

const partial = `@import "tailwindcss";\n@import "./campaign-journey-map.css";\n@import "./studio-board.css";\n@import "./studio-canvas.css";\n`;
await check("board slice", partial);
