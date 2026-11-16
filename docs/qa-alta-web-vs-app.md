# Alta de inscripción: web vs app, lado a lado

Matriz de casos para correr el alta por los dos caminos en **cdev**, con los
mismos datos, y comparar tres cosas: lo que cada lado **pide**, las **reglas**
que aplica, y la **inscripción terminada** que queda en la base.

No es una suite automatizada: es una lista de casos para correr a mano una vez,
anotando el resultado en la columna que está vacía. Lo que mide no es si la app
funciona —eso ya lo cubren los tests— sino si **el socio obtiene lo mismo por el
teléfono que por la web**.

## Por qué estos casos y no otros

El alta de la app se escribió leyendo la web, no comparándola contra ella: hay
comentarios en el código que citan la línea exacta del PHP
(`AltaInscripcionScreen.js:69` → `expositores_inscripcion_paso4.php:133`). Eso
deja dos zonas con riesgo muy distinto.

**Las 7 lecturas del #149 pasan por el mismo núcleo que la web** (`src/api/alta.js:4`),
así que lo que ofrecen es, por construcción, lo que ofrece la web. Ahí lo único
que puede divergir es lo que la app pone encima: `mapOpciones`, `mapJinete`, el
recorte y dedup de cabañas, los candidatos de yunta, el orden de las listas. Es
verificación, no sospecha → **eje A**, muestreo.

**Las reglas no se comparten del todo.** Los códigos del 422 están partidos en
dos grupos (`docs/README.md` §Inscripciones): los del validador de la web, que
son el mismo código, y «los de lo que la web decide por la UI», que la web nunca
valida porque los vuelve imposibles armando el formulario, y que la API tuvo que
**reimplementar** como reglas explícitas. Si la reimplementación quedó más
estricta, el socio no puede por el teléfono algo que sí puede por la web; si
quedó más laxa, entra algo que la ACCC después rechaza → **eje B**, uno por uno.

Y hay una tercera asimetría, que no está en la API sino en la app: la app
**bloquea antes de mandar** (botón «Continuar» deshabilitado). Un código que la
app nunca deja llegar al servidor no es un código probado: es un código que no
se ejerce. Por eso cada fila del eje B dice si el caso se puede provocar desde
la app o si hay que llegar al endpoint directo.

## Antes de empezar (pendiente de caballos-pm)

Nada de esto corre sin:

1. La **web legacy corriendo en cdev** contra la misma base que la API de
   `127.0.0.1:8191`, y su URL.
2. Una cuenta de QA que sea **socio de verdad**, con animales propios en
   Pdre/Extr/Exis. La que se viene usando tiene `/perfil` con `socio: null`, así
   que probablemente ni arranque el alta (`usuario_solo_web` /
   `usuario_no_habilitado`). Es la siembra preparada que quedó sin correr.
3. Un **evento de QA con ventana abierta** que ofrezca morfología, una prueba
   con jinete, una con yunta y una con equipo, y con `pide_renspa` en `true`.
4. Cómo comparar las filas escritas (eje C): dump de las filas, o el eje C lo
   corre el PM y acá se cubren A y B por pantalla.
5. Confirmación de que escribir **desde la web** en cdev entra en las mismas
   reglas que ya valen para la app: sólo eventos de QA, equipos con nombre
   `QA CDEV…`, nada a prod.

Regla que no cambia: la base de cdev es una copia del backup de producción con
datos personales reales. Las inscripciones van sólo contra eventos de QA.

## Cómo se corre cada caso

El mismo caso, en este orden, para que el segundo camino no herede estado del
primero:

1. **Web**: hacer el caso en `expositores_inscripcion_paso1…paso7`, anotar qué
   pide cada paso, qué rechaza y con qué texto, y el precio de `paso6`.
2. **App**: el mismo caso en «Mis inscripciones» → nueva, anotando lo mismo.
3. Si el caso termina en alta: comparar las filas (eje C).
4. Si termina en rechazo: comparar **el veredicto**, no el texto. Los textos son
   distintos a propósito (`src/erroresInscripcion.js` los reescribe en
   castellano llano); lo que tiene que coincidir es qué se acepta y qué no.

El emparejamiento de pasos es tentativo salvo donde el código lo afirma: paso3 =
candidatos de animal, paso4 = datos del expositor, paso6 = precio. Confirmarlo
en la corrida.

---

## Eje A — Lo que se pide

Expectativa: conjuntos idénticos. Lo que se compara es contenido **y orden**.

