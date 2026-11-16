# Alta de inscripción: web vs app, medido en cdev

Corrida del **2026-11-16** en cdev, con el usuario QA `cdev-wva` (9061201):
la web legacy en `127.0.0.1:8190` y la app en el simulador, contra la misma base.
Plan que manda: `caballos-criollos/docs/plan-alta-web-vs-app.md` (md5 `deb260ec…`),
con sus correcciones R-1 a R-7 ya aplicadas acá y los casos B22–B28 agregados.

Lo que se compara no es si la app funciona —eso lo cubren los tests— sino si **el
socio obtiene lo mismo por el teléfono que por la web**. Las filas de la base no
se vuelven a medir: la igualdad web = API ya está probada en #59 (T-59-P1, el par
201/422 de T-59-R, el mail de T-59-M). Lo que #59 nunca comparó es la **pantalla**.

## Resultado en una línea

**Ninguna de las tres capas es superconjunto de las otras.** El POST acepta dos
cosas que las dos pantallas bloquean, la web tiene un chequeo que la app no
tiene, la app avisa dos cosas antes que la web, y la app ofrece un caso que su
propio POST rechaza. Las seis divergencias están abajo, ordenadas por
consecuencia para el socio.

Tres escenarios del plan resultaron **irrealizables**, y las tres veces fue el
plan y no la app: la «morfología sin jinete» de C-1, sus acentos (que el
instrumento no puede tipear) y el 6/15 de C-3. Están explicados donde
corresponde.

---

## Divergencias encontradas

### D-1 · El POST acepta lo que las dos pantallas bloquean (B27 y B28)

| | |
|---|---|
| **B27, pertenencia al equipo** | Las dos pantallas ofrecen **sólo** los equipos que incluyen al animal (medido en A9). `POST /inscripciones` con `extr:9061221` y `equipo: 9061205`, que no lo contiene ⇒ **201**, inscripción 190066. `ValidarEquipos` mira faltante, ocupado y «en otro equipo»; la pertenencia **no la valida nadie** del lado del servidor |
| **B28, yunta J-1** | `pdre:9061201` inscripto en 2/1 de E3 con yunta `exis:9061212` (190067). Después, `exis:9061213` en la misma categoría con yunta `pdre:9061201` ⇒ **201**, inscripción 190068. **Control web**: ese candidato viene con `<Permitir>0</Permitir>`. **Control app**: viene con `permitido: false`. El validador usa `IapfPorYunta` donde las pantallas usan `IapfPorAnimalYunta` |

Pronóstico del plan: «API más laxa». **Medido: se cumple, con los dos controles.**

**Ya está arreglado en prod** (backend #275, del 2026-11-16, a partir de esta
medición): B27 pasa a dar 422 con el código nuevo **`AnimalFueraDeEquipo`**, y
B28 pasa a dar `YuntaOcupada`, que la app ya traducía. cdev sirve todavía el
árbol viejo, así que lo medido acá es **el antes del fix**. El texto del código
nuevo ya está en `src/erroresInscripcion.js`.

### D-2 · La app bloquea al animal rechazado; la web lo deja llegar al final (B11)

