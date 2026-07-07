import type p5 from "p5";
import type { SketchFactory } from "../types";

/**
 * Port en modo instancia de `Talleres2021-CC3/.../Clase4/Ejemplo8.js`.
 * Basado en el ejemplo de la ISS de Daniel Shiffman (The Coding Train).
 *
 * Mapea la posición en vivo de la Estación Espacial Internacional (API pública
 * `wheretheiss.at`) sobre el canvas, con un suavizado (easing), encima de un GIF.
 *
 * Cambios del port: es una pieza de **datos en vivo**, así que las llamadas de
 * red se mantienen (se ejecutan en el cliente). Dos ajustes de robustez para la
 * galería:
 *  - el `setInterval(dondeEsta, 1000)` original se reemplaza por un sondeo por
 *    frames (`frameCount % 60`), para no dejar un intervalo colgado al desmontar
 *    la pieza;
 *  - el GIF externo (giphy) se carga con callback de error: si falla (CORS/caído)
 *    la pieza sigue funcionando y solo se omite el fondo.
 */
export const estacionEspacial: SketchFactory = (p: p5) => {
  const url = "https://api.wheretheiss.at/v1/satellites/25544";
  const gifUrl = "https://media.giphy.com/media/xUn3CdoxxuzV5J6X5u/source.gif";

  const easing = 0.01;
  let estacion: { latitude: number; longitude: number } | undefined;
  let x = 0;
  let y = 0;
  let objX = 0;
  let objY = 0;
  let space: p5.Image | null = null;

  const bajarDatos = (datos: { latitude: number; longitude: number }) => {
    estacion = datos;
    objX = p.map(estacion.latitude, -90, 90, p.width, 0);
    objY = p.map(estacion.longitude, -180, 180, p.height, 0);
  };

  const dondeEsta = () => {
    p.loadJSON(url, bajarDatos as (data: object) => void);
  };

  p.preload = () => {
    space = p.loadImage(
      gifUrl,
      undefined,
      () => {
        space = null;
      },
    );
  };

  p.setup = () => {
    p.createCanvas(800, 600);
    dondeEsta();
  };

  p.draw = () => {
    p.background(220);
    if (space) {
      p.image(space, 0, 0, p.width, p.height);
    }

    // Consulta la posición ~1 vez por segundo (sin setInterval).
    if (p.frameCount % 60 === 0) {
      dondeEsta();
    }

    if (estacion) {
      x += (objX - x) * easing;
      y += (objY - y) * easing;
      p.ellipse(x, y, 50, 20);
    }
  };
};
