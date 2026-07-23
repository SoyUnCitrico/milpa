# Algoritmos generativos

Este documento cataloga los algoritmos generativos detrás de las piezas más
relevantes de la galería: qué hacen, en qué biblioteca viven (si aplica) y qué
otros sketches comparten la misma base. El objetivo es que una pieza nueva se
pueda ubicar rápido en una familia existente, o documentarse aparte si no
encaja en ninguna sin forzarlo.

Se completa de forma incremental — cada vez que un sketch se unifica (ver
`.claude/agents/sketch-unifier.md`) o se crea uno nuevo (ver
`.claude/agents/sketch-creator.md`), se agrega o actualiza su entrada aquí, más
una línea en el **Registro histórico** al final del documento.

Antes de escribir un algoritmo nuevo, buscar aquí si ya existe: las familias
apuntan a la biblioteca de `lib/bibliotecas/` que hay que **importar** en vez de
reimplementar. La estructura común de toda pieza nueva vive en
`lib/sketches/_plantilla.ts`.

**Algoritmos que llegan de afuera.** No todo se escribe desde cero: parte del
catálogo entra como GLSL portado de shadertoy.com. El buzón para eso es
`lib/sketches/_entryShaderToy.glsl` — se pega ahí el shader con su URL y su
autor, y `sketch-creator` lo convierte en pieza y vuelve a dejar el archivo
vacío. La regla al documentarlo aquí es la misma que para lo escrito en casa,
más dos exigencias propias del port: **acreditar autor y fuente**, y anotar lo
que el port obligó a resolver (orientación de coordenadas, formato de
framebuffer, pasadas separadas), que es justo lo que no está en el original y se
vuelve a pelear si no queda escrito. Ver "Marea de Manos" como caso trabajado.

## Cómo decidir: ¿unificar o dejar aparte?

Un algoritmo se documenta como **familia compartida** (con referencias
cruzadas entre los sketches que la usan) si cumple al menos 2 de 3:

1. **Misma estructura matemática/procedimiento** — no solo "se ve parecido".
2. **Mismo propósito visual** (paisaje, órbita, partícula, epiciclo, etc.).
3. **Compartir la descripción no fuerza un acoplamiento artificial** entre
   piezas que deban poder evolucionar por separado.

Si un algoritmo no cumple 2/3 — por ejemplo, **Átomos de Píxel**, que
descompone una imagen en partículas con un motor propio de Processing sin
análogo en el resto de la galería — se documenta en su propia sección, sin
intentar generalizarlo ni referenciarlo desde otras piezas.

---

## Familias

### Espirales polares (biblioteca `Spiral`, `lib/bibliotecas/spiral.ts`)

Colocación de partículas en coordenadas polares: para cada partícula `i` de
`total`, el radio se interpola linealmente entre `radioInt` y `radioExt` según
`i/total`, y el ángulo acumula `ciclos * TWO_PI / total` por paso (más
`stepsRadio` controlando cuánto avanza el radio por vuelta). Si `radioInt !==
radioExt` la trayectoria implícita es una espiral; si son iguales, un círculo.
Cada partícula se dibuja rotada a su propio ángulo polar, con el tipo de forma
que reciba `Particle.show()` (`lib/bibliotecas/particula.ts`): `"square"` o
`"circle"` originales, más `"petalo"` — una gota alargada (base angosta en el
origen local, dos curvas bezier simétricas que abren al ancho máximo y cierran
redondeado en la punta) pensada para leerse como pétalo real en vez de un
cuadrado plano; al dibujarse después del `rotate()` a lo largo del eje local
+y, queda apuntando hacia afuera del centro de la espiral sin lógica adicional
en `Spiral`.

Usado por:
- **Girasol** (`girasol.ts`) — cuatro instancias de `Spiral` superpuestas
  (centro, dos coronas de semillas, pétalos), estáticas (`noLoop()` tras el
  primer frame). Pétalos aún tipo `"square"`, sin revisar.
- **Spiral Gira** (`spiralGira.ts`) — misma biblioteca, con radios/ciclos
  animados en ping-pong y offsets de ángulo rotando en sentidos contrarios.
  Su capa `petalos` usa el nuevo tipo `"petalo"` (primera y única pieza que lo
  usa hasta ahora); paleta empujada a un duotono ember oscuro/dorado propio
  (no comparte tonos con la variante violeta de `girasol.ts`).
- **Spiral One** (`spiralOne.ts`) — referencia cruzada, aún no revisado;
  variante de tres espirales concéntricas con ping-pong de radio.
- **Flor de Manos** (`florManos.ts`) — misma geometría de cuatro capas que
  `spiralGira`, pero los radios, el tamaño de partícula, los ciclos y el número
  de pétalos no hacen ping-pong autónomo: los fija el gesto de las manos leído
  por MediaPipe (ver "Gestos de mano como parámetros" abajo). Como `Spiral`
  congela `totalParticles` en el constructor, cambiar el número de pétalos
  **reconstruye esa capa**; el resto se ajusta en vivo con los `set*`. El color
  vivo se aplica sobre las partículas (`Particle.r/g/b`) porque
  `Spiral.setColor` solo guarda el string y cada `Particle` deriva sus canales
  al construirse.

### Relieve por ruido Perlin, tema matrix

Malla o trazo cuya altura/posición se calcula muestreando `p.noise(x, y)` (o
`p.noise(x)` en 2D) sobre un dominio que se recorre con `p.map()`, coloreado
por interpolación (`lerpColor`) entre los tonos de la paleta matrix
(`fondo` negro → `cuerpo` verde → `cima` naranja) según la altura del ruido.

Usado por:
- **Terreno de Ruido** (`terrenoRuido.ts`) — malla WEBGL (`TRIANGLE_STRIP`)
  de `tileCount × tileCount`, con dos LFOs senoidales modulando el rango de
  ruido en X/Y de forma autónoma y giro continuo en Z.
- Referencia cruzada (no revisados aún): **Ondas Moduladas**, **Órbitas de
  Lissajous**, **Malla Armónica**, **Líneas de Humo**, **Abanicos de
  Agentes** — comparten la paleta matrix (verde/naranja/negro) pero no el
  mismo procedimiento de muestreo (son osciladores/Lissajous/campos de
  agentes, no relieve por altura), así que se documentan aparte cuando se
  revisen, con nota de paleta compartida en vez de algoritmo compartido.

### Síntesis modular (VCO/PWM/VCF/ADSR)

Cadena de síntesis sustractiva clásica: uno o más osciladores (`VCO` onda
simple, `PWM` onda cuadrada de ancho variable) → filtro (`VCF`, pasabajos por
defecto) → envolvente(s) de amplitud (`ADSR`). Cada módulo es una clase que
posee su propio nodo de audio, sus controles (antes sliders, ahora `Knob`) y
su propio osciloscopio/espectro (`ScreenPlotter`).

Usado por:
- **Synth Modular** (`synth.ts`, `lib/bibliotecas/synth/{vco,vcf,adsr,
  screenPlotter}.ts`) — única pieza que instancia esta cadena completa hoy.

### Revolución — línea giratoria con trazo modulado por ruido

Familia de seis piezas que comparten la misma idea: **variar el trazo de una
línea mientras gira en círculos**. Estructura compartida: los extremos de la
línea se colocan sobre una trayectoria circular (`x = radio·cos(θ)`,
`y = radio·sin(θ)`, a veces con dos ángulos contrarrotantes), el grosor
(`strokeWeight`) y/o la opacidad se modulan con `p.noise(index)` (con `index`
avanzando muy despacio, ~0.0025/frame), y el dibujo se **acumula sobre un
fondo persistente** (sin `background()` por frame), de modo que la textura del
ruido queda grabada en el lienzo. Suelen ser piezas de duración fija que
rematan con `noLoop()` al cerrar el ciclo.

Cumple 2/3 de "Cómo decidir" (misma estructura matemática + mismo propósito
visual), pero **no se extrae biblioteca compartida**: las piezas evolucionan
por separado; esta sección es solo documentación cruzada.

Usado por:
- **Revolution** (`revolution.ts`) — arquetipo. Dos ángulos contrarrotantes
  (`angle` sube desde 0, `angle2` baja desde `TWO_PI`); la primera media
  vuelta traza líneas desde el centro (verde pálido, saturación y alfa por
  ruido) y la segunda líneas cian entre una órbita chica deformada por ruido
  (`radioChico · noise(index) · sin(angle)`) y la órbita grande. En esta
  revisión el ruido se expuso además como grosor del trazo principal (antes
  fijo en 1) y en dos subrutinas nuevas: `orbitales()` (punto ámbar en el
  extremo exterior de la línea, cuyo tamaño y opacidad son el ruido leído con
  un offset propio — al acumularse graba un anillo perimetral de cuentas) y
  `ecos()` (tick radial sobre un anillo intermedio, girando en sentido
  contrario al punto orbital, con grosor/alfa/largo por su propio offset de
  ruido). Remata con `cuadrados()` + `noLoop()` al cerrar la vuelta.
- **Revolution II** (`rev2.ts`) — variante verde/vino del arquetipo, con dos
  índices de ruido a velocidades distintas (vino ~0.001/frame, verde
  ~0.01/frame): la primera media vuelta traza líneas vino entre la órbita
  chica deformada por ruido y la órbita grande, la segunda líneas verde
  pálido desde el centro. Remata con una **franja de líneas rotada**
  (`cuadrados()` con `rotate(π·1.75)` y grosor decreciente) en verde neón +
  `noLoop()`. En esta revisión el ruido se expuso además como grosor del
  trazo (antes fijo en 1), cada mitad leyendo su propio índice; paleta
  re-mapeada hacia los tonos del sitio (verde matrix pálido / vino saturado
  sobre fondo vino-violeta casi negro) conservando el contraste frío/cálido
  entre las dos mitades.
- **Revolution III** (`rev3.ts`) — variante de **timeline por `millis()`**
  (≈30 s, `frameRate(15)`): en vez de una vuelta angular, tres fases
  sucesivas. **Atardecer** (`sunset()`): sol ámbar en expansión + horizonte
  exterior que en esta revisión dejó de ser una elipse limpia — contorno
  `beginShape()` de vértices polares con radio deformado por
  `noise(cos, sin, t)`, color interpolado violeta↔ember y alfa logarítmico,
  con una franja oscura que recorta el tercio inferior. **Rayo de luz**
  (`ligtRay()`): línea verde neón girando rápido desde el centro (`PI·64·t`)
  que destella en ámbar cuando el ruido pica alto. **Relieve** (`relieve()`):
  líneas orquídea entre dos radios, con la órbita interior deformada por
  ruido. Cambios de esta revisión: el ruido modula grosor y opacidad en las
  tres fases (antes trazo fijo en 1), la paleta pasó del duotono verde/vino
  (casi idéntico a rev2) a un carácter cromático por fase (ámbar/ember →
  verde neón → orquídea, tonos de los tokens del sitio), y se añadió una capa
  de acentos tipo Kandinsky dibujados una sola vez entre fases
  (`circulosConcentricos()`, `semicirculos()` sobre el horizonte,
  `diagonales()` y `reticula()` al remate). Termina con `noLoop()`.
- **Noise Circle** (`noiseCircle.ts`) — el "hola mundo" de la familia: **loop
  continuo sin `noLoop()`** (el ángulo hace módulo `TWO_PI` y sigue girando
  indefinidamente). Un punto orbita el perímetro (grosor y opacidad por dos
  lecturas de ruido) y una línea lo une al centro (brillo del trazo por
  `noise(index)`, opacidad por `noise(index·3)`), acumulándose sobre un fondo
  negro persistente que las vueltas van rellenando. En esta revisión la
  paleta gris/blanca cruda se re-mapeó al duotono del sitio (verdes matrix +
  ámbar puntual, conservando la doble modulación brillo/alfa del original) y
  se añadieron dos subrutinas que exponen más el ruido sin perder el carácter
  minimal: `cuentasIntermedias()` (cuenta sobre un anillo al ~55–61% del
  radio, que "respira" y cuyo grosor/alfa leen un offset propio de ruido — al
  acumularse graba un anillo granulado dentro de la estela) y
  `ticksPerimetrales()` (tick radial ámbar justo afuera de la órbita, girando
  en sentido contrario, que solo aparece cuando su ruido pica alto).