| # | Caso | Web | App | Qué comparar |
|---|---|---|---|---|
| A1 | Alertas previas al evento | `expositores_alerta1.php` | paso `alertas` | Qué alertas y qué términos. La app replica a propósito el defecto del bucle de la web, que imprime el cuerpo de la última alerta (`mapAlertas`) |
| A2 | Eventos ofrecidos | paso1 | paso `evento` | La misma lista, incluidos los cerrados con «rehacer» habilitado |
| A3 | Avisos del evento elegido | `alerta2` / `alerta3` | paso `avisoEvento` / `alerta3` | Que aparezcan en el mismo momento del flujo |
| A4 | Candidatos por SBA/RP/sexo | paso3 | paso `animal` | Mismos animales, mismo orden, y los ya inscriptos marcados igual |
| A5 | Cabañas del socio | `<select>` de paso4 | paso `datos` | La lista recortada, sin vacías, sin repetidos, **en el orden de la web** |
| A6 | Propietario | paso4 pide propietario (Select o New) | la app **no lo pide** | Ver D1: es la divergencia estructural, no un detalle de lista |
| A7 | Opciones para el animal | paso5 | paso `participacion` | Morfología, tipo y aptitud, pruebas, categorías y el `propia` de cada una |
| A8 | Jinetes | buscador de paso5 | paso `jinete` | Mismos resultados y el mismo marcado de deuda a la fecha del evento |
| A9 | Candidatos de yunta | paso5 | paso `yunta` | Mismos candidatos y los mismos bloqueados |
| A10 | Equipos | paso5 | paso `equipo` | Mismos equipos y los mismos ocupados |
| A11 | Precio | paso6 | paso `confirmar` → 201 | El precio total y el de cada prueba. La app no calcula: lo muestra del 201 |

---

## Eje B — Las reglas

Una fila por código. **Llega desde la app** dice si el caso se puede provocar
tocando la pantalla: cuando dice «no», la app bloquea antes (columna «dónde») y
el caso se ejerce con el endpoint directo — y lo que hay que mirar es si la web
**también** bloquea, porque ahí es donde los dos caminos pueden diferir sin que
nadie vea un error.

### B.1 — Las que la web decide por la UI (el grupo que importa)

| # | Código | Caso | Llega desde la app | Dónde bloquea la app | Qué hace la web | Resultado |
|---|---|---|---|---|---|---|
| B1 | `CabaniaFaltante` | confirmar con la cabaña vacía | no | `AltaInscripcionScreen.js:738` | la pide: `paso4` err 4/8, con cabaña del select o tipeada | |
| B2 | `UbicacionFaltante` | provincia y/o localidad vacías | no | `:738` | las pide como texto: `paso4` err 256/512. Los chequeos por id (`IdProvincia`, `IdDepartamento`, `IdLocalidad`) están **comentados** | |
| B3 | `RenspaFaltante` | evento con `pide_renspa`, Renspa vacío | no | `:739` | `paso4:131` sólo si `$oEvento->Renspa` | |
| B4 | `RenspaInvalido` | Renspa de 12 o 14 números | no | `:85`, misma regex que el PHP | `paso4:134`, regex idéntica | |
| B5 | `TablaSexo` | tabla y sexo incoherentes (`IdExis` con sexo 1) | no | el sexo sale del animal elegido | lo vuelve imposible armando el form | |
| B6 | `SexoCastrado` | castrado en una participación que no lo admite | a confirmar | — | ver qué ofrece paso5 para un castrado | |
| B7 | `CategoriaSinCalcular` | animal sin categoría morfológica calculable | a confirmar | — | ver si paso5 ofrece morfología igual | |
| B8 | `PruebaNoOfrecida` | prueba que el evento no ofrece para ese animal | no | sólo se listan las ofrecidas | ídem | |
| B9 | `JineteNoDisponible` | jinete que dejó de estar disponible entre la lista y el envío | no | sólo se listan los disponibles | ídem. **Carrera de los dos lados**: vale probarlo con el endpoint | |
| B10 | `EquipoInexistente` | equipo borrado entre la lista y el envío | no | ídem | ídem | |
| B11 | `AnimalInexistente` | animal que no está en el stud book | no | se elige de la búsqueda | ídem | |
| B12 | `ExpositorInexistente` | no se puede identificar al expositor | no | la app no manda expositor | ver D1 | |
| B13 | `PruebaCategoriaUnica` | dos categorías «comunes» de la misma prueba | no | `src/reglasAlta.js` (`alternarCategoria`) | radios que comparten grupo | |

### B.2 — Las del validador compartido (muestreo, no exhaustivo)

Mismo código de los dos lados, así que acá sólo se confirma que la app lo
**provoca y lo muestra** igual.

