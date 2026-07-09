import type { CondicionClima, EstadoClima } from "./tipos";

/**
 * Clima real vía Open-Meteo (gratis, sin API key, CORS abierto) — el sitio es
 * export estático, así que todo ocurre en el navegador. Geolocalización con
 * fallback a CDMX; cualquier fallo de red/permiso degrada a "despejado".
 * `obtenerClima` NUNCA lanza.
 */

const CDMX = { lat: 19.43, lon: -99.13 };
const CLIMA_DEFAULT: EstadoClima = { condicion: "despejado", vientoKmh: 0, obtenidoEn: 0 };

/** Cada cuánto refresca el componente el clima (15 min). */
export const REFRESCO_CLIMA_MS = 15 * 60 * 1000;

function pedirPosicion(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) {
      resolve(CDMX);
      return;
    }
    let resuelto = false;
    const terminar = (pos: { lat: number; lon: number }) => {
      if (!resuelto) {
        resuelto = true;
        resolve(pos);
      }
    };
    navigator.geolocation.getCurrentPosition(
      (p) => terminar({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => terminar(CDMX),
      { timeout: 5000, maximumAge: 600000 },
    );
    // Algunos navegadores no invocan el callback de error al ignorar el prompt.
    setTimeout(() => terminar(CDMX), 6000);
  });
}

/** Mapeo de weather_code WMO → condición de la escena. */
function condicionPorCodigo(codigo: number): CondicionClima {
  if (codigo <= 1) return "despejado";
  if (codigo <= 3 || (codigo >= 45 && codigo <= 48)) return "nublado";
  return "lluvia"; // 51..99: llovizna, lluvia, nieve, chubascos, tormenta
}

export async function obtenerClima(): Promise<EstadoClima> {
  try {
    const { lat, lon } = await pedirPosicion();
    const url =
      "https://api.open-meteo.com/v1/forecast" +
      `?latitude=${lat.toFixed(2)}&longitude=${lon.toFixed(2)}` +
      "&current=weather_code,wind_speed_10m&wind_speed_unit=kmh";
    const abortar = new AbortController();
    const temporizador = setTimeout(() => abortar.abort(), 6000);
    const respuesta = await fetch(url, { signal: abortar.signal });
    clearTimeout(temporizador);
    if (!respuesta.ok) return { ...CLIMA_DEFAULT, obtenidoEn: Date.now() };
    const datos = (await respuesta.json()) as {
      current?: { weather_code?: number; wind_speed_10m?: number };
    };
    const codigo = datos.current?.weather_code;
    const viento = datos.current?.wind_speed_10m;
    return {
      condicion: typeof codigo === "number" ? condicionPorCodigo(codigo) : "despejado",
      vientoKmh: typeof viento === "number" && viento > 0 ? viento : 0,
      obtenidoEn: Date.now(),
    };
  } catch {
    return { ...CLIMA_DEFAULT, obtenidoEn: Date.now() };
  }
}

/** Intensidad de oscilación 0..1 (40 km/h ya es oscilación máxima). */
export function viento01(vientoKmh: number): number {
  const v = vientoKmh / 40;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