- **Relieve Rev** (`sunsetREv.ts`) — variante de **composición vertical**
  (1080×1350) con timeline por `millis()` (~42 s, `frameRate(30)`) y
  `noLoop()` al terminar. La misma trayectoria circular de la familia se usa
  para trazar un relieve de montaña: cada frame dibuja una línea entre la
  órbita exterior (`radioExt·cos/sin`) y una órbita interior cuya componente
  vertical está deformada por ruido (`radioInt·noise(ns)·sin`), con el ángulo
  mapeado a la franja temporal `t ∈ [0.5, 1]` (media vuelta) y acumulándose
  sin clear (el `background` transparente solo corre en `setup`). Cambios de
  esta revisión: el ruido se expuso además como grosor del trazo (antes fijo
  en 1, misma lectura que la opacidad); se añadió `bruma()`, un barrido de
  líneas horizontales de lado a lado que baja en Y al ritmo del timeline
  (fila objetivo `t·h`, una línea cada ~3 px), cada una con opacidad y grosor
  sutil por su propio índice de ruido — se dibuja cada frame ANTES del trazo
  de relieve para que la montaña quede legible sobre la neblina; y la paleta
  monocroma azul marino rgb(21, 35, 64) se re-mapeó a los tonos del sitio
  conservando el carácter oscuro/silueta (relieve en verde profundo de línea,
  bruma en verde apagado discreto), centralizada en un objeto `PALETA`.
- **Sunset Revolution** (`revNoiz.ts`) — segunda variante de **composición
  vertical** (1080×1350) con timeline por `millis()` (~42 s, `frameRate(30)`)
  y `noLoop()` al terminar. Entró a la familia en esta revisión porque ahora
  comparte la estructura del relieve por trayectoria circular con ruido:
  `montana()` usa exactamente el procedimiento de "Relieve Rev" (línea entre
  órbita exterior y órbita interior con la componente vertical deformada por
  `noise(ns)`, ángulo mapeado a la media vuelta `t ∈ [0.5, 1]`, acumulándose
  como silueta oscura sobre el horizonte). El resto de la pieza: **atardecer**
  (`sunset()`) con sol en expansión (`lerpColor` naranja→rojo, alfa decayendo
  por potencia) y un horizonte que dejó de ser elipse limpia —
  `horizonteRuido()`, contorno `beginShape()` de vértices polares con radio
  deformado por `noise(cos, sin, t·5)` (mismo procedimiento que el horizonte
  de rev3, con la coordenada de tiempo acelerada para que la deformación
  varíe de forma notoria entre líneas sucesivas), color en degradado por
  paradas a lo largo del timeline (naranja del sol → morado del cielo →
  morado profundo → morado oscuro del suelo) y alfa del trazo por el ruido
  del frame; **camino hacia enfrente**
  (`caminoAlFrente()`), relieve tipo joyplot/"FFT en el tiempo": filas de
  perfil de ruido (`noise(x·escala, fila·escala)`, dominio estático cacheado
  por fila) que aparecen una a una con el timeline desde el horizonte hacia el
  espectador, con perspectiva por potencia (filas cercanas más separadas y
  amplias), opacidad/grosor por un ruido propio por fila, y relleno color
  suelo que ocluye las filas de atrás; y **rayos de luz** (`ligthRay()`),
  puntos HSB sobre dos radios en expansión con brillo por timeline. EXCEPCIÓN
  de paleta: conserva su identidad de atardecer (naranjas ember/rojos +
  morados sobre fondo cálido oscuro, objeto `PALETA`) en vez del duotono
  matrix; solo el naranja del sol se acercó a `neon-ember` por coincidencia
  natural de matiz.

---

## Piezas individuales

### Synth Modular — motor de audio

Ver "Síntesis modular" arriba para el algoritmo de señal. Migrado de
`p5.sound` a **Tone.js**: `VCO`→`Tone.Oscillator`, `PWM`→`Tone.PulseOscillator`,
`VCF`→`Tone.Filter`, `ADSR`→`Tone.Envelope` + `Tone.Gain` explícito en la
cadena de señal (Tone no tiene el gain implícito que `p5.sound` aplicaba en
`envelope.play(nodo)`), `ScreenPlotter`→`Tone.Analyser`. Todos los nodos se
disponen vía `lib/bibliotecas/cleanup.ts::onRemove` al desmontar la pieza.
Parámetros por defecto centralizados en `CONFIG_SYNTH` al inicio de
`synth.ts`.

### Terreno de Ruido — malla por altura

Ver "Relieve por ruido Perlin, tema matrix" arriba. Particularidad de
rendimiento: `p.colorMode(p.RGB)` se llama una sola vez por frame (no por
vértice) para evitar ~2,600 llamadas redundantes por frame en la malla de
50×50.

### Generativo — líneas acumuladas + grid + spin + círculos pulsantes

Composición de estudio sin biblioteca compartida (no cumple 2/3 de "Cómo
decidir" con ninguna familia de arriba: ni la estructura matemática ni el
propósito visual coinciden con espirales polares, relieve por ruido ni
síntesis modular). Tres subrutinas del sketch original conviven en el mismo
lienzo, que **nunca se limpia** (rareza intencional preservada del port):

- `maze`: recorre el lienzo en pasos de `gap` px dibujando una diagonal `\` o
  `/` al azar en cada paso; como el fondo no se limpia, las líneas se
  acumulan formando un patrón tipo laberinto.
- `grid`: cuadrícula de elipses cada 45px; conserva la rareza del original de
  llamar `rotate(PI)` dentro del loop sin `push()/pop()`, por lo que la
  matriz de transformación gira de forma acumulada frame a frame.
- `spin`: un cuadrado centrado que rota un grado por frame (con `push()/pop()`
  correcto, a diferencia de `grid`).

Se agregó una cuarta subrutina, `circulosInteractivos`: 5 puntos distribuidos
en pentágono alrededor del centro del canvas, cada uno con una fase de latido
propia. A diferencia del resto de la pieza, cada círculo **repinta un disco
del color de fondo antes de dibujarse** — es la única parte del sketch que no
se acumula, para que el latido se lea nítido. El radio y la opacidad de cada
círculo oscilan con `sin(t · TWO_PI · velocidad + fase)`, con capas
concéntricas translúcidas (glow) alrededor de un núcleo sólido. Es afordancia
visual pura (sin texto): late y brilla solo para invitar al clic, y reutiliza
el mismo estado de clic que ya cambiaba el color de `maze`/`spin`
(`mousePressed`/`mouseReleased`) en vez de crear un sistema de interacción
paralelo — al mantener presionado el mouse, el núcleo cambia al mismo color
de acento activo y el latido se vuelve más rápido y amplio.

### Generativo Partículas — campo de flujo por rejilla (Coding Train)

Flow field clásico de The Coding Train: una rejilla de `cols × rows` celdas
(`scl` px cada una) donde cada celda guarda un vector de dirección obtenido de
`p.noise(x, y, z) * TWO_PI * 4` (con `z` avanzando 0.0001/frame para que el
campo entero derive despacio en el tiempo). Cada partícula consulta el vector
de la celda bajo su posición actual y lo aplica como fuerza de dirección
(`part.follow()` → `applyForce()`, acumulación clásica de steering con
velocidad limitada). Reusa `bibliotecas/particula.ts` extendida con el modo de
dibujo `"estela"` (traza una línea entre `pos` y `prevPos`), `derivaColor()`
(desvanecido + deriva de tono) y `rebote()` (invierte velocidad en los bordes).

No se unifica con **Líneas de Humo** / **Abanicos de Agentes** (ambas también
"agentes sobre un campo de flujo de ruido"): cumplen el criterio de propósito
visual pero no el de estructura — esas piezas muestrean `noise()` directamente
por agente vía las bibliotecas `AgenteHumo`/`AgenteAbanico`, sin la rejilla de
vectores precomputada por frame que usa esta pieza. Referencia cruzada, sin
fusionar (2/3 no se cumple).

Decisiones de esta revisión:
- **Paleta y color por partícula**: paleta propia violeta-magenta-cian neón
  sobre fondo casi negro (antes: azul plano `#0000ff` sobre fondo blanco). El
  color de cada partícula se elige con `p.randomGaussian` centrada en el
  índice medio del arreglo de paleta (el violeta), con reflejo en vez de
  recorte si la muestra cae fuera de rango — evita que el clamp acumule
  partículas artificialmente en los extremos cian/magenta.
- **Tamaño**: el único parámetro visualmente activo en modo `"estela"` es el
  grosor del trazo (`this.stroke`, 4º argumento del constructor); `size` (3er
  arg) no se usa en este modo. Ambos varían con una gaussiana angosta
  alrededor de un valor base.
- **`derivaColor()` ralentizada**: la tasa original (0.1/-0.1 por frame, sin
  tope) saturaba r/g en 255 y llevaba b a 0 en menos de un minuto,
  convergiendo toda partícula al mismo amarillo sin importar su color inicial
  — diluía cualquier paleta asignada. Se redujo a una décima parte
  (0.01/-0.01) para que la identidad de color dure varios minutos; el efecto
  de deriva orgánica se conserva, solo más lento.
- **Interacción de mouse** (antes inexistente: la pieza era 100% autónoma): el
  cursor actúa como atractor/repulsor continuo sobre las partículas dentro de
  un radio local, reutilizando `applyForce()` ya expuesto por `Particle` (sin
  mecanismo paralelo). Un clic invierte el modo atracción↔repulsión.

### Rejilla de Ojos — estado por objeto, sin biblioteca compartida

No se unifica con **Espirales polares** ni con la partícula de
**Generativo Partículas** (única otra pieza con estado persistente por
objeto en un arreglo): ni la estructura matemática (colocación polar vs.
rejilla ortogonal) ni el propósito visual (ojos interactivos vs. estelas de
flujo) coinciden — no cumple 2/3 de "Cómo decidir", así que va aparte, sin
biblioteca ni referencias cruzadas.

Cada ojo es una instancia de la clase `Ojo` (definida en `rejillaMovimiento.ts`,
no en `bibliotecas/` por ser específica de esta pieza) con estado propio:
posición, radios `radioX`/`radioY` (silueta ligeramente elíptica, no un
círculo perfecto), radio de iris/pupila, color de iris (elegido al azar de
`PALETA.irisOpciones` por ojo) y dos máquinas de estado con progreso en el
tiempo vía `p.millis()`:

- **Parpadeo**: cobertura del párpado en `[0, 1]` como `sin(t · π)` a lo largo
  de `duracionParpadeo` — sube y baja en una sola curva suave, sin tramo de
  espera cerrado, más simple que un three-phase blink y ya se lee natural.
- **Llanto**: una lágrima cae desde el borde inferior del ojo con progreso
  lineal `t` a lo largo de `duracionLlanto`, con fade-out en el último 20 %.

La pupila se recalcula cada frame para **todos** los ojos (estén o no
reaccionando) en dirección a `p.mouseX/mouseY`, con el desplazamiento
limitado (`maxOffset`) para no salirse del iris — efecto "googly eyes"
clásico. El párpado y la esclerótica se recortan a la elipse del ojo con el
contexto 2D nativo (`p.drawingContext`, mismo patrón ya usado en
`lib/parallax/cielo.ts` para el gradiente del cielo) para que el rectángulo
del párpado no sobresalga de la silueta al cerrarse.

Reescritura completa de la pieza original: pasó de un doble `for` sin estado
(un círculo blanco en trayectoria circular + una elipse modulada por ruido
Perlin por celda, sobre un fondo que nunca se limpiaba) a un arreglo de
objetos `Ojo` creado una vez en `setup()`. La rejilla (`CONFIG_GRID`) se
calcula a partir del radio máximo de ojo + margen, y el canvas se
redimensiona a `cols × celda` / `rows × celda` para llenarse sin encimar
ojos, en vez de la separación fija de 40 px del original (que no lo
garantizaba). El fondo se limpia cada frame — antes se acumulaba
indefinidamente, pero esa rareza no estaba documentada como intencional, y
con parpadeo/llanto animados los rastros acumulados no dejarían leer el
estado de cada ojo.

Decisión de interacción: al clic, los `cantidadReaccion` ojos más cercanos al
punto tocado reaccionan (mitad parpadea, mitad llora, alternando por
cercanía) en vez de un subconjunto aleatorio disperso en el canvas — se lee
como una reacción localizada que se propaga desde el punto de contacto.

### Aros Pulsantes — rejilla con estado por celda, sin biblioteca compartida

