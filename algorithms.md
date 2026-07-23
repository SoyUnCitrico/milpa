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

Consumido por:
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

---

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
