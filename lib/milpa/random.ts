/**
 * PRNG determinista para el arte generativo de la milpa (raíces, hojas):
 * misma semilla → mismo resultado en cada build, sin Math.random() suelto.
 */

export function hashSeed(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function createRng(seed: number | string): () => number {
  let state = typeof seed === "string" ? hashSeed(seed) : seed >>> 0;
  return function mulberry32() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
