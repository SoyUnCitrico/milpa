import type p5 from "p5";
import { lerpHexColor } from "@/lib/milpa/color";
import { createRng } from "@/lib/milpa/random";
import type { Point } from "@/lib/milpa/spaceColonization";
import {
  generarInstanciasArbol,
  plantarBosque,
  type ArbolPlantado,
  type InstanciaArbol,
} from "./arboles";
import { horaContinua, hornearCielo, hornearNubes, paletaPorHora } from "./cielo";
import { viento01 } from "./clima";
import { actualizarYDibujarFauna, crearFauna, type Criatura } from "./fauna";
import { Llovizna } from "./llovizna";
import { generarMilpaCercana, type Mata } from "./milpaCercana";
import { generarMontania, type Montania } from "./montania";
import type { CondicionClima, EstadoEscena, PaletaCielo } from "./tipos";
import { clamp01, rgba } from "./util";

/**
 * Factory p5 (modo instancia) de la escena parallax de 4 capas. Presupuesto:
 * las capas 1-2 (cielo, nubes, montaña, árboles) se hornean UNA vez en
 * buffers offscreen y en draw() solo se blitean con offset/escala según el
 * scroll; la capa 3 (milpa cercana) se dibuja viva desde geometría
 * precalculada (~900 líneas) porque se deforma con scroll y viento; la capa
 * 4 (llovizna + fauna) es un pool fijo de partículas y ≤5 criaturas.
 * Cero allocations relevantes por frame; rebake solo en resize, cambio de
 * franja horaria (Δ > 0.05 h) o cambio de clima.
 */

// matrix.black / matrix.panel (tailwind.config.ts): tierra, siluetas y scrim.
const NEGRO = "#1d0d02";
const NEGRO_MONTANA = "#010e03";
const PANEL = "#331c08";
// matrix.dim → matrix.text: rampa de las hojas de milpa (como MilpaHoja).
const HOJA_BASE = "#00b341";
const HOJA_PUNTA = "#7fffa8";
// Verde apagado de enredadera (MilpaFrijol.CAPA_DELANTE.base): copas de árbol.
const COPA_BASE = "#124d27";
const VERDE_ARBOL = "#88ec7f";
// neon.violet / neon.orchid: flores de la milpa, mismas que las del frijol.
const FLOR_PETALO = "#a855f7";
const FLOR_BOCA = "#c98bff";

// Factores de parallax (fracción del alto de viewport que viaja cada capa).
// El bosque va horneado en el buffer de la montaña y viaja con ella.
const VIAJE_MONTANIA = 0.05;
const VIAJE_MILPA = 0.35;
/** Cuánto crece la montaña entre el inicio y el final del scroll. */
const CRECIMIENTO_MONTANIA = 0.55;
/** Resolución extra del buffer de montaña para crecer sin pixelar. */
const RESOLUCION_MONTANIA = 1.6;
/** Cuánto se abren los surcos hacia el borde inferior (perspectiva frontal). */
const ENSANCHE_SURCOS = 2.3;

const SEMILLA = "valle-milpa";

type Ctx = CanvasRenderingContext2D;

function contexto(g: unknown): Ctx {
  return (g as { drawingContext: Ctx }).drawingContext;
}

