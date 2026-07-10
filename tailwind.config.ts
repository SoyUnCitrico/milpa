import type { Config } from "tailwindcss";

/**
 * Paleta "terminal" del sitio personal (ver CLAUDE.md, "Paleta y estilo"):
 * verde neón como base/texto, naranja como acento puntual, fondo casi negro.
 */
const matrix = {
  black: "#050805",
  panel: "#0a140d",
  panelLight: "#0f2015",
  line: "#143b22",
  dim: "#00b341",
  green: "#00ff41",
  text: "#7fffa8",
  glow: "#33ff77",
};
const neon = {
  orange: "#ff8c1a",
  amber: "#ffae42",
  ember: "#ff6a00",
  // Morados: acento puntual exclusivo de las flores del frijol de la milpa.
  violet: "#a855f7",
  orchid: "#c98bff",
};

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta con nombre (igual que el sitio personal): matrix-* / neon-*.
        matrix,
        neon,
        // Tokens semánticos que ya usan los componentes → apuntan a la paleta.
        fondo: matrix.black,
        panel: matrix.panel,
        crema: matrix.text,
        acento: neon.orange,
        acento2: neon.amber,
      },
      fontFamily: {
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        "glow-orange": "0 0 12px rgba(255, 140, 26, 0.4)",
        "glow-green": "0 0 12px rgba(51, 255, 119, 0.35)",
      },
      animation: {
        fog: "fog 120s linear infinite",
      },
      keyframes: {
        fog: {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "-10000px 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
