"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

/**
 * Scroll-reveal genérico: aparece al entrar en viewport (una sola vez).
 * "slide" = las cards, se deslizan desde abajo (surgiendo de la tierra).
 * "grow" = raíces/hojas generativas, brotan con un ligero escalado.
 */
export default function MilpaReveal({
  children,
  className,
  variant = "slide",
}: {
  children: ReactNode;
  className?: string;
  variant?: "slide" | "grow";
}) {
  const initial =
    variant === "slide" ? { opacity: 0, y: 64 } : { opacity: 0, scale: 0.6 };
  const animate =
    variant === "slide" ? { opacity: 1, y: 0 } : { opacity: 1, scale: 1 };

  return (
    <motion.div
      initial={initial}
      whileInView={animate}
      viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
