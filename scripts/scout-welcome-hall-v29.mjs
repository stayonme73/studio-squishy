/**
 * Scout kiosk hotspot visibility across viewports (cover framing math).
 */
const native = { width: 1024, height: 683 };
const kiosk = { x: 768, y: 318, width: 210, height: 340 };
const framingDefault = { x: 0.5, y: 0.5, fit: "cover" };
const framingPortrait = { x: 0.95, y: 0.5, fit: "cover" };

function welcomeHallFraming(viewport) {
  const { width, height } = viewport;
  if (width > 0 && height > width && width <= 768) {
    return framingPortrait;
  }
  return framingDefault;
}

function sceneRectToCoverPercent(rect, viewport, framing) {
  const { width: iw, height: ih } = native;
  const { width: vw, height: vh } = viewport;
  const scale = Math.max(vw / iw, vh / ih);
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

const viewports = [
  { name: "1920x1080", width: 1920, height: 1080 },
  { name: "1440x900", width: 1440, height: 900 },
  { name: "390x844", width: 390, height: 844 },
];

let allPass = true;

for (const vp of viewports) {
  const framing = welcomeHallFraming(vp);
  const pct = sceneRectToCoverPercent(kiosk, vp, framing);
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
    `${vp.name}: ${pass ? "PASS" : "FAIL"} framing=${JSON.stringify(framing)} center=(${centerX.toFixed(1)}%,${centerY.toFixed(1)}%) box=${JSON.stringify(pct)}`,
  );
}

console.log("SCOUT", allPass ? "ALL PASS" : "SOME FAIL");
process.exit(allPass ? 0 : 1);
