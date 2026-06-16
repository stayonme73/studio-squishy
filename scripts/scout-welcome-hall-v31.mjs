/**
 * Scout kiosk hotspot visibility across viewports (cover framing, v31 1920x1080).
 */
const native = { width: 1920, height: 1080 };
const kiosk = { x: 1440, y: 502, width: 394, height: 537 };
const framingDefault = { x: 0.5, y: 0.5, fit: "cover" };
const framingPortrait = { x: 0.5, y: 0.5, fit: "contain" };

function welcomeHallFraming(viewport) {
  const { width, height } = viewport;
  if (width > 0 && height > width && width <= 768) {
    return framingPortrait;
  }
  return framingDefault;
}

function sceneRectToFitPercent(rect, viewport, framing) {
  const { width: iw, height: ih } = native;
  const { width: vw, height: vh } = viewport;
  const scale =
    framing.fit === "contain"
      ? Math.min(vw / iw, vh / ih)
      : Math.max(vw / iw, vh / ih);
  const renderedW = iw * scale;
  const renderedH = ih * scale;
  const marginX = (vw - renderedW) * framing.x;
  const marginY = (vh - renderedH) * framing.y;

  const mapPoint = (px, py) => ({
    x: px * scale + marginX,
    y: py * scale + marginY,
  });

  const topLeft = mapPoint(rect.x, rect.y);

  return {
    left: `${(topLeft.x / vw) * 100}%`,
    top: `${(topLeft.y / vh) * 100}%`,
    width: `${((rect.width * scale) / vw) * 100}%`,
    height: `${((rect.height * scale) / vh) * 100}%`,
  };
}

function cropBars(viewport, framing) {
  const scale = Math.max(viewport.width / native.width, viewport.height / native.height);
  const rw = native.width * scale;
  const rh = native.height * scale;
  const barX = Math.max(0, viewport.width - rw);
  const barY = Math.max(0, viewport.height - rh);
  return { barX, barY, renderedW: rw, renderedH: rh, scale };
}

const viewports = [
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "1366x768", width: 1366, height: 768 },
  { name: "390x844", width: 390, height: 844 },
];

let allPass = true;

for (const vp of viewports) {
  const framing = welcomeHallFraming(vp);
  const pct = sceneRectToFitPercent(kiosk, vp, framing);
  const crop = cropBars(vp, framing);
  const left = parseFloat(pct.left);
  const top = parseFloat(pct.top);
  const width = parseFloat(pct.width);
  const height = parseFloat(pct.height);
  const right = left + width;
  const bottom = top + height;

  const inView =
    right > 0 && left < 100 && bottom > 0 && top < 100 && width > 2 && height > 5;

  const centerX = left + width / 2;
  const centerY = top + height / 2;
  const centerInView =
    centerX >= 0 && centerX <= 100 && centerY >= 0 && centerY <= 100;

  const pass = inView && centerInView;
  if (!pass) allPass = false;

  console.log(
    `${vp.name}: ${pass ? "PASS" : "FAIL"} fit=${framing.fit} anchor=(${framing.x},${framing.y}) crop=${crop.barX.toFixed(0)}px sides ${crop.barY.toFixed(0)}px top/bottom center=(${centerX.toFixed(1)}%,${centerY.toFixed(1)}%) box=${JSON.stringify(pct)}`,
  );
}

console.log("SCOUT", allPass ? "ALL PASS" : "SOME FAIL");
process.exit(allPass ? 0 : 1);
