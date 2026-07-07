// El addon de audio de p5 no trae tipos para este subpath; se importa por su
// efecto secundario (engancha p5.Oscillator/FFT/Filter/Envelope/Pulse al
// constructor de p5). Declararlo evita el error de "módulo no encontrado".
declare module "p5/lib/addons/p5.sound";