| # | Código | Caso | Llega desde la app | Resultado |
|---|---|---|---|---|
| B14 | `ParticipacionVacia` | confirmar sin ninguna participación | no (`:940`) | |
| B15 | `JineteFaltante` / `JineteMorfologia` | prueba o morfología sin jinete | no (`:916`) | |
| B16 | `JineteImpago` | jinete con cuota impaga a la fecha del evento | no (`:1291`, deshabilitado) | |
| B17 | `YuntaIncompleta` | prueba de yunta sin compañero | no (`:916`) | |
| B18 | `YuntaOcupada` | compañero ya elegido en esa categoría | no (bloqueado en la lista) | |
| B19 | `EquipoOcupado` / `AnimalEnOtroEquipo` | equipo o integrante ya anotado | no (bloqueado) | |
| B20 | `CupoLleno` | categoría sin cupo | sí | |
| B21 | `Pertenencia` | animal que no figura a nombre del socio | sí (los ajenos se pueden elegir) | |
| B22 | `VentanaCerrada` | evento que se cierra entre el paso 1 y el confirmar | sí, con tiempo | |

### B.3 — Los que no son 422

| # | Caso | Qué esperar | Resultado |
|---|---|---|---|
| B23 | Mismo animal, mismo evento, dos veces | `409 Duplicado` en la app; la web, su propio mensaje. **Y una inscripción rechazada cuenta** (#189) | |
| B24 | `condicion` Titular/Suplente | la web la ofrecía sólo en los eventos 61/62 (cerrados); la API da `400` si llega | |
| B25 | Mantenimiento de inscripciones activo | un solo interruptor para los dos lados: la web cierra y la API da `503 mantenimiento` | |
| B26 | Cuenta 1278 / 1610 | `403 usuario_solo_web`: inscriben sólo por la web, a propósito | |
| B27 | Caracteres fuera de latin1 (un emoji en la cabaña) | `400` en la API; ver qué hace la web con el mismo texto | |

---

## Eje C — La inscripción terminada

El caso fuerte: **la misma elección por los dos caminos**, en dos animales
equivalentes del mismo socio (el mismo animal daría `409` en el segundo
intento), y diff de lo que quedó escrito.

| # | Qué comparar | Resultado |
|---|---|---|
| C1 | La fila de `tblInscripcionAnimales`: todas las columnas salvo id, fecha y las que dependen del animal | |
| C2 | Las filas de participación (morfología, tipo y aptitud, pruebas con su categoría, yunta, equipo) | |
| C3 | La línea de `tblInscripcionesLogs` | |
| C4 | El precio: total y por prueba (paso6 de la web vs el 201 de la API) | |
| C5 | `estado` y `rechazo_funcional` | |
| C6 | El mail del alta (pieza T3 de #59): que salga de los dos lados, al mismo destinatario | |
| C7 | La inscripción vista después: `expositores_inscripcion_view.php` vs `GET /inscripciones/{id}` y el certificado | |

Metodología: es la de la skill `php8-formularios` —mismo POST a dos stacks,
comparar tablas—, con la diferencia de que acá los dos stacks comparten la base,
así que lo que se compara son dos filas de la misma tabla y no dos bases.

---

## Divergencias sospechadas antes de correr nada

Salieron de leer los dos códigos, no de correrlos. Son hipótesis.

**D1 — El propietario.** `paso4` de la web pide propietario, con dos opciones:
elegir uno existente o cargar uno nuevo (err 1 y 2). La app **no lo pregunta**:
el payload del POST no tiene propietario y el README dice que el expositor es
siempre el dueño. Hay que ver qué hace la web cuando el propietario elegido no
es el socio, y si eso convive con la regla `Pertenencia`. Es la única diferencia
**estructural** de la matriz: no es un campo que se valide distinto, es un campo
que de un lado existe y del otro no.

**D2 — La app es más estricta que el servidor, por diseño.** Nueve de los trece
códigos del grupo B.1 no se pueden provocar desde la pantalla. Eso es bueno
—el socio ve el problema antes de confirmar— pero significa que esos nueve
caminos del validador **nunca se ejercen en producción desde la app**. Si uno
quedó mal, se va a notar recién cuando una pantalla cambie.

**D3 — La ubicación por texto.** La web tiene comentados los chequeos de
provincia/departamento/localidad **por id** y validados los de texto. O sea que
los dos lados guardan texto libre. Vale confirmar que la app no normaliza algo
que la web deja pasar tal cual (acentos, mayúsculas).

**D4 — Las carreras (B9, B10, B22).** Un jinete que deja de estar disponible, un
equipo borrado o una ventana que se cierra entre la lectura y el envío son los
únicos casos donde el 422 es alcanzable desde la app **sin tocar el endpoint**,
porque dependen del tiempo y no de la UI. Son los que más vale la pena correr de
verdad: son los que un socio real se va a comer.
