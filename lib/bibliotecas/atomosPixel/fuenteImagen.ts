// Fuente de imagen (port de ImageSource.pde): abstrae DE DÓNDE proviene la
// imagen que se descompone en partículas. CamaraFuente usa createCapture
// (getUserMedia) y ArchivoFuente una imagen elegida por el usuario.
//
// Cambios respecto al original:
//  - Capture (processing.video) → p.createCapture con constraints (deviceId).
//    stop() DETIENE los tracks del MediaStream (apaga la cámara) y elimina el
//    <video>; start() vuelve a crear la captura.
//  - capture() copia el framebuffer con p.get() (equivale a captureCanvas():
//    la imagen descompuesta coincide con la vista previa, espejo incluido).

import type p5 from "p5";
import type { ContextoAtomos } from "./tipos";

export interface FuenteImagen {
  /** Comenzar / reanudar la fuente (vista previa en vivo). */
  start(): void;
  /** Detener la fuente (en la cámara: apagar el stream). */
  stop(): void;
  /** Dibujar la vista previa en el canvas. */
  draw(): void;
  /** ¿La fuente está lista para capturar? */
  isReady(): boolean;
  /** PImage del frame actual tal como se ve (copia el framebuffer). */
  capture(): p5.Image;
}

/** Fuente basada en la cámara web. La vista previa se dibuja en espejo. */
export class CamaraFuente implements FuenteImagen {
  private ctx: ContextoAtomos;
  private video: p5.Element | null = null;
  private listo = false;
  mirror = true;
  /** Callback opcional si getUserMedia falla (sin permiso / sin cámara). */
  onError?: (e: unknown) => void;

  constructor(ctx: ContextoAtomos, private deviceId?: string) {
    this.ctx = ctx;
  }

  start(): void {
    if (this.video) return;
    this.listo = false;
    const constraints: MediaStreamConstraints = {
      video: this.deviceId ? { deviceId: { exact: this.deviceId } } : true,
      audio: false,
    };
    // createCapture acepta constraints de getUserMedia; el callback corre al
    // llegar el stream (loadedmetadata): antes de eso no se dibuja ni captura.
    const crear = this.ctx.p.createCapture as unknown as (
      c: MediaStreamConstraints,
      cb: () => void,
    ) => p5.Element;
    this.video = crear.call(this.ctx.p, constraints, () => {
      this.listo = true;
    });
    this.video.hide();

    // p5 no expone el error de getUserMedia: se vigila el srcObject.
    const elt = this.video.elt as HTMLVideoElement;
    elt.addEventListener("error", (e) => this.onError?.(e), { once: true });
  }

  stop(): void {
    if (!this.video) return;
    const elt = this.video.elt as HTMLVideoElement;
    const s = elt.srcObject;
    if (s instanceof MediaStream) {
      s.getTracks().forEach((t) => t.stop());
    }
    this.video.remove();
    this.video = null;
    this.listo = false;
  }

  draw(): void {
    const p = this.ctx.p;
    const W = this.ctx.W;
    const H = this.ctx.H;
    if (
      !this.video ||
      !this.listo ||
      (this.video.elt as HTMLVideoElement).readyState < 2
    ) {
      p.background(0);
      return;
    }
    p.push();
    if (this.mirror) {
      p.translate(W, 0);
      p.scale(-1, 1);
    }
    p.image(this.video as unknown as p5.Element, 0, 0, W, H);
    p.pop();
  }

  isReady(): boolean {
    return this.listo;
  }

  capture(): p5.Image {
    return this.ctx.p.get();
  }
}

/** Fuente basada en una imagen ya cargada (reemplaza a selectInput). */
export class ArchivoFuente implements FuenteImagen {
  private ctx: ContextoAtomos;
  private pic: p5.Image | null;
  mirror = false;

  constructor(ctx: ContextoAtomos, pic: p5.Image | null) {
    this.ctx = ctx;
    this.pic = pic;
  }

  start(): void {} // imagen estática: nada que iniciar
  stop(): void {} //   ni que detener

  draw(): void {
    const p = this.ctx.p;
    const W = this.ctx.W;
    const H = this.ctx.H;
    if (!this.pic) {
      p.background(0);
      return;
    }
    p.push();
    if (this.mirror) {
      p.translate(W, 0);
      p.scale(-1, 1);
    }
    p.image(this.pic, 0, 0, W, H); // escala la imagen al tamaño del canvas
    p.pop();
  }

  isReady(): boolean {
    return this.pic !== null;
  }

  capture(): p5.Image {
    return this.ctx.p.get();
  }
}