No se unifica con **Rejilla de Ojos** (única otra pieza de rejilla con estado
persistente por objeto en un arreglo): comparten el patrón arquitectónico
(arreglo de objetos creado en `setup()`, actualizado/dibujado en `draw()`)
pero no la estructura matemática (pulso/rotación paramétrico vs. máquinas de
estado de parpadeo/llanto) ni el propósito visual (rejilla geométrica
psicodélica vs. ojos que reaccionan al clic) — no cumple 2/3 de "Cómo
decidir", así que va aparte.

Cada celda (`Celda` en `arosPulsantes.ts`) dibuja tres formas concéntricas en
proporción áurea constante (φ ≈ 1.618): el cuadrado es la unidad base, el aro
mide `cuadrado × φ` y el punto `cuadrado ÷ φ`, relación que se mantiene aunque
el tamaño base y el pulso varíen. El tamaño base de cada celda es
determinístico (`p.noise(col, row)` muestreado una sola vez en `setup()`, no
por frame). Dos de cada tres celdas (`indice % 3 !== 2`) usan un pulso
ping-pong senoidal; la tercera usa una animación visiblemente distinta:
rotación continua del cuadrado más un **rebote elástico amortiguado**
(`reboteElastico()`: `sin(t·π·3.5) · e^(-6t)`, un impulso tipo resorte que
oscila y decae en cada ciclo) en vez del pulso suave. El color usa
`colorMode(HSB)` con el matiz recorriendo el espectro de forma continua
(`p.frameCount * velocidadColor`), con un corrimiento de fase propio por
celda y por elemento (punto/aro/cuadrado en relación triádica, ~130°/250° de
separación) para el efecto psicodélico. Las celdas cercanas al mouse se
"energizan" (más amplitud de pulso, más velocidad de animación, más
saturación/brillo) con una caída suave tipo *smoothstep* en vez de un corte
abrupto al llegar al radio de influencia.

Reescritura completa de la pieza original: pasó de un doble `for` sin estado
(punto blanco, aro azul y cuadrado rojo fijos, con `size1`/`size2` acumulados
de forma incidental a lo largo del propio recorrido del loop, no realmente
por posición de celda) a un arreglo de instancias de `Celda` creado una vez en
`setup()`, siguiendo el mismo cambio arquitectónico ya aplicado en
`rejillaMovimiento.ts`.

### Bolitas Ping-Pong — física de rebote + instrumento percusivo por evento

No se unifica con "Síntesis modular (VCO/PWM/VCF/ADSR)" de arriba: comparte
el mismo tipo de nodos de bajo nivel (oscilador → filtro → envolvente + gain)
pero no las clases `VCO`/`VCF`/`ADSR` de `lib/bibliotecas/synth/` — esta
pieza arma una "voz" mínima inline, sin osciloscopio ni knobs — ni el
propósito visual (sintetizador modular con paneles vs. bolitas rebotando).
No cumple 2/3 de "Cómo decidir", así que va aparte.

Física: cinco `Bolita` (posición y velocidad como `p5.Vector`, arreglo de
tamaño fijo) se mueven sumando su velocidad cada frame e invierten la
componente `x` o `y` de su velocidad al salir de una frontera rectangular
fija — mismo comportamiento que el sketch original de vectores, ahora con
estado por objeto en vez de variables sueltas (`posBolita`/`velBolita`/
`sizeBol` × 3).

Audio: cada rebote dispara una voz de un pool de `CONFIG_SYNTH.numVoces`
(3), tomadas en round-robin para que rebotes casi simultáneos no se corten
entre sí sin necesidad de polifonía real de 5 voces. Cada voz es un
`Tone.Oscillator` (triangular, arrancado una sola vez y dejado corriendo) →
`Tone.Filter` `"bandpass"` centrado en ~3 kHz con Q alto (timbre de
campana/marimba en vez de un tono plano) → `Tone.Envelope` percusiva (attack
corto, sustain 0) conectada a un `Tone.Gain` explícito → `Tone.Destination`.
`freqDeTamano()` mapea el tamaño de cada bolita a su frecuencia de forma
lineal inversa: bolitas chicas suenan agudas y las grandes graves, la misma
relación física que una marimba o vibráfono real (barra corta = aguda). Al
hacer clic se "mata" la última bolita del arreglo y nace una con tamaño,
velocidad, color y frecuencia nuevos en una posición aleatoria dentro de la
frontera; el arreglo nunca cambia de tamaño.

Todos los nodos se disponen vía `onRemove` al desmontar. Rendimiento: se
eliminó una asignación evitable — el original clonaba (`.copy()`) los
límites de la frontera en cada frame dentro de `frontera()` aunque son fijos
y nunca se mutan; ahora se comparan directamente sin clonar.

### Space Game — máquina de estados + entidades OOP dedicadas

No se unifica con ninguna familia de arriba ni con las piezas de "Piezas
individuales": no comparte biblioteca (`lib/bibliotecas/juegoEspacial/`, propia
y exclusiva de esta pieza) ni estructura matemática con espirales polares,
relieve por ruido, síntesis modular o campos de flujo — es un shooter con
máquina de estados (`"inicio" | "jugando" | "gameover"`) y colisiones círculo-
círculo, sin análogo generativo en el resto de la galería. Va aparte, sin
forzar referencias cruzadas.

Entidades (`lib/bibliotecas/juegoEspacial/{jugador,enemigo,proyectil,
particulaExplosion}.ts`), todas con `x`/`y`/`radio`/`color` propios:
- **Jugador**: nave triangular (silueta tipo "asteroids", punta adelante /
  base atrás) dibujada con `p.triangle()` dentro de un `push()/rotate()`
  local. Se mueve con WASD (`p.keyIsDown` revisado cada frame en
  `actualizarJuego`, no en `keyPressed`, para movimiento continuo mientras se
  mantiene la tecla) y su posición se acota a los bordes del canvas con
  `p.constrain`. El ángulo hacia el cursor se calcula una sola vez por frame
  en `Jugador.actualizarAngulo()` (fuente única, `Math.atan2`); tanto el
  dibujo de la nave como `disparar()` en `spaceGame.ts` reutilizan
  `jugador.angulo` en vez de recalcular el mismo `atan2` dos veces.
- **Enemigo**: spawnea en un borde del canvas y persigue al jugador en línea
  recta; encoge con un tween manual (`lerp` hacia `radioObjetivo`, reemplaza
  el `gsap.to` del original) al recibir impactos hasta explotar.
- **Proyectil** / **ParticulaExplosion**: movimiento en línea recta y
  partícula de explosión con fricción + fade-out, respectivamente.

Decisiones de esta revisión:
- **Color de enemigo por tier de tamaño**: antes `hsl(random(360), 50%, 50%)`
  (matiz arbitrario de todo el espectro, sin curar). Ahora se elige al azar
  de `PALETA.enemigos` en `spaceGame.ts`, con tres tiers según el radio de
  spawn (`frios` < 13px, `medios` 13–22px, `calientes` ≥ 22px). Los enemigos
  grandes aguantan más impactos antes de explotar (ver `Enemigo.encoger`), así
  que se les asignan tonos más "calientes" (ámbar/rojo) para sugerir mayor
  peligro/resistencia frente a los tonos fríos (cian/violeta) de los chicos.
- **Campo de estrellas**: arreglo fijo de ~60 estrellas generado una sola vez
  en `setup` (no recreado por frame), redibujado encima del fondo en los tres
  estados del juego (antes las pantallas de inicio/game-over usaban
  `background(0)` sólido sin estrellas, y `actualizarJuego` solo tenía la
  estela de motion blur). El parpadeo es `sin(t · velocidadParpadeo + fase)`
  por estrella, con componentes RGB precomputados una vez (no un `p5.Color`
  nuevo por estrella por frame).
- **Pantalla de game over**: antes capa translúcida acumulada sobre el último
  frame de juego (converge a negro sólido en pocos frames); ahora dibuja
  fondo sólido + estrellas + velo oscuro para texto, priorizando que el campo
  estelar sea visible de forma consistente sobre la congelación del último
  frame de la partida.

### Composición Áurea — capas translúcidas en razón φ + espiral áurea + CRT

No se unifica con **Aros Pulsantes** (la otra pieza que escala elementos por
la razón áurea φ ≈ 1.618): comparten *solo* el motivo de dimensionar por φ,
pero no la estructura (aquí una composición fija de seis capas de discos
anclados a esquinas/retículas más un cuadrado central que gira, sin rejilla
ni estado por celda) ni el propósito visual (composición estática en capas vs.
rejilla pulsante psicodélica). No cumple 2/3 de "Cómo decidir", así que va
aparte.

Escala de diámetros: seis tamaños `diametroBase · φ^n` (`diametroBase = 81`,
cada uno el anterior × φ). Cada capa (`circulosUno … circulosSeis`) dibuja
discos translúcidos de un tamaño de la escala anclados al centro, a las cuatro
esquinas o a las cuatro retículas de una rejilla de 3×3; los alfa originales
(0.5 / 0.64 / 0.8) hacen que las capas se mezclen por transparencia. Un
cuadrado sin relleno gira en el centro (`angle += 0.01`, módulo `TWO_PI`), y
ese ángulo es la única variable de tiempo de la pieza — todo lo demás es fijo.

**Puntos de interés (espiral áurea):** expansión del único círculo de esquina
del original (`circulosUno`). Se siembran `NUM_PUNTOS` acentos partiendo del
centro; cada punto se coloca al **ángulo áureo** (`π·(3−√5)` ≈ 137.5°) del
anterior, con el radio multiplicado por φ y el diámetro dividido por φ. Así
tanto la distancia al centro como el tamaño de cada acento siguen la misma
razón áurea que la escala de diámetros. Se calculan una sola vez en `setup()`
(no por frame).

**Postproceso CRT modulado por el giro:** la composición se dibuja en un
buffer offscreen (`p5.Graphics` a `pixelDensity(1)`) y se compone sobre el
canvas con cuatro efectos cuya intensidad se deriva del ángulo del cuadrado
(no de un reloj propio), así el CRT "respira" con la rotación:
- **Aberración cromática**: el buffer se blitea tres veces (un canal RGB por
  copia, vía `tint` + `blendMode(ADD)`) con desplazamiento horizontal
  `map(sin(angle), −1..1, 0..6)` px. Sobre negro puro los canales se
  reconstruyen donde coinciden y dejan franjas de color donde no.
- **Scanlines**: textura pre-horneada una vez (líneas de 1px cada 3px), con
  alfa modulada por `cos(angle·φ)`.
- **Viñeta**: gradiente radial pre-horneado (`createRadialGradient` sobre el
  `drawingContext` del buffer), con factor de oscurecimiento
  `vinetaBase + vinetaAmp·sin(angle·2)`.
- **Flicker**: velo negro de alfa `flickerBase + flickerAmp·|sin(angle·7)|`
  más un jitter aleatorio por frame.

Ningún efecto recorre píxeles en JS por frame: todo es blit de buffers +
`blendMode`/`tint`, para que el canvas de 1000² rinda. Colores extraídos a
`PALETA` con re-mapeo 1-a-1 de los matices originales a tokens del sitio,
para que las capas superpuestas se distingan entre sí: verde matrix como
base/estructura (cuadrado que gira, disco central mayor y medio), azul →
violeta y rojo → ember en la capa diagonal 5, naranja → ámbar en la capa 4,
crema → orquídea en las retículas, y rojo oscuro → naranja neón en el círculo
de esquina y los puntos de interés — respetando los alfa translúcidos del
original.

---

### Mouse Paint — pintura por capas + polígono por vértices

Herramienta de pintura interactiva. No comparte estructura ni propósito visual
con ninguna otra pieza (es acumulación libre dirigida por el usuario, no un
sistema generativo autónomo), así que va aparte, sin forzar una familia.

**Arquitectura de dos capas.** El original acumulaba directo sobre el canvas y
nunca limpiaba el fondo. Aquí el trazo persistente vive en un buffer offscreen
`p.createGraphics(W, H)` (`capaPintura`) que **se mantiene transparente** y solo
guarda las marcas (brochas y figuras cerradas confirmadas). Cada frame el
`draw()` del canvas principal hace, en orden: `background(colorFondo)` →
`image(capaPintura, 0, 0)` → overlay transitorio. Consecuencias:
- **Fondo no destructivo**: el color de fondo se repinta detrás de la capa cada
  frame, nunca se hornea en ella, así que cambiarlo no borra lo pintado.
- **Overlay sin embarrar**: como el canvas se reconstruye cada frame desde la
  capa, se puede dibujar encima lo transitorio (preview de la figura en curso,
  contorno del cursor de tamaño, HUD de estado) sin que se acumule.

