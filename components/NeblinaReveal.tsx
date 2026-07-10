"use client";

import { useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Envuelve el montaje inicial de la app: todo surge de una neblina (opacity
 * en el contenido, capa de niebla encima disolviéndose). Solo corre en este
 * primer mount — una vez termina, la niebla se desmonta y el árbol queda
 * exactamente como sin este wrapper.
 *
 * Ojo: nunca animar `filter` (blur) en este wrapper — es ancestro de
 * `EscenaParallax`, que depende de `position: fixed` a viewport completo.
 * `filter` (a diferencia de `opacity`) crea containing block para los
 * descendientes `fixed`, y Framer Motion deja el valor final como estilo
 * inline permanente, así que rompía el parallax para siempre, no solo
 * durante la intro.
 */
export default function NeblinaReveal({ children }: { children: ReactNode }) {
  const [neblinaLista, setNeblinaLista] = useState(false);
  const prefiereMenosMovimiento = useReducedMotion();

  if (prefiereMenosMovimiento) {
    return <>{children}</>;
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2.4, ease: "easeOut" }}
      >
        {children}
      </motion.div>
      {!neblinaLista && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-[100]"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(15,32,21,0.6) 0%, rgba(5,8,5,0.96) 65%, #050805 100%)",
          }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1.7, ease: "easeInOut", delay: 0.15 }}
          onAnimationComplete={() => setNeblinaLista(true)}
        />
      )}
    </>
  );
}
