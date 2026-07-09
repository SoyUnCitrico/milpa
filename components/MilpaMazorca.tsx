import { createRng } from "@/lib/milpa/random";
import { MAZORCA_IMAGE_URL } from "@/lib/config";
import MilpaReveal from "./MilpaReveal";

/**
 * Mazorca que brota de un nodo superior del tallo: la imagen completa (PNG
 * transparente, el olote apunta hacia abajo-izquierda) se ancla con el olote
 * solapando el tallo y la punta saliendo en diagonal hacia arriba-afuera.
 * En el lado izquierdo se espeja con scaleX(-1). La rotación leve y la altura
 * dentro de la fila usan semilla propia: varían entre nodos sin perder el
 * determinismo de la milpa. Va arriba de la fila para no pisar la MilpaHoja
 * (anclada en top-1/2).
 */
export default function MilpaMazorca({
  seed,
  side,
}: {
  seed: string;
  side: "left" | "right";
}) {
  const rng = createRng(`${seed}-mazorca`);
  const rotDeg = -10 + rng() * 20;
  const topPct = 4 + rng() * 18;
  const espejada = side === "left";

  // El orden de transformaciones se aplica de derecha a izquierda: primero el
  // espejo, luego la rotación y al final el corrimiento hacia el tallo para
  // que el olote lo solape.
  const transform = `translateX(${espejada ? "" : "-"}14%) rotate(${rotDeg.toFixed(1)}deg)${
    espejada ? " scaleX(-1)" : ""
  }`;

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute z-8 opacity-70 hidden lg:block  scale-[1.2] contrast-200 hue-rotate-85 saturate-200 ${
        espejada ? "right-1/2 mx-12 mt-12" : "left-1/2 mx-12 "
      }`}
      style={{ top: `${topPct.toFixed(1)}%` }}
    >
      <MilpaReveal variant="grow">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={MAZORCA_IMAGE_URL}
          alt=""
          loading="lazy"
          decoding="async"
          className="w-44 max-w-none md:w-64"
          style={{ transform }}
        />
      </MilpaReveal>
    </div>
  );
}
