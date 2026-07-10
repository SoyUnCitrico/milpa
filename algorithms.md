# Algoritmos generativos

Este documento cataloga los algoritmos generativos detrás de las piezas más
relevantes de la galería: qué hacen, en qué biblioteca viven (si aplica) y qué
otros sketches comparten la misma base. El objetivo es que una pieza nueva se
pueda ubicar rápido en una familia existente, o documentarse aparte si no
encaja en ninguna sin forzarlo.

Se completa de forma incremental — cada vez que un sketch se unifica (ver
`.claude/agents/sketch-unifier.md`), se agrega o actualiza su entrada aquí.

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