export function crearEscena(estado: EstadoEscena) {
  return (p: p5) => {
    // Dimensiones y modo.
    let vw = 0;
    let vh = 0;
    let yHorizonte = 0;
    let modoLigero = false;

    // Buffers horneados.
    let bufCielo: p5.Graphics | null = null;
    let bufNubes: p5.Graphics | null = null;
    let bufMontania: p5.Graphics | null = null;

    // Geometría precalculada.
    let montania: Montania | null = null;
    /** 3 geometrías de árbol; el bosque son estampas de ellas en la ladera. */
    let instanciasArbol: InstanciaArbol[] = [];
    let bosque: ArbolPlantado[] = [];
    let matas: Mata[] = [];
    /** X de cada surco en la línea de siembra (uno por mata + intermedios). */
    let surcosBase: number[] = [];
    let llovizna: Llovizna | null = null;
    let fauna: Criatura[] = [];
    /** Posiciones vivas de las flores ancla (mutadas por frame, sin allocs). */
    let floresPantalla: Point[] = [];

    // Estado del horneado y colores por frame.
    let horaHorneada = -99;
    let condicionHorneada: CondicionClima | null = null;
    let paleta: PaletaCielo = paletaPorHora(12);
    let coloresHoja: [string, string, string, string] = ["", "", "", ""];
    let colorTallo = "";
    let siluetaHoja = "";
    let colorTierra = "";
    let colorSurco = "";
    /** Degradados del campo (horneados): dan profundidad/relieve a la tierra. */
    let gradTierra: CanvasGradient | null = null;
    let gradSurco: CanvasGradient | null = null;
    /** Halo claro de la cresta del surco (difuminado). */
    let colorSurcoLuz = "";
    let scrim: CanvasGradient | null = null;

    /** Fade 0..1 de la llovizna al cambiar de clima (~1 s a 30 fps). */
    let intensidadLluvia = 0;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;

    const horaViva = () => estado.override.hora ?? horaContinua();
    const condicionViva = () => estado.override.condicion ?? estado.clima.condicion;
    const vientoVivo = () => estado.override.vientoKmh ?? estado.clima.vientoKmh;

    function crearBuffer(w: number, h: number): p5.Graphics {
      const g = p.createGraphics(Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
      g.pixelDensity(1);
      return g;
    }

    /** Regenera geometría y buffers (setup y resize; nunca por frame). */
    function regenerar(): void {
      vw = p.width;
      vh = p.height;
      yHorizonte = vh * 0.62;
      const memoria = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
      modoLigero = (memoria !== undefined && memoria <= 2) || vw < 480;

      bufCielo?.remove();
      bufNubes?.remove();
      bufMontania?.remove();

      bufCielo = crearBuffer(vw, vh);
      bufNubes = crearBuffer(vw * 1.6, vh * 0.45);
      const k = RESOLUCION_MONTANIA;
      bufMontania = crearBuffer(vw * k, vh * k);
      montania = generarMontania({
        width: vw * k,
        height: vh * k,
        yHorizonte: yHorizonte * k,
        seed: `${SEMILLA}-montania`,
        rugosidad: vh * 0.27,
        //alturaPico: vh * 0.72,
      });

      // Bosque sobre la montaña: 3 instancias de árbol estampadas muchas
      // veces por toda la ladera, en coordenadas del buffer de montaña
      // (comparten su perspectiva: crecen y viajan con ella).
      instanciasArbol = generarInstanciasArbol(`${SEMILLA}-arboles`);
      bosque = plantarBosque({
        cresta: montania.principal,
        yHorizonte: yHorizonte * k,
        seed: `${SEMILLA}-bosque`,
        cantidad: modoLigero ? 12 : 22,
        alturaCercana: vh * 0.14 * k,
        numInstancias: instanciasArbol.length,
      });

      matas = generarMilpaCercana({
        width: vw,
        alturaMax: vh * 0.7,
        seed: `${SEMILLA}-milpa`,
        cantidad: modoLigero ? 4 : 6,
      });
      // Surcos: uno bajo cada mata (la milpa pasa por la parte baja de su
      // surco) más intermedios con jitter, repartidos por toda la siembra.
      const rngSurcos = createRng(`${SEMILLA}-surcos`);
      surcosBase = matas.map((m) => m.x);
      const totalSurcos = modoLigero ? 9 : 14;
      const extras = Math.max(0, totalSurcos - surcosBase.length);
      for (let i = 0; i < extras; i++) {
        surcosBase.push(((i + 0.15 + rngSurcos() * 0.7) / extras) * vw);
      }
      surcosBase.sort((a, b) => a - b);

      const numFlores = matas.reduce((n, m) => n + m.flores.length, 0);
      floresPantalla = Array.from({ length: numFlores }, () => ({ x: 0, y: 0 }));
      fauna = crearFauna(numFlores, `${SEMILLA}-fauna`, vw, vh);

      llovizna = new Llovizna(modoLigero ? 80 : 150, vw, vh, `${SEMILLA}-llovizna`);

      hornear();
    }

    /** Hornea buffers y colores con la paleta de la hora/clima actuales. */
    function hornear(): void {
      const hora = horaViva();
      const condicion = condicionViva();
      paleta = paletaPorHora(hora);
      horaHorneada = hora;
      condicionHorneada = condicion;

      if (bufCielo) hornearCielo(bufCielo, paleta, condicion, yHorizonte);
      if (bufNubes) hornearNubes(bufNubes, paleta, condicion, `${SEMILLA}-nubes`);
      if (bufMontania && montania) {
        hornearMontania(bufMontania, montania, yHorizonte * RESOLUCION_MONTANIA);
        // El bosque vive sobre la ladera, dentro del buffer de la montaña.
        hornearArboles(bufMontania);
      }

      // Rampa de color de hojas (4 cubetas base→punta), oscurecida de noche.
      const oscurecer = 0.5 * (1 - paleta.luzFauna);
      for (let b = 0; b < 4; b++) {
        coloresHoja[b] = lerpHexColor(
          lerpHexColor(HOJA_BASE, HOJA_PUNTA, b / 3),
          NEGRO,
          oscurecer,
        );
      }
      colorTallo = lerpHexColor(HOJA_BASE, NEGRO, 0.25 + oscurecer * 0.6);
      siluetaHoja = rgba(lerpHexColor(COPA_BASE, HOJA_BASE, 0.4), 0.16 * (1 - oscurecer));
      // Tierra del primer plano y ranura oscura de cada surco (fallbacks).
      colorTierra = rgba(lerpHexColor(NEGRO, paleta.bruma, 0.22), 0.55);
      colorSurco = rgba(lerpHexColor(NEGRO, "#000000", 0.45), 0.7);

      const ctx = contexto(p);

      // Degradados del campo (horneados, cero allocations por frame): tierra y
      // surcos se aclaran hacia el fondo (lejos, arriba) y se hunden en oscuro
      // hacia la cámara (cerca, abajo). Anclados en coordenadas absolutas del
      // lienzo para que el relieve quede fijo mientras la milpa hace scroll.
      const tierraLejos = lerpHexColor(NEGRO, paleta.bruma, 0.42);
      const tierraCerca = lerpHexColor(NEGRO, NEGRO_MONTANA, 0.55);
      gradTierra = ctx.createLinearGradient(0, yHorizonte, 0, vh);
      gradTierra.addColorStop(0, rgba(tierraLejos, 0.5));
      gradTierra.addColorStop(1, rgba(tierraCerca, 0.82));

      const surcoTono = lerpHexColor(NEGRO, "#000000", 0.5);
      gradSurco = ctx.createLinearGradient(0, yHorizonte, 0, vh + 40);
      gradSurco.addColorStop(0, rgba(surcoTono, 0.2));
      gradSurco.addColorStop(1, rgba(surcoTono, 0.82));
      // Cresta iluminada del surco (halo desenfocado); más viva de día.
      colorSurcoLuz = rgba(
        lerpHexColor(NEGRO, paleta.bruma, 0.6),
        0.18 + 0.22 * paleta.luzFauna,
      );

      // Scrim de legibilidad: más denso de día (la escena brilla más).
      const alfa = 0.3 + 0.3 * paleta.luzFauna;
      scrim = ctx.createLinearGradient(0, 0, 0, vh);
      scrim.addColorStop(0, rgba(NEGRO, alfa * 0.55));
      scrim.addColorStop(0.35, rgba(NEGRO, alfa));
      scrim.addColorStop(1, rgba(NEGRO, alfa * 0.85));
    }

    function hornearMontania(g: p5.Graphics, m: Montania, yHor: number): void {
      const ctx = contexto(g);
      const w = g.width;
      const h = g.height;
      g.clear();

      const rellenar = (cresta: Point[], estilo: string | CanvasGradient) => {
        ctx.beginPath();
        ctx.moveTo(cresta[0].x, cresta[0].y);
        for (let i = 1; i < cresta.length; i++) ctx.lineTo(cresta[i].x, cresta[i].y);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fillStyle = estilo;
        ctx.fill();
      };

      // Cresta secundaria, hundida en bruma (más lejos).
      rellenar(m.secundaria, rgba(lerpHexColor(paleta.bruma, paleta.horizonte, 0.4), 0.9));

      // Cresta principal: gradiente bruma → oscuro hacia la base.
      let cima = yHor;
      for (const punto of m.principal) if (punto.y < cima) cima = punto.y;
      const grad = ctx.createLinearGradient(0, cima, 0, yHor);
      grad.addColorStop(0, lerpHexColor(paleta.bruma, PANEL, 0.35));
      grad.addColorStop(1, lerpHexColor(paleta.bruma, NEGRO_MONTANA, 0.75));
      rellenar(m.principal, grad);

      // Suelo desde el horizonte hacia abajo (el plano donde vive todo).
      const suelo = ctx.createLinearGradient(0, yHor, 0, h);
      suelo.addColorStop(0, lerpHexColor(paleta.bruma, NEGRO_MONTANA, 0.72));
      suelo.addColorStop(1, NEGRO_MONTANA);
      ctx.fillStyle = suelo;
      ctx.fillRect(0, yHor, w, h - yHor);
    }

    /**
     * Estampa el bosque sobre la ladera, dentro del buffer de la montaña
     * (mismas coordenadas). Los árboles lejanos (junto a la cresta) se
     * pintan más chicos, más tenues y hundidos en bruma; los cercanos, al
     * pie, con más contraste. `bosque` ya viene ordenado de lejos a cerca.
     */
    function hornearArboles(g: p5.Graphics): void {
      const ctx = contexto(g);
      const troncoCerca = lerpHexColor(PANEL, paleta.bruma, 0.3);
      const copaCerca = lerpHexColor(VERDE_ARBOL, paleta.bruma, 0.35);

      for (const arbol of bosque) {
        const inst = instanciasArbol[arbol.instancia];
        if (!inst) continue;
        const a = arbol.altura;
        const e = arbol.espejo;
        const colorTronco = lerpHexColor(troncoCerca, paleta.bruma, arbol.lejania * 0.55);
        const colorCopa = rgba(
          lerpHexColor(copaCerca, paleta.bruma, arbol.lejania * 0.5),
          0.5 - 0.25 * arbol.lejania,
        );

        // Copa detrás de las ramas.
        if (inst.copa.length >= 3) {
          ctx.beginPath();
          ctx.moveTo(arbol.x + e * inst.copa[0].x * a, arbol.y + inst.copa[0].y * a);
          for (let i = 1; i < inst.copa.length; i++) {
            ctx.lineTo(arbol.x + e * inst.copa[i].x * a, arbol.y + inst.copa[i].y * a);
          }
          ctx.closePath();
          ctx.fillStyle = colorCopa;
          ctx.fill();
        }
        g.stroke(colorTronco);
        for (const rama of inst.ramas) {
          // Grosor proporcional al tamaño de la estampa, afinando por rama.
          g.strokeWeight(Math.max(0.7, (3.2 - rama.depth) * (a / 210)));
          g.line(
            arbol.x + e * rama.from.x * a,
            arbol.y + rama.from.y * a,
            arbol.x + e * rama.to.x * a,
            arbol.y + rama.to.y * a,
          );
        }
      }
    }

    /**
     * Surcos del campo en perspectiva frontal: nacen en la línea de siembra
     * (donde pasan las bases de las milpas) y las líneas se abren y engordan
     * hacia el borde inferior — vienen hacia la cámara. Se dibujan ANTES de
     * las matas, así cada milpa queda plantada sobre su surco.
     */
    function dibujarSurcos(sueloY: number): void {
      if (sueloY >= vh) return; // el campo aún no asoma
      const ctx = contexto(p);

      // Franja de tierra con degradado vertical: el fondo (lejos, arriba)
      // queda más claro y el frente (cerca, abajo) más oscuro, para leer la
      // profundidad del campo.
      ctx.fillStyle = gradTierra ?? colorTierra;
      ctx.fillRect(0, sueloY, vw, vh - sueloY);

      // Ranuras: cuñas que parten casi puntuales en la siembra y se
      // ensanchan al acercarse (abanico alrededor del centro del encuadre).
      // El degradado las hunde hacia la cámara y un halo claro desenfocado en
      // el borde superior sugiere la cresta iluminada del surco: eso da el
      // relieve. El desenfoque se omite en modo ligero (coste de GPU).
      const centro = vw / 2;
      const yFin = vh + 40;
      ctx.save();
      if (!modoLigero) {
        ctx.shadowColor = colorSurcoLuz;
        ctx.shadowBlur = 7;
        ctx.shadowOffsetY = -3;
      }
      ctx.fillStyle = gradSurco ?? colorSurco;
      for (const xBase of surcosBase) {
        const xFin = centro + (xBase - centro) * ENSANCHE_SURCOS;
        ctx.beginPath();
        ctx.moveTo(xBase - 1, sueloY);
        ctx.lineTo(xBase + 1, sueloY);
        ctx.lineTo(xFin + 5, yFin);
        ctx.lineTo(xFin - 5, yFin);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    /** Capa 3 viva: matas de milpa que se abren con el scroll y ondean. */
    function dibujarMilpa(progreso: number, tiempo: number, v01: number): void {
      const offsetY = -progreso * vh * VIAJE_MILPA;
      const sueloY = vh * 0.985 + offsetY;
      let indiceFlor = 0;

      dibujarSurcos(sueloY);

      for (const mata of matas) {
        // Balanceo del tallo: cuadrático hacia la punta, proporcional al viento.
        const bal = Math.sin(tiempo * 1.3 + mata.x * 0.013) * (0.12 + v01);
        const dxTallo = (yRel: number) => bal * 14 * yRel * yRel;
        let colorNew = p.color(colorTallo);
        colorNew.setAlpha(85); // se atenúa con la niebla
        p.stroke(colorNew);
        p.strokeWeight(mata.grosorTallo);
        const pasos = 4;
        for (let s = 0; s < pasos; s++) {
          const t0 = s / pasos;
          const t1 = (s + 1) / pasos;
          p.line(
            mata.x + dxTallo(t0),
            sueloY - mata.alturaTallo * t0,
            mata.x + dxTallo(t1),
            sueloY - mata.alturaTallo * t1,
          );
        }

        for (const hoja of mata.hojas) {
          const yRelIns = -hoja.base.y / mata.alturaTallo;
          const baseX = mata.x + dxTallo(yRelIns);
          const baseY = sueloY + hoja.base.y;
          // La hoja se abre (cae) conforme avanza el scroll…
          const angulo = hoja.anguloBase + progreso * hoja.apertura;
          // …y ondea con el viento (más las puntas que la base).
          const ondeo =
            (Math.sin(tiempo * 1.7 + hoja.fase) * 0.2 +
              Math.sin(tiempo * 3.1 + hoja.fase * 2) * 0.05) *
            (0.12 + v01) *
            hoja.espejo;

          // Silueta translúcida (misma deformación que la venación) para
          // que la hoja se lea como hoja.
          if (hoja.casco.length >= 3) {
            const ctx = contexto(p);
            ctx.beginPath();
            for (let i = 0; i < hoja.casco.length; i++) {
              const q = hoja.casco[i];
              const a = angulo + ondeo * (q.x / hoja.largo);
              const co = Math.cos(a);
              const se = Math.sin(a);
              const x = baseX + hoja.espejo * (q.x * co - q.y * se);
              const y = baseY + (q.x * se + q.y * co);
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fillStyle = siluetaHoja;
            ctx.fill();
          }

          for (let b = 0; b < 4; b++) {
            const cubeta = hoja.cubetas[b];
            if (cubeta.length === 0) continue;
            p.stroke(coloresHoja[b]);
            p.strokeWeight(Math.max(0.8, 2.4 - b * 0.5));
            for (const seg of cubeta) {
              const a1 = angulo + ondeo * (seg.from.x / hoja.largo);
              const a2 = angulo + ondeo * (seg.to.x / hoja.largo);
              const c1 = Math.cos(a1);
              const s1 = Math.sin(a1);
              const c2 = Math.cos(a2);
              const s2 = Math.sin(a2);
              p.line(
                baseX + hoja.espejo * (seg.from.x * c1 - seg.from.y * s1),
                baseY + (seg.from.x * s1 + seg.from.y * c1),
                baseX + hoja.espejo * (seg.to.x * c2 - seg.to.y * s2),
                baseY + (seg.to.x * s2 + seg.to.y * c2),
              );
            }
          }
        }

        // Flores ancla (espiga y media altura): pequeñas trompetillas
        // moradas, mismas familias de color que las flores del frijol.
        p.noStroke();
        for (const flor of mata.flores) {
          const yRel = -flor.y / mata.alturaTallo;
          const fx = mata.x + dxTallo(yRel);
          const fy = sueloY + flor.y;
          p.fill(FLOR_PETALO);
          p.ellipse(fx - 3, fy - 1, 5, 4);
          p.ellipse(fx + 3, fy - 1, 5, 4);
          p.ellipse(fx, fy - 4, 4, 5);
          p.fill(FLOR_BOCA);
          p.ellipse(fx, fy - 1, 3.5, 3.5);
          // Posición viva para la fauna (mutación, sin allocations).
          floresPantalla[indiceFlor].x = fx;
          floresPantalla[indiceFlor].y = fy - 5;
          indiceFlor++;
        }
      }
    }

    p.setup = () => {
      p.createCanvas(window.innerWidth, window.innerHeight);
      p.pixelDensity(1);
      p.frameRate(30);
      regenerar();
    };

    p.windowResized = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const nuevoW = window.innerWidth;
        const nuevoH = window.innerHeight;
        // Ignora el temblor de la barra de URL móvil: solo cambios grandes.
        if (Math.abs(nuevoW - vw) < 60 && Math.abs(nuevoH - vh) < 150) return;
        p.resizeCanvas(nuevoW, nuevoH);
        regenerar();
        if (estado.reducedMotion) p.redraw();
      }, 250);
    };

    p.draw = () => {
      const estatico = estado.reducedMotion;
      const hora = horaViva();
      const condicion = condicionViva();
      // Rebake solo si cambió la franja horaria (~3 min) o el clima.
      if (Math.abs(hora - horaHorneada) > 0.05 || condicion !== condicionHorneada) {
        hornear();
      }

      const docAlto = estado.docAlto > vh ? estado.docAlto : vh + 1;
      const progreso = estatico ? 0 : clamp01(window.scrollY / (docAlto - vh));
      const tiempo = estatico ? 0 : p.millis() / 1000;
      const v01 = viento01(vientoVivo());

      // — Capa 1: cielo (fijo) + nubes que derivan con el viento.
      if (bufCielo) p.image(bufCielo, 0, 0);
      if (bufNubes) {
        const anchoNubes = bufNubes.width;
        const deriva = estatico
          ? 0
          : (tiempo * (3 + vientoVivo() * 0.4)) % anchoNubes;
        p.image(bufNubes, -deriva, vh * 0.04);
        p.image(bufNubes, anchoNubes - deriva, vh * 0.04);
      }

      // — Capa 1b: montaña que crece con el scroll, anclada al horizonte.
      if (bufMontania) {
        const s = 1 + progreso * CRECIMIENTO_MONTANIA;
        const dw = vw * s;
        const dh = vh * s;
        const dx = (vw - dw) / 2;
        const dy = yHorizonte * (1 - s) - progreso * vh * VIAJE_MONTANIA;
        p.image(bufMontania, dx, dy, dw, dh);
      }

      // — Capa 2: el bosque va horneado dentro del buffer de la montaña
      // (comparte su perspectiva y su crecimiento con el scroll).

      // — Capa 3: milpa cercana viva.
      dibujarMilpa(progreso, tiempo, v01);

      // — Capa 4: fauna (solo despejado y con luz) y llovizna.
      const faunaActiva = condicion === "despejado"|| condicion === "nublado" && paleta.luzFauna > 0.15;
      actualizarYDibujarFauna(
        p,
        fauna,
        floresPantalla,
        progreso,
        faunaActiva,
        tiempo,
        p.deltaTime / 1000,
        estatico,
      );

      const objetivoLluvia = condicion === "lluvia" && !estatico ? 1 : 0;
      intensidadLluvia += (objetivoLluvia - intensidadLluvia) * 0.06;
      if (llovizna && intensidadLluvia > 0.02) {
        p.strokeWeight(5);
        p.stroke(rgba(lerpHexColor(paleta.bruma, "#e8f2fa", 0.4), 0.34 * intensidadLluvia));
        llovizna.actualizarYDibujar(
          (x1, y1, x2, y2) => p.line(x1, y1, x2, y2),
          v01 * 3,
        );
      }

      // — Scrim de legibilidad sobre toda la escena.
      if (scrim) {
        const ctx = contexto(p);
        ctx.fillStyle = scrim;
        ctx.fillRect(0, 0, vw, vh);
      }

      // Reduced-motion: un solo frame estático; el componente hace redraw()
      // si algo cambia (resize, preferencia).
      if (estatico) p.noLoop();
    };

    p.mouseClicked = () => {
      if (estado.reducedMotion) p.loop();
    }
  };
}