**Brochas como funciones** (una figura = una función, dibujan sobre la capa):
`cuadrado` (rect rotante del original, `angBrocha += 0.15` por estampa),
`circular` (elipse sólida), `linea` (segmento de `pmouse` a `mouse` mientras se
arrastra), y dos compuestas: `aerografo` (salpicado de puntos con jitter polar,
densidad ∝ tamaño) y `roseton` (N copias de un pétalo rotadas alrededor del
punto). Un dispatcher aplica la brocha activa en `mousePressed`/`mouseDragged`.

**Polígono por vértices.** En modo figura cada click empuja `{x, y}` a un array;
`c` confirma con `beginShape()` / `vertex()` / `endShape(CLOSE)` sobre la capa,
con `stroke` = color de borde y `fill` = color de relleno (por defecto igual al
de brocha), y limpia el array. Mientras se construye, el overlay previsualiza la
polilínea abierta más un marcador por vértice.

Colores extraídos a `PALETA` (identidad matrix/neon: fondo negro casi puro,
brocha verde neón, borde naranja) usados como valor inicial de los selectores
`createColorPicker`. `saveCanvas` guarda el canvas principal, que incluye la
pintura porque el `draw()` blitea la capa cada frame.

### Trayectorias — composición paramétrica en capas translúcidas

No se unifica con ninguna familia de arriba. Aunque comparte el motivo de la
"opacidad modulada por ruido" con la familia **Revolución**, no cumple 2/3 de
"Cómo decidir": ni la estructura matemática (aquí son trayectorias paramétricas
independientes —anillos polares, senoidal, Lissajous, convergencia lineal—, no
la línea giratoria sobre órbita circular del arquetipo) ni el propósito visual
(composición estratificada en cuatro capas superpuestas vs. una única línea que
gira y graba su estela) coinciden. Va aparte, sin biblioteca compartida ni
referencias cruzadas.

Cuatro capas paramétricas trazadas sobre un mismo timeline `t ∈ [0,1]`
(`millis()` mapeado sobre `duration`), acumulándose sobre un fondo persistente
(el `background` solo corre en `setup` / al reiniciar), todas con alfa bajo para
que se mezclen por transparencia:

- **Fondo — anillos concéntricos** (`fondoConcentrico`): un anillo por frame a
  radio `t · rMax`, dibujado como `beginShape()` de vértices polares con el
  radio deformado por `noise(cos, sin, r·k + ns)`; la opacidad del stroke se
  modula por el radio (`map(r, 0, rMax, 45, 6)`, anillos exteriores más tenues)
  multiplicado por el ruido. Al acumularse graba un patrón de anillos que crecen
  desde el centro.
- **Senoidal** (`capaSenoidal` + `traySin`): la senoidal del original, pero con
  el recorrido VERTICAL — `y = t·h` avanza de arriba hacia abajo y `x` oscila
  alrededor del centro (antes era X el que barría el canvas).
- **Lissajous central** (`capaLissajous` + `trayLissa`): figura de Lissajous
  trazada como segmentos unidos (`line(prev, actual)`). Los períodos `perX`/
  `perY` se exponen con dos `Knob` ("Período X" / "Período Y", 1..8 enteros);
  cambiar cualquiera llama `reiniciar()` (resetea el timeline, limpia el fondo y
  hace `p.loop()`) para volver a trazar la figura desde cero. Al completarse el
  timeline la pieza hace `noLoop()`.
- **Convergencia** (`capaConvergencia` + `trayConverge` + `brechaDiagonales`):
  dos trayectorias que interpolan linealmente desde las esquinas inferiores
  hacia el punto de convergencia (centro-X, arriba). No se dibujan como curva
  continua sino con BRECHAS de líneas diagonales — cada tres frames un batch de
  seis líneas paralelas inclinadas hacia el punto de convergencia, con offset
  perpendicular; al acumularse forman dos flujos de líneas que se juntan arriba.

Colores RGB crudos del original (azul/rojo/verde) re-mapeados a la paleta
cyberpunk `PALETA` (cian de fondo, verde neón matrix la senoidal, naranja neón
la Lissajous, violeta/orquídea las dos trayectorias de convergencia), todo con
alfa bajo para la mezcla por capas. Se eliminó la trayectoria logarítmica del
original y el `CCapture`.

### Gestos de mano como parámetros (biblioteca `RastreadorManos`, `lib/bibliotecas/manosMediaPipe.ts`)

Capa de entrada, no de dibujo: convierte visión por computadora en números
normalizados que cualquier pieza puede usar como si fueran perillas. El modelo
**MediaPipe Hand Landmarker** (red neuronal de Google, WASM + `.task` por CDN)
devuelve 21 landmarks 3D por mano; la biblioteca los reduce a gestos estables:

- **Escala invariante a la profundidad**: todas las distancias se dividen por
  `dist(muñeca, nudillo del medio)`, así acercar la mano a la cámara no
  dispara los parámetros.
- **Dedo levantado**: la punta queda más lejos de la muñeca que su falange
  media (`> 1.08×`). Comparar solo la `y` de punta vs. falange —el criterio
  típico— falla en cuanto el usuario gira la muñeca; la distancia radial no.
  El pulgar se evalúa aparte (se abre lateralmente, no se dobla igual).
- **Pinza**: distancia pulgar–índice normalizada. **Apertura**: extensión
  promedio de los cuatro dedos, 0 (puño) a 1 (mano abierta). **Separación**:
  distancia entre los centros de palma de ambas manos.
- Coordenadas **espejadas en X** en la propia biblioteca, para que la pieza
  responda como espejo sin que cada sketch lo recuerde.

Detalles de integración: el import de `@mediapipe/tasks-vision` es **dinámico**
dentro de `iniciar()` (toca `window`/WASM, rompería el SSR de Next, mismo
criterio que Tone.js); `detectForVideo` solo corre si `video.currentTime`
avanzó; `iniciar(deviceId)` es reentrante, así cambiar de cámara no recarga el
modelo. La cámara la maneja `Camara` de `lib/bibliotecas/camara.ts` — ver
abajo.

**Detección de parpadeo (opcional):** si se pasa `onParpadeo` al constructor, se
carga además el **Face Landmarker** con `outputFaceBlendshapes` sobre el mismo
video. En cada frame se leen los blendshapes `eyeBlinkLeft`/`eyeBlinkRight`;
cuando ambos superan el umbral, `ojosCerrados` se pone en true y el callback se
dispara en el **flanco** de cierre (con un refractario) — un parpadeo ejecuta la
acción una sola vez. Es un segundo modelo, así que solo se carga si la pieza lo
pide. Lo usa `florShader.ts` para guardar la imagen al cerrar los ojos.

### Malla de la cara como geometría (biblioteca `RastreadorCara`, `lib/bibliotecas/caraMediaPipe.ts`)

Hermana de `RastreadorManos`, pero deliberadamente **aparte**: aquella expone
*gestos* de mano y un `onParpadeo` de "ambos ojos" del que dependen `florShader`
y `florManos`, y tocarla para meterle geometría de cara sería arriesgar esas dos
piezas. Ésta expone lo que necesita una pieza que quiere **la cara como
superficie**: los 478 landmarks, la triangulación que los cose, la caja
envolvente, la punta de la nariz y los blendshapes de parpadeo **por ojo
separado** (`eyeBlinkLeft` / `eyeBlinkRight`).

**Triangulación — el punto interesante.** `FaceLandmarker.FACE_LANDMARKS_TESSELATION`
**no son triángulos**: son 2556 *aristas* (`{start, end}`), pensadas para
dibujar la malla con `line()`. Para llenarla con triángulos hay dos caminos:
pegar un blob de ~2700 índices copiados de la web (que se desincroniza del
modelo y nadie puede auditar), o **derivar los 3-ciclos del grafo** una sola vez
al arrancar:

```
adyacencia[a] ∪= {b}, adyacencia[b] ∪= {a}   para cada arista
triángulo (a,b,c)  ⟺  a < b < c  ∧  b,c ∈ adyacencia[a]  ∧  c ∈ adyacencia[b]
```

El orden creciente `a < b < c` hace de dedupe sin necesidad de claves de texto.
Resultado verificado contra el paquete instalado (`@mediapipe/tasks-vision`
0.10.35): **468 vértices, 2556 aristas → 854 triángulos**, que es justo lo que
se espera de una malla cerrada de ese tamaño (2556/3 = 852 caras nominales; los
dos de más son 3-ciclos del grafo que no son caras y no se notan). La biblioteca
guarda un `avisoMalla` si el número cae fuera de 700–1100, para que una malla
rota se vea en el HUD en vez de dibujarse en silencio.

**Espejado y winding.** Igual que en manos, la `x` se espeja (`x → 1 − x`) para
que la pieza se lea como espejo. Espejar **invierte el winding** de los
triángulos: quien dibuje con backface culling tiene que invertir el orden de los
índices. p5 no culea caras por defecto, así que en la práctica no molesta — pero
está documentado para que no sorprenda.

**UV en espacio local de la cara.** `uvLocal(punto, caja)` devuelve la posición
del landmark **dentro de la caja envolvente de todos los landmarks**. Es la
diferencia entre una textura anclada a la cara y una que se desliza: si las UV
se calcularan en espacio de pantalla, mover la cabeza arrastraría la textura por
encima de la cara. Con la caja, todo se mueve junto.

El resto es la disciplina ya resuelta en `manosMediaPipe.ts` (import dinámico,
WASM/modelo por CDN, `iniciar(deviceId)` reentrante, `detectForVideo` guardado
por `video.currentTime`, `fase`/`mensaje` para el HUD, preview compuesto en un
`p5.Graphics` 2D). `outputFacialTransformationMatrixes` queda **apagado**: la
pose de la cabeza ya viaja en la `z` de los propios landmarks (la malla se
deforma sola al girar), y pedir la matriz obligaría a descomponerla para nada.

Usado por: **Máscara en el Túnel** (`mascaraTunel.ts`).

### Entrada por cámara (biblioteca `camara.ts`)

