import type p5 from "p5";

/**
 * Encadena una función de limpieza a `p.remove()` sin tocar `P5Sketch.tsx`.
 * Necesario para los sketches de audio: los nodos de Tone.js no se enganchan
 * al ciclo de vida de p5 (a diferencia de los elementos DOM creados con
 * `p.createX`, que p5 destruye solo). Llamar una sola vez, al inicio de la
 * factory, antes de `p.setup`.
 *
 *   onRemove(p, () => { synth.dispose(); });
 */
export function onRemove(p: p5, cleanup: () => void): void {
  const original = p.remove.bind(p);
  p.remove = () => {
    cleanup();
    original();
  };
}
