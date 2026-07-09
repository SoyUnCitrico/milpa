// Comportamientos de animación (port de Animations.pde): cada modo implementa
// la interfaz Animacion; el orquestador llama a enter() una sola vez (al
// activarse el modo) y a update() cada frame. Agregar un modo nuevo = declarar
// el valor en MODOS, crear la clase y registrarla en crearAnimaciones().

import type { ContextoAtomos, Modo } from "./tipos";

export interface Animacion {
  /** Se ejecuta una vez al activarse el modo (preparar estado inicial). */
  enter(ctx: ContextoAtomos): void;
  /** Se ejecuta cada frame mientras el modo está activo. */
  update(ctx: ContextoAtomos): void;
}

/** Las partículas regresan a la posición original de la foto (arrive). */
class AnimacionOriginal implements Animacion {
  enter(): void {}
  update(ctx: ContextoAtomos): void {
    ctx.cluster?.initialPosition();
  }
}

/** Las partículas persiguen el cursor (seek). */
class AnimacionMouse implements Animacion {
  enter(): void {}
  update(ctx: ContextoAtomos): void {
    ctx.cluster?.seguirMouse();
  }
}

/** Las partículas siguen las direcciones del flow field. */
class AnimacionCampo implements Animacion {
  enter(): void {}
  update(ctx: ContextoAtomos): void {
    if (ctx.cluster && ctx.campo) ctx.cluster.atravesarCampo(ctx.campo, "OTHERSIDE");
  }
}

/** Las partículas deambulan de forma orgánica (wander). */
class AnimacionDeambular implements Animacion {
  enter(): void {}
  update(ctx: ContextoAtomos): void {
    ctx.cluster?.deambularCluster("OTHERSIDE");
  }
}

/** Barrido tipo lluvia hacia la dirección elegida (flechas). */
class AnimacionBarrer implements Animacion {
  enter(): void {}
  update(ctx: ContextoAtomos): void {
    ctx.cluster?.barrerCluster(ctx.state.sweepDirection);
  }
}

/** Temblor alrededor de la posición (ruido Perlin); enter() guarda la base. */
class AnimacionTemblar implements Animacion {
  enter(ctx: ContextoAtomos): void {
    ctx.cluster?.savePosition();
  }
  update(ctx: ContextoAtomos): void {
    ctx.cluster?.temblarCluster();
  }
}

/** Bandada: separación + alineación + cohesión + wander (grilla espacial). */
class AnimacionManada implements Animacion {
  enter(): void {}
  update(ctx: ContextoAtomos): void {
    ctx.cluster?.manadaCluster("OTHERSIDE");
  }
}

/** Las partículas giran alrededor del centro del canvas (vórtice). */
class AnimacionVortice implements Animacion {
  enter(): void {}
  update(ctx: ContextoAtomos): void {
    ctx.cluster?.orbitarCluster(ctx.W / 2, ctx.H / 2, 2.0, "OTHERSIDE");
  }
}

/** Estallido radial desde el mouse; luego las partículas derivan. */
class AnimacionExplosion implements Animacion {
  enter(ctx: ContextoAtomos): void {
    ctx.cluster?.explotar(ctx.p.mouseX, ctx.p.mouseY, 12.0);
  }
  update(ctx: ContextoAtomos): void {
    ctx.cluster?.derivarCluster("OTHERSIDE");
  }
}

/** Atracción tipo gravedad puntual hacia el mouse. */
class AnimacionGravedad implements Animacion {
  enter(): void {}
  update(ctx: ContextoAtomos): void {
    ctx.cluster?.atraerCluster(ctx.p.mouseX, ctx.p.mouseY, 60.0, "OTHERSIDE");
  }
}

/** Composición generativa (sin física): líneas desde el análisis de píxeles. */
class AnimacionLineas implements Animacion {
  enter(): void {}
  update(ctx: ContextoAtomos): void {
    ctx.composer?.drawLines();
  }
}

/** Composición generativa: círculos. */
class AnimacionCirculos implements Animacion {
  enter(): void {}
  update(ctx: ContextoAtomos): void {
    ctx.composer?.drawCircles();
  }
}

/** Composición generativa: rectángulos. */
class AnimacionRectangulos implements Animacion {
  enter(): void {}
  update(ctx: ContextoAtomos): void {
    ctx.composer?.drawRects();
  }
}

/** Composición ANIMADA: recolorea desplazando el matiz con frameCount. */
class AnimacionHueShift implements Animacion {
  enter(): void {}
  update(ctx: ContextoAtomos): void {
    ctx.composer?.drawHueShift(ctx.p.frameCount * 0.5);
  }
}

/**
 * Colonización de espacios: red ramificada desde las semillas que revela la
 * imagen. enter() reinicia el algoritmo (re-elige semillas con el umbral
 * actual) a través del rebuild que inyecta la factory.
 */
class AnimacionColonizar implements Animacion {
  constructor(private rebuild: () => void) {}
  enter(): void {
    this.rebuild();
  }
  update(ctx: ContextoAtomos): void {
    if (ctx.colonizer) {
      ctx.colonizer.grow();
      ctx.colonizer.draw();
    }
  }
}

/** Registro modo -> comportamiento (reemplaza el HashMap del sketch). */
export function crearAnimaciones(deps: {
  rebuildColonizer: () => void;
}): Record<Modo, Animacion> {
  return {
    ORIGINAL: new AnimacionOriginal(),
    MOUSE: new AnimacionMouse(),
    FIELD: new AnimacionCampo(),
    WALK: new AnimacionDeambular(),
    SWEEP: new AnimacionBarrer(),
    SHAKE: new AnimacionTemblar(),
    FLOCK: new AnimacionManada(),
    VORTEX: new AnimacionVortice(),
    EXPLODE: new AnimacionExplosion(),
    GRAVITY: new AnimacionGravedad(),
    LINES: new AnimacionLineas(),
    CIRCLES: new AnimacionCirculos(),
    RECTS: new AnimacionRectangulos(),
    HUESHIFT: new AnimacionHueShift(),
    COLONIZE: new AnimacionColonizar(deps.rebuildColonizer),
  };
}