Infraestructura compartida para cualquier pieza que use la cámara:
`enumerarCamaras()`, `pedirPermiso()`, `SelectorCamara` (menú + botón "Buscar
cámaras") y `Camara` (abre el stream sobre un `<video>` propio). Generaliza lo
que la pantalla de configuración de Átomos de Píxel
(`lib/bibliotecas/atomosPixel/pantallaConfig.ts`) resolvía solo para esa pieza.

Tres trampas que motivan la biblioteca, y que conviene no volver a pisar:

1. `p.createCapture(VIDEO)` **no deja elegir dispositivo**: con webcam
   integrada + externa (o frontal/trasera en celular) abre la que quiera el
   navegador y el usuario no tiene cómo corregirlo.
2. `enumerateDevices()` devuelve los `label` **vacíos** mientras no haya
   permiso concedido, así que el menú se puebla con nombres genéricos: hace
   falta un botón que pida `getUserMedia` (y corte los tracks al instante) para
   volver a enumerar ya con nombres reales.
3. `.hide()` sobre el `<video>` de la captura le pone `display:none`, y un
   video así puede **dejar de decodificar frames** — con lo que la inferencia
   por frame se congela sin ningún error visible. `Camara` lo esconde
   moviéndolo fuera de pantalla (`left: -10000px`), que sí sigue reproduciendo.

El `<video>` se crea con `p.createElement`, así queda dentro del contenedor del
sketch: p5 lo destruye al desmontar y `P5Sketch.tsx` además corta el
`MediaStream`.

Usado por:
- **Flor de Manos** (`florManos.ts`), vía `RastreadorManos`.
- **Flor de Shader** (`florShader.ts`), vía `RastreadorManos`.
- **Marea de Manos** (`mareaManos.ts`), vía `RastreadorManos`.
- **Máscara en el Túnel** (`mascaraTunel.ts`), vía `RastreadorCara`.
- **Fractal de Julia** (`fractalJulia.ts`), vía `RastreadorManos` (primera pieza
  que abre además el micrófono con p5.sound, dos `getUserMedia` a la vez).
- **Caverna a Impulsos** (`cavernaImpulso.ts`), vía `RastreadorManos`.

Consumido por:
- **Marea de Manos** (`mareaManos.ts`) — el centro de la palma es el pincel que
  inyecta agua en la simulación de fluido, y `apertura` alimenta un detector de
  flancos del puño (histéresis + refractario, calcado de `detectarParpadeo`)
  que dispara impulsos radiales. El tamaño aparente de la mano
  (`dist(puntos[0], puntos[9])`, muñeca → nudillo medio) escala el radio del
  pincel y del impulso. Ver su sección propia.
- **Flor de Shader** (`florShader.ts`) — gestos repartidos entre sus tres
  cuerpos: dedos → pétalos, pinza → agudeza y puño → cuenco (dona), separación
  de manos → tamaño del núcleo esférico, altura de la mano → largo del tallo.
  El tono cicla solo. Ver su sección propia.
- **Flor de Manos** (`florManos.ts`) — primera pieza. Mapeo:
  pinza → tamaño de pétalo, dedos levantados → número de pétalos (5–40),
  separación de manos → radio de apertura, apertura de puño → corazón y
  densidad de semillas, posición de la mano → tono (X) y velocidad de giro (Y).
  Todos los valores pasan por interpolación exponencial hacia el objetivo
  (`suave()`, factor 0.1) porque la lectura del modelo salta frame a frame y
  sin suavizado la flor tiembla. Los mismos parámetros quedan expuestos como
  `Knob`, así la pieza es usable sin cámara ni permiso.
- **Fractal de Julia** (`fractalJulia.ts`) — solo dos parámetros continuos:
  `centro.x` de la primera mano → rotación de tono de la paleta (0–1 → 0–2π),
  `centro.y` (invertido, `1 − y`) → semilla del fractal. Ambos con lerp de
  factor 0.12 hacia el objetivo. Cadena de prioridad mano > mouse arrastrado >
  perillas "Paleta"/"Forma", igual filosofía que el pincel de `mareaManos`. Ver
  su sección propia.
- **Caverna a Impulsos** (`cavernaImpulso.ts`) — la mano no mueve nada de forma
  continua: se usa solo su **tamaño aparente** (muñeca→nudillo medio) como proxy
  de profundidad, y un detector de flancos (histéresis + refractario, calcado de
  `detectarParpadeo`) dispara un impulso cuando la mano se acerca de golpe. Mismo
  impulso que el botón "Adelante". Ver su sección propia.

### Flor de Shader — dona + núcleo + tallo, texturas procedurales en GLSL

Única pieza de la galería con shaders propios, y la única que construye
geometría 3D (malla inmediata + esfera y cilindros retenidos) en vez de dibujar
figuras 2D. **Tres cuerpos**, cada uno con su fragment shader, sobre un ruido de
valor + fbm compartido (`NOISE_GLSL`, concatenado en los tres):

**1. Corona de pétalos (dona).** Perfil polar de lóbulos:

```
r(θ) = tamaño · radioNorm · (0.34 + 0.66 · |cos(nPétalos·θ/2)|^agudeza) · irregular(θ)
radioNorm = agujero + u·(1 − agujero)   // u ∈ [0,1] → [agujero, 1]
```

El lóbulo vale 1 sobre el eje de cada pétalo y 0 entre pétalos; `agudeza`
decide si el pétalo es redondo (bajo) o afilado (alto). El anillo interior
arranca en `agujero` en vez de 0, así el centro queda **hueco como una dona**;
`u`/`v` (UV) siguen yendo 0→1 para que el shader coloree igual. Se muestrea en
`anillos × segmentos`, con `z = -curvatura·tamaño·u²` (cuenco) y se cose con
`TRIANGLE_STRIP`. La irregularidad es `noise(cos θ, sin θ, t)`: muestrear sobre
el **círculo unitario** hace que θ=0 y θ=2π coincidan, cerrando la vuelta sin
costura. El fragment shader: fbm con **dominio deformado** (`fbm(q + fbm(q·1.7))`,
nervaduras en vez de manchas), bandas concéntricas, **paleta coseno**
(`a + b·cos(2π(c·t + d))`, iridiscente) y un especular que sigue la mano
(exponente 9 y luz fuera del centro: en `(0.5,0.5)` quemaría el borde interior a
blanco). El vertex shader mece las puntas con una onda amplificada por `u²`. La
paleta de la corona **evita el verde**: baja base y amplitud en el canal G, más
un tope duro `col.g = min(col.g, max(col.r, col.b))` que hace matemáticamente
imposible que el verde domine en cualquier fase del tono (el verde queda para el
tallo). Los pétalos están limitados a 3–10.

**Fondo de oleaje.** Un cuarto shader dibuja un mar de olas suaves como telón:
cuad de pantalla completa cuyo vertex shader ignora cámara/proyección y mapea la
UV (0–1) directo a clip space, así llena el lienzo sin importar la perspectiva.
Se dibuja primero con `gl.disable(DEPTH_TEST)`. El fragment es fbm + senoidales
lentas desplazando bandas horizontales, en azules oceánicos oscuros para que la
flor resalte.

**2. Núcleo esférico.** Una `p.sphere()` en el hueco de la dona, empujada al
frente. Textura celular pulsante (`mix(fbm(uv·7), fbm(uv·15))`) con el tono
**+0.5** respecto a los pétalos para que contraste. Sombreado 3D real:
difuso + rim sobre la normal en espacio de vista.

**3. Tallo.** Pila de `talloSeg` cilindros (`p.cylinder()`, eje Y → caen al
suelo) que se adelgazan hacia la punta y se desvían con `sin` acumulado (curva
orgánica). Fragment shader verde: fibras verticales de fbm + venas, con difuso y
rim.

**Sombreado de los sólidos:** el vertex shader de núcleo y tallo declara
`uNormalMatrix` — p5 solo inyecta esa matriz **si el shader la declara** (ver
`Shader._setMatrixUniforms`), y con ella se computa la normal en espacio de
vista para el difuso/rim. La corona no la necesita (es una superficie plana
teñida por su UV).

**Apilado por capas (lejana → cercana):** tallo, luego núcleo, luego pétalos
encima. En WEBGL el orden de dibujo no basta —el z-buffer resuelve la oclusión
por profundidad real— así que entre capa y capa se hace
`gl.clear(DEPTH_BUFFER_BIT)`: cada cuerpo conserva su 3D interno pero el
siguiente lo pinta encima por completo (algoritmo del pintor **por capa**). Así
los pétalos tapan el núcleo salvo en el hueco de la dona, y el tallo nace desde
detrás de la flor sin depender de ajustar los z a mano.

**Tono en loop infinito:** un contador avanza `velTono` por frame (módulo 1000
para no perder precisión) y alimenta el uniform de tono de los tres shaders; no
hay perilla de tono.

No comparte biblioteca con la familia de **espirales polares**: allí se colocan
partículas independientes en coordenadas polares, aquí se teje una superficie
continua con UVs y se combinan primitivas 3D. Comparte el propósito visual (una
flor) pero no la estructura ni el modo de dibujo — 1 de 3 en "Cómo decidir".

Notas de WEBGL que costaron y conviene recordar:
- El HUD de texto va en un `PanelEstado` (`lib/bibliotecas/boton.ts`), no en
  `p.text`: en WEBGL `text()` exige una fuente cargada con `loadFont`. El mismo
  panel resuelve el problema simétrico en las piezas 2D con fondo translúcido,
  donde el texto dibujado en el canvas se sobreimprime hasta ser ilegible.
- El preview de cámara necesitó que `RastreadorManos.dibujarPreview` compusiera
  en un `p5.Graphics` 2D — `drawingContext` en WEBGL no es un contexto 2D y no
  tiene `drawImage`.
- **`noTint()` es veneno en WEBGL con p5 1.9.4**: deja `_tint` en `null` y el
  `_setFillUniforms` del `RendererGL` llama `setUniform("uTint", null)`, que
  revienta con `Cannot read properties of null (reading 'slice')` y mata el
  `draw()`. Para un tinte neutro va `tint(255)`.
- Los nodos viven en `Float32Array` preasignados y se reescriben en el sitio:
  la geometría se recalcula entera cada frame (~2000 vértices) y reasignar esos
  arrays sería basura constante para el GC.

### Marea de Manos — fluido en shader con ping-pong de framebuffers

Primer algoritmo de la galería que **corre entero en la GPU y mantiene estado
entre frames**: no dibuja figuras, reescribe un campo. Portado del *field sim*
de Wyatt Flanders ("Me And My Neighborhood",
`wyattflanders.com/MeAndMyNeighborhood.pdf`), un autómata celular continuo
sobre una textura RGBA donde cada canal es una magnitud física:

```
xy = velocidad (energía ordenada)   b = presión (energía desordenada)   w = masa
```

**Las reglas, una por renglón** (`Me` en píxeles del campo, vecinos a ±1 px):

```
campo(pos) = LOOKUP(pos − LOOKUP(pos).xy)        // 1. advección con la velocidad
E.b  = (pX.b + pY.b + nX.b + nY.b)/4             // 2. la presión difunde entera
E.xy += vec2(nX.b − pX.b, nY.b − pY.b)/4         // 3. gradiente de presión = fuerza
E.b  += (nX.x − pX.x + nY.y − pY.y)/4            // 4. divergencia de v → presión
E.y  -= E.w · gravedad                           //    gravedad por unidad de masa
E.w  += (nX.x·nX.w − pX.x·pX.w + nY.y·nY.w − pY.y·pY.w)/4   // 5. masa conservada
```

más una pared de 10 px en los bordes que anula la velocidad. La regla 1 es una
**advección semi-lagrangiana de un paso**: se estima la velocidad en el punto y
se lee el campo "de dónde vino" (`posición − velocidad`), lo que exige muestreo
con **filtro lineal** porque la coordenada resultante es fraccionaria.

**Ping-pong.** Cada píxel necesita el frame anterior del campo (el suyo y el de
sus cuatro vecinos), y la GPU prohíbe leer y escribir la misma textura en una
pasada. La pieza mantiene **dos `p.createFramebuffer()`**: dibuja en B leyendo
A, los intercambia, y al frame siguiente al revés. Detalles que hacen o rompen
esto en p5 1.9.4:

- **Formato del campo.** Un target de 8 bits sin signo (el default) mata la
  simulación: las velocidades son negativas y del orden de centésimas de píxel.
  Se pide `float` solo si el equipo soporta `EXT_color_buffer_float` +
  `EXT_float_blend` (p5 deja `GL_BLEND` prendido incluso en modo `REPLACE`, y
  mezclar sobre un target de 32 bits lo exige) + `OES_texture_float_linear` (la
  advección necesita filtro lineal); si no, cae a `half-float`, que en WebGL2 ya
  es filtrable de fábrica. p5 degrada el formato **en silencio** (solo un
  `console.warn`), así que la pieza compara `fb.format` con lo pedido y lo avisa
  en el HUD.
- **`blendMode(REPLACE)` obligatorio** durante la pasada de simulación: con la
  mezcla normal, el canal `w` (masa) haría de alfa y el resultado se fundiría
  con el contenido viejo del target, corrompiendo el campo. Se restaura `BLEND`
  para el display y el preview de cámara.
- **`antialias: false` y `density: 1`** en los framebuffers: un target
  multimuestreado no sirve como textura de datos, y el campo tiene su propia
  resolución (mitad del lienzo), ajena al `pixelDensity` del retina.
- **Siembra en las dos texturas.** El estado inicial (mar lleno hasta
  `nivelMar`) es un valor absoluto, no un incremento: hay que escribirlo en los
  dos targets, porque el frame siguiente lee el que quedó de origen.

**Orientación de coordenadas** — la parte que más se rompe al portar Shadertoy
a p5 WEBGL. Las dos pasadas usan el mismo vertex shader de cuad de pantalla
completa, que **ignora cámara y proyección** y manda `aTexCoord` directo a clip
space (`uv·2 − 1`, el mismo truco que el fondo de `florShader.ts`). Así la
coordenada de escritura y la de lectura de la textura son la misma `uv`, y la
cadena entera queda auto-consistente sin razonar sobre la cámara de p5. El
costado: `uv.y = 0` es el **fondo** de la pantalla, igual que en Shadertoy — la
gravedad `−y` cae hacia abajo sola, y las posiciones que llegan en coordenadas
de imagen (mano de MediaPipe y `mouseY`, con `y` hacia abajo) se invierten con
`1 − y`.

**Display pass.** El original es `color = densidad.wwww` (una nube gris). Acá:
la masa interpola abismo → verde-agua → cresta; el **gradiente de la masa** hace
de normal (`normalize(vec3(−∂w/∂x, −∂w/∂y, 0.35))`) para un difuso que ilumina
la pendiente de la ola; la **magnitud de la velocidad** enciende la espuma
(`smoothstep(vel) · smoothstep(masa)`), y el naranja aparece solo como
`pow(luz, 8) · espuma`, es decir en las crestas rápidas y bien orientadas —
acento puntual, no baño.

**Interacción.** El `iMouse` del original se reemplaza por la mano
(`RastreadorManos`, ver la familia de MediaPipe): la palma es un pincel que
deposita masa, y el flanco del puño dispara un **impulso radial** que se suma a
`E.xy` con perfil gaussiano `exp(−d²/2σ²)` y signo: `−1` al cerrar (implosión,
el agua se succiona hacia la mano), `+1` al abrir (onda expansiva). El impulso
no es un estado sino un golpe: decae por un factor por frame hasta apagarse. Sin
cámara, el dedo sobre el lienzo hace de pincel y dos botones disparan los mismos
impulsos.

**Añadidos al original**, todos por estabilidad: amortiguación de la velocidad
(la perilla Espesor) y topes de velocidad, presión y masa. El esquema es
explícito y sin ellos acumula energía con cada impulso fuerte hasta reventar en
ruido.

No comparte biblioteca con la **Flor de Shader**: aquella usa GLSL para *teñir*
geometría que la CPU genera cada frame, ésta usa GLSL como *motor de estado* y
la geometría es un cuad fijo. Comparten el medio (shaders en WEBGL) pero ni la
estructura ni el propósito visual — 1 de 3 en "Cómo decidir", así que va en
sección propia.

### Máscara en el Túnel — plasma acumulativo + raymarch, cosidos por una cámara compartida

Primera pieza de la galería que junta **dos shaders de Shadertoy distintos** en
una escena y **mezcla malla 3D real con un raymarch de pantalla completa**. Los
dos algoritmos se documentan por separado, porque son independientes; lo que
sigue después es lo que costó unirlos, que es la parte que no está en ningún
Shadertoy.

**Shader 1 — plasma acumulativo (textura de la máscara).** Sin autor ni URL: el
GLSL llegó al buzón sin acreditación, así que queda pendiente de que se aporte.
Dieciocho vueltas de un bucle sobre un plano `u` centrado y normalizado por la
altura:

```
v  = cos(t·(3,2) + (0,11)) − 6u                    // centro móvil, por iteración
u *= rot(i − 0.1t)                                 // rotación acumulativa
u += cos(4 / exp(|o|²/100) + t) / 5                // realimentación: lo ya acumulado desplaza el plano
q  = sin( u/(2 − u·u) − 9·u.yx + t )               // inversión + swizzle: filamentos
q *= 1 + i·(v·v)                                   // el anillo se aprieta con la iteración
o += (cos(pesos + t) + 1) / |q|                    // paleta coseno, acumulada
o *= 0.15;   o -= (u·u)/30                         // ganancia + viñeta
```

Tres cosas explican cómo se ve: la **realimentación** (`exp(|o|²)` en el
desplazamiento) hace que las zonas ya brillantes se desplacen distinto de las
oscuras, lo que crea los filamentos; la **inversión** `u/(2 − u·u)` concentra
detalle cerca del origen; y la **viñeta** final garantiza que lo brillante y
detallado quede en el centro del encuadre. Los colores salen de la paleta coseno
`cos(vec4(1,8,4,0) + t)`, que es lo que le da su carácter cromático — se
conserva del original (pesos y tinte base viajan como uniforms desde `PALETA` y
`CONFIG`, sin literales dentro del GLSL, pero no se sustituyen por el duotono de
la galería).

En la pieza `iTime` **no es el reloj**: como `t` se incrementa *dentro* del
bucle, el uniform funciona como **semilla** — valores distintos dan texturas
distintas, no una animación continua. Va congelado y la textura se hornea a un
framebuffer de 512² **solo cuando la fase cambia** (perilla u ojo izquierdo) o
cuando la nariz se corre más de 0.008 en UV. El encuadre se centra en `uCentro`
en vez de en el medio de la imagen: pasarle la UV de la nariz es lo que clava la
zona brillante **sobre la nariz**.

**Shader 2 — túnel raymarcheado (fondo).** Trae anotada la referencia
`https://www.shadertoy.com/view/mlXyDn`, pero por el texto que la rodea no es
seguro que sea la URL del propio shader en vez de una referencia a otro: queda
registrada como *referencia anotada en el original*, no como fuente confirmada.
El eje del tubo es una curva de Lissajous en `z`:

```
camino(z)  = ( 2·sin(0.2z),  cos(0.3z) )
camino2(z) = ( sin(0.24z),  2·cos(0.04z) )        // tubo ramal
textura(p) = −Σ_{a=.5,1,2,…,32} |Σ sin(8a·p)| / a  // grano fractal de la pared
map(p)     = min( 1.05 − min(d2, min(d1, 1)) + 0.04·textura(p),  bl2 )
```

`d1`/`d2` son la distancia al eje de cada tubo: como el campo es `1.05 − d`, el
signo está invertido respecto de una esfera y lo que se marchea es el **interior**
del tubo. `min(d1, 1)` aplana el campo lejos del eje, que es lo que evita que el
rayo se pase de largo en las curvas. El color de la pared (`cor`) sale como
efecto lateral de `map()`: un `smoothstep` sobre `d1` que mezcla pared clara y
fondo oscuro. El brillo final es `3.5/i` con `i` el número de pasos: menos pasos
= superficie cercana = más brillo, un *ambient occlusion* de pobre que sale
gratis.

**Lo que exigió el port a p5 WEBGL (GLSL ES 1.00):**

- **No hay `tanh`** en ES 1.00. La única llamada estaba en `bl1`, la esfera que
  rebotaba — y `bl1` se elimina de todos modos.
- **No hay `mat2x3`.** La construcción del rayo se escribe a mano:
  `D += rt·sx + cross(D,rt)·sy`, que es exactamente lo mismo.
- **Bucles de tope constante**: los `while` abiertos pasan a `for` con `break`
  (120 pasos de marcha, 7 octavas de grano, 18 vueltas de plasma).
- `p/p` de `textura()` pasa a `vec3(1.0)`: idéntico salvo por los NaN que el
  original produce si alguna componente vale exactamente 0.
- `mat2(vec4)` del `#define rot` se expande a cuatro escalares: es terreno
  resbaladizo según el compilador de ES 1.00 y el resultado es el mismo.
- **Orientación**: cuad de pantalla completa cuyo vertex shader ignora cámara y
  proyección (mismo truco que `mareaManos.ts`), así `uv.y = 0` es abajo y
  `(uv − .5)·(aspect, 1)` **es** el `(fragCoord − R/2)/R.y` de Shadertoy, sin
  ninguna inversión extra.
- `pixelDensity(1)`: el raymarch cuesta por píxel y dejar que p5 duplique la
  densidad en retina cuadruplica el trabajo sin ganancia visible.

**Cosido 1: la máscara ocupa el lugar de `bl1`.** El original tenía dos esferas
brillantes recorriendo los tubos. `bl1` se **borra del SDF** y su lugar lo toma
la malla de la cara — pero su aporte de luz no se pierde: el término
`o += .8·exp(−bl1)` se recalcula desde la **posición real de la máscara**, que
llega como uniform `uMascara`. Ese detalle es lo que hace que la máscara
*pertenezca* a la escena en vez de estar pegada encima: ilumina la pared del tubo
a su paso, y el empujón del ojo derecho se ve tanto en la máscara como en el
reflejo del tubo. `bl2` (la brasa del tubo ramal) **se conserva**: corre por
`camino2`, que a esas profundidades queda a ~3 unidades del tubo principal, así
que no compite visualmente con la máscara y aporta profundidad y el acento
naranja. Tiene interruptor propio por si en alguna corrida molesta.

**Cosido 2: la cámara de p5 replica la del shader.** Es la parte que hay que
hacer bien o la máscara se sale del tubo en las curvas (y estar centrada en
pantalla **no** es prueba de nada — el criterio es que se mantenga dentro del
tubo mientras el túnel serpentea). El shader define:

```
ojo    = (camino(t − .1), t − .1)
mira   = (camino(t), t)
D      = normalize(mira − ojo)
rt     = (D.z, 0, −D.x)          up = cross(D, rt)
rayo   = D + rt·sx + up·sy       con sx,sy = (fragCoord − R/2)/R.y
```

Eso es un **pinhole de distancia focal 1 medido sobre media altura de pantalla**,
o sea **FOV vertical = 2·atan(0.5) ≈ 53°**. En p5:
`perspective(2·atan(0.5), w/h, …)` + `camera(ojo, mira, −up)`. El `up` va
**negado** porque `Camera.perspective` de p5 arma la proyección con `−f·yScale`
—invierte la Y de pantalla, que es la razón de que en WEBGL la `y` positiva vaya
hacia abajo—; sin ese signo la máscara aparecería boca abajo respecto del túnel.
Con eso, trasladar la malla a `(camino(z), z)` basta para que caiga exactamente
donde iba la esfera, y se conserva la rotación 3D de la cabeza (que se perdería
si se proyectara a mano en espacio de pantalla).

**Cosido 3: profundidad entre capas.** El cuad del túnel se dibuja con
`DEPTH_TEST` desactivado (con el test apagado tampoco escribe profundidad), se
vuelve a activar y se limpia el buffer; la malla se dibuja encima con su z real.
Antes del preview de cámara se limpia otra vez y se restauran `perspective()` y
`camera()` por defecto: `p.image()` en WEBGL usa la cámara vigente, y la del
túnel lo mandaría a otro sitio con valores de z de otra proyección. Mismo
esquema de "algoritmo del pintor por capa" que usa `florShader.ts`.

**Recorrido de la máscara.** Un offset **relativo a la cámara** (que va en
`z = t − .1`), de `zLejos` (media profundidad del túnel visible) a `zCerca`
(justo delante), en loop:

```
z = (t − .1) + lerp(zLejos, zCerca, faseLoop)     xy = camino(z)
```

El `xy` **tiene** que seguir `camino(z)` —la misma función replicada en
TypeScript, alimentada por los mismos cuatro números que el shader recibe como
uniform— o la máscara se sale del tubo en cuanto el túnel gira.

**Interacción por ojos.** Detección **por ojo separado**, con la misma disciplina
de flancos que `detectarParpadeo` (dos umbrales con histéresis + refractario de
420 ms, para que un ojo entrecerrado no dispare un evento por frame):

- **ojo izquierdo cerrado (flanco)** → salta la fase congelada del plasma: la
  máscara cambia de textura y de colores. Sostenido, la fase deriva despacio
  (1.6/s) para buscar un fotograma en vez de saltar a ciegas.
- **ojo derecho cerrado (flanco)** → empujón: adelanta la fase del loop de
  profundidad y sube el destello que la máscara arroja sobre el tubo (un golpe
  que decae solo, como el impulso de `mareaManos`).

Nomenclatura: `eyeBlinkLeft` es el ojo **izquierdo del sujeto**, y como el
preview está espejado ese ojo aparece a la derecha de la imagen. La metadata lo
describe desde el punto de vista del usuario ("cerrar el ojo izquierdo"), que es
lo que importa. "Ambos ojos" **no** se usa para nada: se solaparía con los dos
flancos individuales; guardar va por tecla `s` y su botón.

Un detalle de acoplamiento que muerde: la deriva lenta del ojo sostenido es más
chica que el paso del `Knob` de fase, así que reflejarla en la perilla con
`Knob.value()` —que cuantiza y **dispara su propio `onChange`**— anulaba el
avance y la fase no se movía nunca. Hay una guarda de reentrada para eso.

Sin cámara la pieza sigue viva: el túnel vuela igual y la máscara se sustituye
por un plano con la misma textura recorriendo el mismo loop de profundidad, con
el HUD explicando por qué. Todas las perillas y botones (incluidos los
equivalentes táctiles de los dos ojos) siguen funcionando.

No se unifica con **Marea de Manos** ni con **Flor de Shader** pese a compartir
el medio: aquella usa GLSL como *motor de estado* con ping-pong de framebuffers,
la Flor lo usa para *teñir* geometría generada en CPU, y ésta combina *raymarch
de pantalla completa* con una malla capturada del mundo real. Comparten
herramientas, no algoritmo — 1 de 3 en "Cómo decidir", así que va en sección
propia.

---

### Fractal de Julia — Julia audio-reactivo con audio→intensidad y mano→forma/paleta

Port de un shader de Shadertoy (`https://www.shadertoy.com/view/llB3W1`,
creado por **relampago2048**, 2015-04-08). Es el
primer sketch de la galería que abre **cámara (MediaPipe/video) y micrófono
(p5.sound/audio) a la vez**: dos `getUserMedia` independientes, ambos con gesto
del usuario para arrancar.

**El algoritmo del fractal.** No es un Mandelbrot (aunque el pedido coloquial lo
llame así), sino un **conjunto de Julia** de iteración cúbica. Para cada píxel,
partiendo de `p` = posición en el plano y una `seed` fija por capa:

```
z = (z.x² − z.y², 2·z.x·z.y)                       // z² (paso cuadrático)
z = (z·r − …, r·z + …) + seed   con r = z anterior  // z²·z_prev + seed
escapa cuando |z| > 2, devolviendo la iteración i
```

La `seed` sale de `SEED_BASE + (−1+2·punto)·0.4`, con `SEED_BASE =
(0.098386255, 0.6387662)` (constante del original). El **color** de cada píxel
es una función coseno de la iteración de escape, `sin(f·2, f·3, |f·7|)` con
`f = (i/iters·2)²·2`: la banda de escape da los tonos vivos.

**Triple sampleo.** La imagen es la suma de tres capas del mismo fractal con
distinto encuadre: `position` (base), `position/1.6` (acercada) y `pos2` = el
plano invertido (`1 − uv`). Se combinan con un anillo radial coloreado por el
audio (`t3`): `salida = c/t3 + c·t3 + invFract·0.6 + fract4·0.3`. La división por
`t3` es la que provoca el bloom/glitch brillante donde el audio marca.

**Cómo entra el audio (textura `iChannel0`).** El shader lee la textura de audio
en `y = 0.25` (`muestrearMusica`, banda de frecuencia) y `y = 0.1` (el anillo
`t3`), **ambos en la mitad inferior** (`y < 0.5`). Shadertoy sirve esa textura
como 2 filas (espectro abajo, forma de onda arriba); acá se construye desde la
FFT de p5.sound como una imagen de **una sola fila = el espectro** (512 bins,
potencia de dos). Una fila basta porque el shader nunca lee la mitad superior, y
**elimina la ambigüedad de si p5 voltea la Y** al subir la imagen como textura
(con 2 filas habría que saberlo). La textura va con filtro lineal (default de p5
para imágenes) y `textureWrap(REPEAT)`, porque el anillo `t3` muestrea en
`u = length(position)/2`, que puede pasar de 1 y debe envolver como en el
original.

**El mapeo de control reasignado** (lo que separa esta pieza del shader
original):

- **Micrófono → intensidad, no forma.** En el original `pulse = 0.5 +
  sampleMusicA()·1.8` entraba en `point.y` (la forma). Acá `pulse` se re-enfoca
  como **brillo global** (`salida·pulse`) más un **glow naranja en los picos**
  (`+ uBrillo·musica·uSensibilidad·uGlow`). `muestrearMusica` y `t3` siguen
  leyendo la textura igual, así el carácter audio-reactivo se conserva. La
  perilla "Sensibilidad" escala la respuesta; "Intensidad" fija el brillo base
  (manda sin micrófono, cuando la textura es plana en cero).
- **Mano X → paleta.** El color base se **rota de tono** en RGB con la matriz de
  Rodrigues sobre el eje de grises `(1,1,1)/√3`, ángulo `uPaleta·2π`: la mano de
  lado a lado recorre el círculo cromático completo. Los coeficientes del
  generador coseno (`uFreq`, `uFase`), el sesgo del anillo de audio
  (`uSesgoAudio`, que reemplaza el `vec3(0.5,0.1,0.5)` literal) y el tinte global
  viajan como uniforms desde `CONFIG`/`PALETA`: **ningún color literal dentro del
  GLSL**. El tinte es casi neutro a propósito, para no aplanar los tonos vivos al
  duotono verde de la galería — aquí la paleta es el punto de interacción.
- **Mano Y → forma.** `uForma` (0–1) barre `puntoBase` por el espacio de
  semillas: `x = 0.5 + 0.35·sin(uForma·π + t·0.1)`, `y = uForma + 0.03·sin(t·0.2)`.
  Las tres capas usan variantes (offsets `+(0.05,0.02)`, `+(0.10,−0.05)`) del
  mismo `puntoBase`, como el original desfasaba `0.5/0.55/0.6` en X. El `iTime`
  sobrevive solo como el término `t·0.1`/`t·0.2` (movimiento sutil de base,
  `CONFIG.velTiempo`), no como el motor de la forma.
- El `iMouse` del original estaba **muerto** (se computaba sin usarse); no se
  revive. El mouse arrastrado sobre el lienzo es el fallback de la mano
  (X→paleta, Y→forma), y las perillas "Paleta"/"Forma" el respaldo manual.

**Port a p5 WEBGL.** Cuad de pantalla completa con el vertex shader neutro de
`mareaManos.ts`/`mascaraTunel.ts` (ignora cámara y proyección, `uv.y = 0` abajo
→ `vUv` coincide con el `fragCoord/iResolution` de Shadertoy). Un solo pase por
frame, **sin ping-pong** (el shader no se lee a sí mismo). `mainImage → main`,
`texture → texture2D`. GLSL ES 1.00 exige tope constante de iteraciones, así que
la calidad ajustable (perilla, 30–150) se hace con un `break` cuando
`i >= uIters` dentro de un bucle de tope `ITERS_MAX` constante. **Rendimiento:**
el fractal se samplea 3× por píxel con hasta 150 iteraciones cada uno — es la
parte cara y la que la perilla "Calidad" alivia.

La textura de audio se construye inline (no se extrajo a `lib/bibliotecas/`):
está acoplada a lo que este shader espera de `iChannel0` y no hay otra pieza que
la comparta todavía.

### Caverna a Impulsos — río subterráneo raymarcheado, avance por impulso con inercia acumulable

Port de un shader de Shadertoy **de una sola pasada de pantalla completa** (como
`fractal-julia`: no se lee a sí mismo, así que **sin ping-pong** ni
framebuffers de estado). **Sin autor indicado.** El GLSL traía cuatro enlaces
anotados a modo de referencia/inspiración: `playlist/cXBGzV`, "Rio Subterraneo"
`https://www.shadertoy.com/view/4cyyRc`, "glass volumetric dda test"
`https://www.shadertoy.com/view/4fGyWG` y `playlist/m3BSDD`. Por el tema
(caverna con río) **"Rio Subterraneo" (`4cyyRc`) es la fuente más probable, pero
NO está confirmada**; los otros parecen inspiración. Quedan como *referencias
anotadas en el original*; falta acreditar al autor.

**El raymarch.** `map()` es el SDF de la escena:

```
sf     = grano fractal de la pared (trap(p·.384 + trap(p.yzx·.192)))
tunel  = 1.5 − |p.xy·(.5,.7071)|·openCave(t) + sf     // tubo, eje en path(z)
agua   = p.y + waterSurf(p)                            // superficie ondulante
map    = min(tunel, agua)                              // svObjID = step(tunel, agua)
```

- `path(z) = (2.4·sin(.15z), 1.7·cos(.25z))` es el eje serpenteante del tubo;
  `openCave` (una `tanh` de `cos(.05z)`) hace **respirar** el radio.
- El agua se marchea **dos veces**: la primera choca con su superficie; luego se
  refracta el rayo (`refract`, IOR 1/1.33) y se **vuelve a marchar** (con la
  bandera global `G` que hace a `map` devolver solo el túnel) para ver el fondo a
  través del agua. `svObjID` distingue roca (verde) de agua (cian) en `doColor`;
  el especular es el naranja de acento. Normales por diferencias finitas, AO de 4
  muestras y `bumpMap` de ruido sobre la roca: por eso es **caro**.

**La esfera, quitada del SDF pero conservada como luz.** El original fundía una
bola con el túnel (`min(tunel, ball)`) que era a la vez geometría visible y la
luz de la escena (su posición `lp`). Aquí se elimina el `min(tunel, ball)` —la
bola deja de renderizarse y de ocluir— pero `lp` se sigue calculando con
`ballMovez`/`ballMoveXY` (dos `tanh` más) y viaja a `doColor()` como la posición
de la luz. La cueva queda iluminada por un foco que se mueve por dentro donde iba
la bola. Es exactamente el patrón de `bl1` en `mascaraTunel`.

**Avance por impulso con inercia acumulable — lo propio de la pieza.** En el
original la cámara avanzaba sola con `iTime` (`ro.z = iTime`). Aquí `iTime` se
parte en dos uniforms:

- `uAvance` mueve la cámara (`ro.z`) y **solo crece con los impulsos**;
- `uTiempo = uAvance + derivaAmbiente·relojReal` es el reloj **ambiental** (agua
  fluyendo `waterSurf`, luz meciéndose `ballMovez`, cueva respirando `openCave`,
  textura `bumpFunc`). En reposo el mundo queda casi quieto salvo la deriva
  mínima; el **desplazamiento hacia adelante nunca viene del reloj**.

La física es un modelo de impulso/momento en TypeScript:

```
cada frame:   avance += velocidad ;  velocidad *= friccion   // friccion < 1
un impulso:   velocidad = min(velocidad + IMPULSO, VEL_MAX)
```

Un impulso hace planear ~`IMPULSO·friccion/(1−friccion)` unidades y detenerse
tras unos pasos; **repetir impulsos acumula velocidad** hasta `VEL_MAX`, así se
va más rápido si se insiste. Valores por defecto: `IMPULSO 0.35`, `friccion 0.90`
(un tap → planear ~3 u en ~0.7 s), `VEL_MAX 1.0`; todos con Knob. Un **medidor**
en el HUD muestra `velocidad/VEL_MAX` para que el empujón y la inercia se vean.

**Gesto de acercar la mano** (con `RastreadorManos`, sin modificarla): la
biblioteca **no expone distancia a la cámara**, así que el proxy de profundidad
se deriva dentro del sketch como el **tamaño aparente** de la mano —distancia
muñeca→nudillo medio, `dist(puntos[0], puntos[9])`, igual que `mareaManos`—: mano
más grande = más cerca. El empujón es un **flanco de acercamiento** detectado con
la misma disciplina que `detectarParpadeo`: histéresis (umbral cerca 0.17, umbral
lejos 0.10 → hay que **alejar** la mano para armar el siguiente) + refractario
(500 ms) sobre el tamaño **suavizado** con lerp (α 0.4), o el jitter del landmark
dispararía ráfagas. Cada empujón detectado inyecta el **mismo** impulso que el
botón, y el marco del preview parpadea naranja como feedback. Sin cámara la pieza
es plenamente jugable: el botón "Adelante", el toque en el lienzo, la barra
espaciadora y las perillas cubren todo.

**Port a GLSL ES 1.00.** El shader usa `tanh` (en `openCave`, `ballMovez`,
`ballMoveXY`), que **no existe** en WebGL1: va polyfilleada con `tanh_(x) =
(e^{2x}−1)/(e^{2x}+1)` con el argumento acotado a ±10 (satura a ±1 mucho antes,
así que es exacto y `exp` no desborda). El `while(i++ < 96.)` de las dos marchas
pasa a `for` con tope constante `MAX_PASOS` y `break` por `uPasos` (Knob
"Calidad", 24–96); todas las variables locales se inicializan; `iResolution →
uResolucion`. Orientación resuelta con `fragCoord = vUv·uResolucion` (vUv.y = 0
abajo, coincide con Shadertoy sin flip). **Rendimiento:** es la pieza más pesada
de la galería — dos marchas de hasta 96 pasos por píxel más AO y normales por
diferencias finitas; `pixelDensity(1)` y la perilla "Calidad" son las palancas.

### Filtros de Cámara — banco de post-procesos de Shadertoy sobre una cámara compartida

Cuatro shaders llegaron **juntos** al buzón `_entryShaderToy.glsl`, y los cuatro
comparten la misma convención: son *image passes* que reciben la webcam por
`iChannel0` y la reescriben píxel a píxel. En vez de una pieza por shader, se
generaliza esa convención en **un pipeline con un registro de filtros**
(`FILTROS`): una sola cámara, un solo cuad de pantalla completa, y cada entrada
aporta solo su `main()`. Agregar un filtro = agregar una entrada (instrucciones
en el bloque sobre `FILTROS` dentro de la pieza), sin tocar el pipeline.

**Cámara compartida.** El `<video>` (biblioteca `camara.ts`) se vuelca a un
`p5.Graphics` 2D —espejado y recortado a *cover* una sola vez— que viaja al
shader como `uCamara`; el cuadro anterior se copia a `uPrev` **antes** de
redibujar, para los filtros temporales. Clave de p5 1.9.4: una fuente
`p5.Graphics` cae en la rama `else` de `Texture.update()` y **se re-sube como
textura cada frame** (a diferencia de `p5.Image`, que solo se sube si está
`modified`), así que no hace falta framebuffer ni `loadPixels`. Ambos graphics
van a `pixelDensity(1)` para que `drawImage` trabaje en px lógicos sin el factor
retina y las dos texturas queden alineadas.

**Orientación.** Cuad con el vertex shader de siempre (`aTexCoord·2 − 1`,
`vUv.y = 0` abajo, como en `mareaManos`/`cavernaImpulso`). La textura de cámara
de p5 tiene el eje Y al revés que ese `vUv`, así que **todo** el muestreo pasa
por los macros `CAM()`/`PREV()` del PRELUDIO (nunca `texture2D(uCamara,…)`
directo): son el único lugar donde se decide la orientación y el mirror. Los dos
controles continuos de cada filtro entran normalizados por `uParam`/`uParam2`
(0..1, el shader los reescala), y el HUD dice qué hace cada uno en el filtro
activo.

**Los cuatro filtros** (todos recolorean por uniforms — ningún hex dentro del
GLSL — salvo los que sintetizan color):

- **Basura 2600** (`tcccWj`, matrixmane) — teja la imagen y la cuantiza a una
  paleta de 8 colores estilo Atari con bloques de glitch y jitter por scanline.
  Fiel al original; la paleta de 8 se indexa con **cadena de `if`** (GLSL ES 1.00
  no garantiza indexar arrays de uniforms con índice variable) y viaja desde
  `PALETA.atari`.
- **Rejilla de Onda** (`fcXSDS`, yonibr) — caleidoscopio fractal (`tex`,
  `foldRotate`, incrusta *TheGrid* de dila `llcXWr`) enmascarado por el
  **contorno** de la cámara (detección de bordes por luminancia). El original
  animaba la rejilla con el espectro de una canción vía **buffers de audio** con
  realimentación; como este filtro no tiene canal de audio en la galería, la fase
  la mueve `uTiempo` y la cámara aporta el contorno (su rol de "procesar
  píxeles"). Se pierde el ping-pong de buffers de audio. `round()` → `floor(x+.5)`.
- **Espejo Complejo** (`scsGDH`, Refurio) — deforma la cámara elevando la
  coordenada al cuadrado como número complejo (`z·z`), con caída a la imagen sin
  deformar fuera de `[0,1)`. El original era un **buffer con realimentación** que
  acumulaba brillo (su "dampening" por `iMouse.y`); acá es un solo pase sin
  acumulación, con el brillo en perilla.
- **Flujo Óptico** (Lucas–Kanade, gist 983) — estima el movimiento entre
  `uCamara` y `uPrev` resolviendo el sistema del **tensor de estructura** por
  ventana, rechaza features pobres por sus **valores propios** y pinta el flujo
  en HSV (tono = dirección, valor = magnitud). El original lo repartía en **tres
  buffers** (derivadas espaciales/temporales → tensor + Lucas-Kanade →
  visualización) por costo y precisión; acá va **condensado en un pase** que usa
  `uPrev` como la derivada temporal. `inverse()` de la `mat2` se resuelve por
  Cramer (no existe en ES 1.00). **Rendimiento:** es el más caro (ventana de
  `(2·3+1)² = 49` muestras × 4 fetches por píxel); `pixelDensity(1)` es la
  palanca, y el Ajuste 2 separa las muestras sin subir su número.

**Sin cámara** la pieza no queda negra: un **patrón de prueba** animado (franjas
que se desplazan + un disco que rebota, en la paleta de la galería) da bordes y
movimiento reales para que los cuatro filtros muestren algo vivo sin permiso.
Selección de filtro por teclado (`1`–`4`, `←/→`, `n`), por el botón "Filtro ▸" o
**tocando el lienzo** (`mousePressed` → siguiente).

## Átomos de Píxel (aparte)

Algoritmo de descomposición de imagen en partículas, portado de un sketch de
**Processing** (`pixelAtomProject/pixelAtomProject.pde`, con su propio
`CLAUDE.md` en el monorepo). Captura una imagen (webcam o archivo), la
descompone en partículas que conservan el color/posición del píxel original,
y las anima con 15 modos (steering behaviors, composiciones generativas,
colonización de espacios) sobre 7 tipos de flow field. No comparte estructura
ni propósito visual con ninguna otra pieza de la galería — se documenta aquí
en solitario, sin forzar una familia ni referencias cruzadas, tal como pide
la convención de este documento.

---

## Registro histórico

Acumulativo: cada pieza creada o unificada agrega una línea al final. No se
reescriben ni se borran entradas anteriores.

| Fecha | Slug | Cambio |
|-------|------|--------|
| 2026-07-22 | — | Plantilla `lib/sketches/_plantilla.ts`, biblioteca `boton.ts` (botón/interruptor táctil) y agente `sketch-creator` para piezas nuevas. Inicio del registro. |
| 2026-07-22 | `flor-manos` | Pieza nueva: flor generativa sobre la familia de espirales polares (`Spiral`), con los parámetros dictados por gestos de mano. Biblioteca nueva `manosMediaPipe.ts` (MediaPipe Hand Landmarker → gestos normalizados) y dependencia `@mediapipe/tasks-vision`. |
| 2026-07-22 | `flor-shader`, `flor-manos` | Arreglo del preview de cámara: `noTint()` rompía el `draw()` en WEBGL (p5 1.9.4 pasa `uTint: null` al shader) → `tint(255)`. El texto de estado pasa a `PanelEstado` (nuevo en `boton.ts`), que evita tanto la falta de fuente en WEBGL como la sobreimpresión del texto en las piezas de fondo translúcido. |
| 2026-07-22 | `flor-shader` | Pieza nueva: malla polar de pétalos (nodos generativos + `TRIANGLE_STRIP` con UVs) llena con un shader GLSL propio de textura procedural (fbm con dominio deformado, paleta coseno, especular que sigue la mano), gobernada por los mismos gestos que `flor-manos`. `dibujarPreview` de `manosMediaPipe.ts` pasa a componer en un `p5.Graphics` 2D para funcionar también en WEBGL. |
| 2026-07-22 | `flor-shader` | Rediseño a tres cuerpos: la corona pasa a forma de **dona** (hueco central), se agrega un **núcleo esférico** (textura celular, tono desfasado) en el hueco y un **tallo** de cilindros verdes hacia el suelo, cada uno con su fragment shader (ruido fbm compartido, sombreado por `uNormalMatrix` en los sólidos). El **tono cicla en loop infinito**; las perillas Tamaño/Brillo/Tono se reemplazan por Núcleo y Tallo, gestos de separación y altura de mano remapeados. |
| 2026-07-22 | `flor-shader` | Ajuste de composición: núcleo más chico respecto a los pétalos y **apilado por capas** (tallo → núcleo → pétalos, de lejana a cercana) con `gl.clear(DEPTH_BUFFER_BIT)` entre capas, para que los pétalos queden siempre encima. |
| 2026-07-22 | `flor-shader` | Pétalos limitados a 3–10; textura de pétalos **sin verde** (paleta propia + tope duro del canal G); **fondo de oleaje** procedural (cuarto shader, cuad de pantalla completa); y **guardar al cerrar los ojos** vía Face Landmarker (nueva capacidad `onParpadeo` en `manosMediaPipe.ts`). |
| 2026-07-22 | `flor-shader` | Fix del guardado por parpadeo: `onParpadeo` corre dentro de `actualizar()` al inicio de `draw()` (canvas recién limpiado → PNG negro). Se difiere con una bandera y `saveCanvas` se llama al **final** de `draw()`, con la flor ya dibujada. |
| 2026-07-22 | `flor-manos` | Arreglo de la conexión a la cámara: biblioteca nueva `camara.ts` (menú de dispositivos + apertura del stream), sustituye a `createCapture` + `.hide()`. La pieza gana selector de cámara y su `source` pasa a `milpa/lib/sketches/florManos.ts` para que el panel `CodeBlock` muestre su código (`sync-originals.mjs` aprende a copiar piezas del repo propio). |
| 2026-07-23 | — | Convención nueva: `lib/sketches/_entryShaderToy.glsl` como buzón de shaders de Shadertoy por portar (vacío = nada pendiente). `sketch-creator` aprende a leerlo, portarlo acreditando la fuente y vaciarlo después de usarlo. |
| 2026-07-23 | `marea-manos` | Pieza nueva: simulación de fluido en GLSL (field sim de Wyatt Flanders) portada a p5 WEBGL con **ping-pong de dos framebuffers** en formato flotante, display pass propio que la pinta como mar (densidad → color, gradiente → luz, velocidad → espuma, naranja solo en las crestas) y la mano de MediaPipe en lugar del mouse: la palma vierte agua y el flanco del puño dispara impulsos radiales de implosión/explosión (histéresis + refractario). Primer algoritmo de la galería con estado persistente en la GPU. |
| 2026-07-23 | `mascara-tunel` | Pieza nueva: **dos** shaders de Shadertoy cosidos en una escena — plasma acumulativo congelado (textura, centrada en la nariz) sobre una malla de 854 triángulos con la cara del visitante, viajando por un túnel raymarcheado que reemplaza su esfera `bl1` por la máscara y le hereda el resplandor. La cámara de p5 replica la del shader (FOV = 2·atan(0.5), `up` negado por la Y invertida de p5). Biblioteca nueva `caraMediaPipe.ts` (`RastreadorCara`: landmarks, triangulación derivada de los 3-ciclos del grafo de teselación, blendshapes por ojo separado). Interacción por ojos: izquierdo cambia la textura, derecho empuja la máscara hacia la cámara. |
| 2026-07-23 | `fractal-julia` | Pieza nueva: conjunto de Julia audio-reactivo portado de Shadertoy (`llB3W1`, autor no indicado) a p5 WEBGL, con el triple sampleo del original. **Primera pieza con cámara y micrófono a la vez**: p5.sound FFT → textura de audio de 1 fila (espectro) para `iChannel0`, re-enfocada de *forma* a **intensidad/brillo global**; mano X → rotación de tono de la paleta (matriz de Rodrigues), mano Y → semilla del fractal. Reusa `RastreadorManos` y `camara.ts`; calcula la calidad con `break` por `uIters` (GLSL ES 1.00). Fallback a mouse (X paleta, Y forma) y perillas. |
| 2026-07-23 | `caverna-impulso` | Pieza nueva: río subterráneo raymarcheado portado de Shadertoy (una pasada, sin ping-pong; sin autor, fuente probable "Rio Subterraneo" `4cyyRc` sin confirmar). Túnel que respira + agua con **doble marcha de refracción**; la esfera se quita del SDF pero se conserva su `lp` como luz (patrón de `mascaraTunel`). **Avance por impulso con inercia acumulable**: `iTime` deja de correr solo y se parte en `uAvance` (cámara, solo crece con impulsos) y `uTiempo` (ambiente = avance + deriva mínima); cada impulso suma a la velocidad y la fricción la frena, insistir acumula. Dos fuentes idénticas: botón/toque/espacio y **acercar la mano** (tamaño aparente muñeca→nudillo como proxy de profundidad, flanco con histéresis + refractario). `tanh` polyfilleada para GLSL ES 1.00; Knob "Calidad" por `break`. Reusa `RastreadorManos` y `camara.ts`. |
| 2026-07-23 | `filtros-camara` | Pieza nueva: **banco de 4 filtros de post-proceso** de cámara portados juntos del buzón (Basura 2600 `tcccWj`/matrixmane; Rejilla de Onda `fcXSDS`/yonibr; Espejo Complejo `scsGDH`/Refurio; Flujo Óptico Lucas–Kanade gist 983). Convención común generalizada en un **registro `FILTROS`** con un solo pipeline: una cámara volcada a `p5.Graphics` (se re-sube como textura cada frame en p5 1.9.4) llega a todos como `uCamara`, con el cuadro anterior en `uPrev` para los temporales; muestreo centralizado por macros `CAM()`/`PREV()`. El flujo óptico va **condensado de 3 buffers a 1 pase** (`inverse` de mat2 por Cramer, ES 1.00); la rejilla cambia sus buffers de audio por `uTiempo` + contorno de cámara. Selector por teclado (`1`–`4`, `←/→`, `n`), botón o **toque en el lienzo**; patrón de prueba animado sin cámara. Reusa `camara.ts` (`Camara` directo, sin MediaPipe). Instrucciones para agregar filtros en la propia pieza. |
