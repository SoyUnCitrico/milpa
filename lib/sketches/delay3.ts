import type p5 from "p5";
import type { SketchFactory } from "../types";

/**
 * Port en modo instancia de `creativeCode/delay3.js`.
 * Fundido de fondo en HSB: la saturación y el brillo suben gradualmente desde
 * negro hasta el color vino objetivo a lo largo de ~5.4 s; termina con
 * `noLoop()`. Se elimina el `CCapture` (que estaba activo en el original).
 */
export const delay3: SketchFactory = (p: p5) => {
  const w = 1000;
  const h = 1000;
  let br = 0;
  let st = 0;

  let vino3: p5.Color;
  let m: number, s: number, b: number;
  let sStep: number, bStep: number;

  let frame = 0;
  let startMillis: number | null = null;
  const fps = 30;

  p.setup = () => {
    p.createCanvas(w, h);
    p.background(0);
    p.frameRate(fps);
    p.colorMode(p.HSB, 360, 100, 100, 100);
    vino3 = p.color(290, 59, 31);
    m = p.hue(vino3);
    b = p.brightness(vino3);
    s = p.saturation(vino3);
    bStep = b / 162;
    sStep = s / 162;
    p.background(0);
  };

  p.draw = () => {
    if (frame === 0) {
      frame++;
    }

    if (startMillis == null) {
      startMillis = p.millis();
    }

    const duration = 5390;
    const elapsed = p.millis() - startMillis;
    const t = p.map(elapsed, 0, duration, 0, 1);

    if (t > 1) {
      p.noLoop();
      return;
    }

    if (br > b) br = b;
    if (st > s) st = s;
    p.background(m, st, br);
    br += bStep;
    st += sStep;
  };

  p.keyPressed = () => {
    if (p.key === "s" || p.key === "S") p.saveCanvas("delay3", "png");
  };
};
