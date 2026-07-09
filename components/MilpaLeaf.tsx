import type { ReactNode } from "react";
import MilpaReveal from "./MilpaReveal";

/**
 * Una fila de la milpa: la card de sketch brota de un lado del tallo, y del
 * lado opuesto (donde no hay card) crece una hoja generativa (`companion`,
 * un <MilpaHoja> server-rendered), anclada directamente sobre la línea del
 * tallo (no flotando en el centro de su columna) y creciendo hacia el
 * extremo de la fila. En mobile/tablet se apila solo la card.
 */
export default function MilpaLeaf({
  children,
  companion,
  extra,
  side,
}: {
  children: ReactNode;
  companion?: ReactNode;
  /** Elemento adicional anclado a la fila (p. ej. una <MilpaMazorca>); se posiciona solo. */
  extra?: ReactNode;
  side: "left" | "right";
}) {
  const companionSide = side === "left" ? "right" : "left";

  return (
    <MilpaReveal variant="slide" className="relative flex flex-col gap-6 lg:block">
      <div
        className={`relative w-full lg:w-[46%] ${
          side === "left" ? "lg:mr-auto lg:pr-8" : "lg:ml-auto lg:pl-8"
        }`}
      >
        <span
          aria-hidden
          className={`absolute top-10 hidden h-px w-8 bg-matrix-line/50 lg:block ${
            side === "left" ? "right-0 translate-x-full" : "left-0 -translate-x-full"
          }`}
        />
        {children}
      </div>

      {companion && (
        <div
          className={`absolute top-1/2 hidden -translate-y-1/2 lg:block lg:w-[46%] ${
            companionSide === "left" ? "right-1/2" : "left-1/2"
          }`}
        >
          {companion}
        </div>
      )}

      {extra}
    </MilpaReveal>
  );
}