Animal con inscripción **rechazada** en el evento (#189: el rechazo es definitivo).
La app lo lista en gris con «Ya está inscripto en este evento» y no lo deja elegir.
La web lo lista con el **radio habilitado**, así que el socio llena animal, datos,
participación y precio, y recién al confirmar se come el **409 `Duplicado`**.

### D-3 · La web corta al castrado declarado macho; la app no (B22)

| camino | qué pasa |
|---|---|
| Web, **SBA solo** | lo deja pasar como macho (radio habilitado en paso3) |
| Web, **SBA + RP** | corta en el paso 2: «El animal se encuentra registrado como castrado. No puede participar como Macho» |
| App | lo lista **seleccionable y sin advertencia**; el 422 `SexoCastrado` sólo puede llegar al confirmar |

Pronóstico del plan: «API más estricta». **Medido: la mitad.** Por el camino del
SBA solo los dos dejan pasar; tipeando el RP **la web tiene un aviso temprano que
la app perdió**.

**Se va a arreglar, y la app va a quedar mejor que la web.** El backend aceptó
agregar `castrado: true|false` a `GET /inscripciones/animales` (plan
`caballos-criollos/docs/plan-a2-castrado.md`), con la **regla del 422 del POST, no
la de la web**. Como la web, buscando sólo por SBA, deja pasar al castrado, una
vez que el campo esté la app va a avisar también en ese camino: deja de ser la
que avisa menos y pasa a ser la única que avisa siempre. El issue #2 de este repo
queda abierto y bloqueado hasta que el campo esté en prod.

### D-4 · La app avisa antes; la web avisa menos y rechaza al final (A9 / B14)

Para `extr:9061221`, `GET /equipos` devuelve «Equipo Deuda» con
`habilitado: false` y `jinetes_inhabilitados: ['QA WVA Deuda']`, y, en 6/29,
«Equipo Uno» con `bloqueado: true`, `bloqueado_por: 'QA WvA Yegua Dos'`.

La web, medida **renderizada**:

- **jinete no vigente**: lo informa, escribiéndolo en la etiqueta de la opción —
  «QA CDEV WvA Equipo Deuda **(Jinetes No Vigentes: QA WVA Deuda)**». No lo
  bloquea: se puede elegir.
- **equipo con integrante compartido**: no lo marca de ninguna forma y lo
  **rechaza al escribir**, en `paso7`: «El animal QA WvA Yegua Dos ya integra
  otro equipo inscripto en esta prueba». El mensaje además es **impreciso**: no
  es la prueba entera (6/22 sí se puede), es la categoría con la equivalencia
  15 ≡ 29 — ver D-6.

⚠️ Esta sección decía antes que «el XML de la web no trae con qué marcarlos».
Del XML es cierto, pero la conclusión estaba mal: la página arma la etiqueta con
esa información. Corregido con la pantalla a la vista.

### D-6 · La app ofrece un equipo que su propio POST rechaza (6/15)

El predicado real, medido con `extr:9061221` y el Equipo Uno: **6/29 bloqueado ·
6/15 rechazado (422 `AnimalEnOtroEquipo`) · 6/22 aceptado (201)**. Es por prueba
+ categoría **con 15 ≡ 29**, que es lo que dice el comentario de
`src/erroresInscripcion.js` («en Aparte, las categorías 15 y 29 cuentan como una
sola porque comparten el cupo»).

El validador aplica esa equivalencia. **`GET /equipos` no**: marca `bloqueado`
sólo en 6/29, y en 6/15 devuelve el equipo habilitado y sin marca. La pantalla lo
ofrece, el socio lo elige y el propio POST se lo rechaza al confirmar. Es un
hueco del endpoint de equipos, no del validador.

### D-5 · Con una sola alerta, la app muestra el texto dos veces (A1)

La web imprime el cuerpo bajo «TÉRMINOS Y CONDICIONES GENERALES» y nunca muestra
el título de la alerta. La app muestra **las dos cosas**: el modal «Asociar
Propietarios SRA» y, abajo, el mismo texto como términos. Sale de que el
`terminos` de la API es el cuerpo de la última alerta —el defecto del bucle de la
web, replicado a propósito— y la app además renderiza la alerta aparte.

---

## Eje A — Lo que cada pantalla ofrece

| # | Caso | Resultado |
|---|---|---|
| A1 | Alertas previas | ⚠️ **Difieren** — ver D-5 |
| A2 | Eventos ofrecidos | **Coinciden**: los mismos 17, en el mismo orden, con los cuatro sembrados en la misma posición. La app agrega «Cierra el …» y, en E4, «Habilitado para rehacer» |
| A3 | Avisos del evento | **Coinciden**: mismo texto (ART. 42°), mismo momento del flujo, mismos dos botones |
| A4 | Candidatos por SBA/RP/sexo | **Coinciden** en contenido (nombre, F. nacimiento, SBA, RP, pelo). Difieren en **flujo**: la web pide la presentación en paso2, antes de ver los candidatos; la app, después de elegir el animal |
| A5 | Cabañas del socio | **Coinciden**, contenido y **orden**: `LA SOÑADA`, `EL "PAMPA"`, `LA ESTANCIA`. La web las trae crudas (con la vacía y con el espacio inicial en el value) y la app recortadas y sin la vacía. El orden **no es alfabético**: es el de la web, sin reordenar |
| A6 | Opciones para el animal | **Coinciden**: 17 categorías en 6 pruebas para un macho, con el mismo agrupamiento propias/comunes y la misma categoría morfológica, «Categ. 7 - Padrillo - Adulto Mayor Cabestro». La web esconde las pruebas detrás de un SI/NO; la app las lista directo y muestra el cupo inline |
| A7 | Jinetes | **Coinciden**: los mismos 5 por apellido «WVA», y el **no validado no aparece en ninguno** |
| A8 | Candidatos de yunta | **Coinciden**: mismo mecanismo (SBA + sexo) y mismo candidato permitido |
| A9 | Equipos | **Coinciden** en el conjunto y el orden; ⚠️ difieren en el marcado y en cuándo rechazan — ver D-4 y D-6 |
| A10 | Precio | **No se puede ejercer con esta siembra**: el certificado de `paso6` muestra «Precio:» vacío y la pantalla de confirmar de la app tampoco muestra precio, porque los eventos sembrados no tienen precios cargados. Lo único comprobado es que ninguno de los dos inventa un número |

---

## Eje B — Lo que cada pantalla deja hacer

«Llega» = la pantalla deja mandar el caso al servidor.

### Lo que las dos frenan igual

| # | Caso | App | Web |
|---|---|---|---|
| B1 | Cabaña vacía | no (`:738`) | no: «Debe seleccionar la cabaña» |
| B2 | Provincia o localidad vacías | no (`:738`) | no: «Debe ingresar la provincia / la localidad de la cabaña» |
| B3 | Renspa vacío con `pide_renspa` | no (`:739`) | no: «Debe ingresar el Nro. RENSPA de la cabaña» |
| B4 | Renspa de 12 dígitos | no (`:85`): «tiene 13 números» | no: «debe tener 17 dígitos con el formato 00.000.0.00000/00» |
| B5 | Castrado en morfología | no se ofrece | no se ofrece, ni existe el radio `categoriaM` |
| B7 | Dos categorías comunes | no: al marcar la segunda se destilda la primera (`reglasAlta.js`) | no: comparten grupo de radios |
| B8 | Jinete con cuota impaga | no: gris, «Tiene la cuota impaga a la fecha del evento» | no: la fila sale **sin radio** y con «Realizar Pago» |
| B9 | Animal ajeno | no: «No figura a tu nombre» | no: radio deshabilitado, «no figura de su propiedad» |
| B12 | Prueba sin jinete | no, nombrando qué falta | no avanza; **con reserva**: manejé la pantalla con clics sintéticos y no vi mensaje |
| B13 | Yunta sin compañero | no: «Falta el compañero de Rodeos.» | no (mismo validador que B12) |
| B15 | Sin ninguna participación | no: «Elegí al menos una participación.» | no: alert «Debe inscribir al animal en morfologia o pruebas funcionales» |
| B29 | Morfología sin jinete | no: `:934` lo mete en los faltantes | no: «Debe seleccionar un jinete para inscribirse» |
| B26 | Filtro por sexo del Freno de Oro | macho ⇒ sólo la 24 · hembra ⇒ sólo la 23 · **castrado ⇒ las dos** | idéntico (radio `5` con 23 y 24 para el castrado) |

Las diferencias acá son de **forma**: la web deja mandar y después lista los
errores (o los tira por `alert`); la app deshabilita el botón y nombra qué falta.

### Lo que difieren

| # | Caso | Resultado |
|---|---|---|
| B11 | Animal con inscripción rechazada | ⚠️ **Difieren** — D-2 |
| B22 | `SexoCastrado` | ⚠️ **Difieren** — D-3 |
| B14 | Equipo ocupado / bloqueado | ⚠️ **Difieren en el marcado** — D-4 |

### Por API directa

| # | Caso | Resultado |
|---|---|---|
| B23 | Mismo animal, mismo evento, otra vez | **409** `Duplicado`, sin escribir |
| B24 | La clave `condicion` | **400** `entrada_invalida`, `campo: condicion` |
| B25 | `CategoriaSinCalcular` | **Precondición asertada**: `opciones` da `morfologia: {categoria: null, habilitada: true}` para el potrillo en Montado. Las dos pantallas dicen que no hay categoría; el 422 sólo se alcanza forzando el POST |
| B27 | Equipo sin el animal | ⚠️ **201** — D-1 |
| B28 | Yunta J-1 | ⚠️ **201** — D-1 |

### Pendientes

| # | Caso | Por qué |
|---|---|---|
| B10, B19 | Cupo lleno (se ve / se choca) | Necesitan que `caballos-tests` corra los modos de carrera |
| B16, B17, B18 | Ventana, jinete y equipo que cambian a mitad | Ídem |
| B21 | Emoji en la cabaña | **Web: lo acepta en paso4** y pasa a paso5. **API: 400** (T-59-U). **App: no medible** — el envío de texto al simulador rompe los no-ASCII |
| B20 | Mantenimiento | Fuera por R-6: el interruptor es código y cortaría el ambiente |

---

## Eje C — Las tres altas, hechas por pantalla

La misma elección campo por campo en los dos lados: la web en E1 y la app en E2.

| caso | qué ejercita | web (E1) | app (E2) |
|---|---|---|---|
| C-1 | yegua en cabestro, morfología + F.Z.B. A, cabaña **nueva** tipeada | **190069** | **190070** |
| C-2 | padrillo montado, Rodeos A con yunta, cabaña **elegida de la lista** | **190071** | **190072** |
| C-3 | extranjero, Aparte Campero **1/4 de Final** con el Equipo Uno | **190074** | **190075** |

El diff de las filas lo corre `caballos-tests`.

**Desvíos, los tres del plan y no de la app:**

- **C-1 pedía «morfología sin jinete»** y las dos pantallas lo impiden (fila B29).
  Se corrió con jinete en los dos lados.
- **Los acentos y la ñ de C-1 no se pudieron tipear** (ver las notas de
  instrumento): fue con «Cabana QA Nandu», Cordoba y Jesus Maria. **Ese punto
  queda sin medir**, y era la razón de ser del caso: comparar el teclado real del
  navegador en iso-8859-1 contra la app en UTF-8.
- **C-3 pedía 6/15 con el Equipo Uno**, que es irrealizable por D-6: 15 ≡ 29 y el
  Equipo Ocupado ya está anotado en 6/29. Los dos lados lo rechazaron —la web en
  `paso7`, la app al confirmar— y se rehízo en **6/22**, que ejercita lo mismo
  (el equipo de punta a punta y la derivación J-3 del jinete y el trío).

En las tres, las dos pantallas derivaron solas la categoría morfológica, el
jinete del equipo y el trío, y coincidieron sin que se les indicara nada.

---

## Inscripciones creadas

Para la limpieza, todas del usuario 9061201:

- **E3 (9061203)**, por API: **190066** (B27), **190067** (preparación de B28),
  **190068** (B28).
- **E2 (9061202)**, por API: **190073**, la sonda que midió 6/22; **borrada**
  después con `DELETE /inscripciones/190073` para poder correr C-3 por pantalla.
  Quedó en estado 0.
- **E1 (9061201)**, por pantalla: **190069**, **190071**, **190074**.
- **E2 (9061202)**, por pantalla: **190070**, **190072**, **190075**.

Los dos intentos rechazados de C-3 en 6/15 —web y app— no escribieron nada.

---

## Notas de instrumento

- **El simulador no pega nada** mientras «Pegar desde otras apps» esté en
  «Preguntar» (Ajustes › Apps › Expo Go): el diálogo se come el pegado aunque uno
  conteste que sí. Hay que ponerlo en «Permitir». Queda pendiente devolverlo.
- **El envío de texto al simulador rompe los no-ASCII**: «Córdoba» llega como
  `C√≥rdoba`. Todo lo que lleve acentos o ñ lo tiene que tipear una persona.
- **Los clics por coordenada en el panel del navegador** usan un marco de 800x600
  mientras la página mide en 1024x768: hay que multiplicar por **0,78125**. Con
  `ref` del `read_page` el mapeo lo hace la herramienta.
- **El panel del navegador se come los `alert()`**: para leerlos hay que
  interceptar `window.alert` antes de disparar la acción.
- **El access token vence a la hora.** A mitad de la corrida empezó a dar
  `401 No autenticado`. Se renueva con `POST /auth/refresh` usando el
  `refresh_token` del archivo, reescribiendo `qa-alta-token.json` y `.hdr` con
  umask 077 y sin que el valor pase por la salida.
- **La yunta de la web no se carga sola**: los radios de sexo no tienen
  `onclick`. Hay que tocar el botón **«Buscar»** que está al lado del campo del
  S.B.A. (`BotonBuscarYunta`), o Enter en ese campo.
- La web **no entra por `expositores_index.php`** con este usuario (`:34` lo manda
  al empadronamiento). El alta se entra directo por `expositores_inscripcion_paso1.php`,
  que no tiene ese gate. No es divergencia: `apiv2/src/Modulo/Perfil/Socio.php:40`
  declara aceptado R-9.
