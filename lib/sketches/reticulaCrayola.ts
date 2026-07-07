import type p5 from "p5";
import type { SketchFactory } from "../types";

/**
 * Port en modo instancia de `Talleres2021-CC3/.../Clase3/Ejemplo5.js`.
 *
 * Retícula 12×10 de colores estándar Crayola cargados de un JSON; al hacer clic
 * sobre un círculo se muestra el nombre del color en grande. Ejercicio de datos
 * del taller "Código y Datos" de ccdtecno.
 *
 * Cambios del port: el original descargaba el dataset de una URL externa
 * (`raw.githubusercontent.com/dariusk/corpora`); aquí se **repunta al mismo
 * dataset servido localmente** (`public/crayola.json`) para que sea
 * autocontenido. La clase `Bolita` embebida se conserva como clase interna de la
 * factory (cierra sobre `p` y sobre la variable `nombre`). Sin `.parent`.
 */
export const reticulaCrayola: SketchFactory = (p: p5) => {
  const url = "/crayola.json";
  const columnas = 12;
  const filas = 10;

  let colores: { colors: { color: string; hex: string }[] } | undefined;
  let ancho = 0;
  let alto = 0;
  let nombre = "";

  class Bolita {
    x: number;
    y: number;
    diametro: number;
    color: string;
    nombre: string;

    constructor(x: number, y: number, d: number, color: string, nombre: string) {
      this.x = x;
      this.y = y;
      this.diametro = d;
      this.color = color;
      this.nombre = nombre;
    }

    dibujar() {
      p.fill(this.color);
      p.ellipse(this.x, this.y, this.diametro);
      // Si se hace clic sobre esta bolita, su nombre pasa a mostrarse al centro.
      if (p.mouseIsPressed && p.dist(p.mouseX, p.mouseY, this.x, this.y) < this.diametro) {
        nombre = this.nombre;
      }
    }
  }

  const bolitas: Bolita[] = [];

  // Callback que se ejecuta cuando el JSON terminó de cargar.
  const obtenerDatos = (datos: { colors: { color: string; hex: string }[] }) => {
    colores = datos;
    let contador = 0;
    for (let i = 0; i < columnas; i++) {
      for (let j = 0; j < filas; j++) {
        bolitas.push(
          new Bolita(
            i * ancho + 15,
            j * alto + 15,
            25,
            colores.colors[contador].hex,
            colores.colors[contador].color,
          ),
        );
        contador++;
      }
    }
  };

  p.setup = () => {
    p.createCanvas(800, 600);
    ancho = p.width / columnas;
    alto = p.height / filas;
    p.loadJSON(url, obtenerDatos as (data: object) => void);
    p.noStroke();
  };

  p.draw = () => {
    p.background(220);
    p.fill(255);
    p.textSize(50);
    p.textAlign(p.CENTER);
    p.text(nombre, p.width / 2, p.height / 2);

    if (colores) {
      for (const b of bolitas) {
        b.dibujar();
      }
    }
  };
};
