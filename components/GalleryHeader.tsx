"use client";

import { useState } from "react";
import Header from "./Header";
import NavPanel from "./NavPanel";

/**
 * Envoltorio autocontenido de Header + NavPanel para la página principal.
 * `app/page.tsx` es Server Component (para no arrastrar a cliente el arte
 * generativo de la milpa) y no puede tener su propio estado, así que este
 * componente hoja es quien posee el toggle `showNav`.
 */
export default function GalleryHeader() {
  const [showNav, setShowNav] = useState(true);

  return (
    <>
      <Header showNav={showNav} onToggleNav={() => setShowNav((v) => !v)} />
      <NavPanel open={showNav} />
    </>
  );
}
