/** Corta `texto` a `max` caracteres y agrega "..." si hubo recorte. */
export function truncar(texto: string, max = 120): string {
  return texto.length > max ? texto.slice(0, max).trimEnd() + "..." : texto;
}
