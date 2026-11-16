# Alta de inscripción: web vs app, lado a lado

Casos para correr el alta por los dos caminos en **cdev**, con los mismos datos,
y comparar lo que el socio obtiene por el teléfono contra lo que obtiene por la
web.

No es una suite automatizada: es una lista para correr a mano una vez, anotando
el resultado en la columna vacía.

## Lo que ya está probado, y por eso no se repite

La primera versión de este documento proponía comparar también las filas que
quedan en la base. **Eso ya está hecho en #59**, y con más rigor del que tendría
una corrida a mano (`caballos-criollos/docs/plan-59-alta-inscripcion-app.md:484`):

- **T-59-P1** hace cada alta dos veces desde el mismo estado de base: la **web
  real**, con un driver 5.6 que recorre `paso3 → paso4 → paso5 → paso6 → paso7`
  con la `$_SESSION` serializada entre pasos, y la **API** con el JSON
  equivalente. Compara **todas** las columnas de las 5 tablas, el log incluido,
  salvo autoincrementales y fechas que pone la base. Unos quince escenarios:
  morfología en cabestro y montado, castrado nuevo y existente, cría ajena,
  funcional sin inspección, los cuatro tipos de socio, yunta, equipo, lista de
  espera, tipo y aptitud, y los dos de acentos y espacios.
- **T-59-R** da, por cada código del validador, un **par de payloads que
  difieren en un solo campo**: uno 201 y el otro 422 con exactamente ese código.
  Incluye los que la web decidía por la interfaz (`AnimalInexistente`,
  `CategoriaSinCalcular`, `JineteNoDisponible`, `TablaSexo`, `PruebaNoOfrecida`…),
  y los que no se pueden provocar quedan declarados con el motivo.
- **T-59-M** compara el mail byte a byte, y **T-59-L** la línea del log.

O sea: **web = API ya está medido**. Lo que #59 nunca comparó es la **app**: su
driver era el JSON, no la pantalla. Todo lo que sigue es sobre la capa que la app
pone encima — el mapeo, los selects, el orden de los pasos y, sobre todo, lo que
la app **bloquea antes de mandar**.

Eso cambia la pregunta de cada caso. No es «¿la API rechaza esto?», que ya se
sabe, sino **«¿puede el socio llegar hasta acá desde la pantalla, y la web lo
deja llegar al mismo lugar?»**.

## El entorno (confirmado por el PM, 2026-11-16)

| qué | dónde |
|---|---|
| Web legacy | `http://127.0.0.1:8190` — login en `/espanol/expositores_login.php` |
| API | `http://127.0.0.1:8191` |
| Mails | mailpit en `http://127.0.0.1:8192` |

Los dos lados pegan contra la **misma** cdev-db, así que lo que se compara son
dos filas de la misma tabla y no dos bases.

**Reglas de escritura** (valen igual para la web que para la app):

- Sólo eventos de QA. Equipos con nombre `QA CDEV…`. Nada a prod.
- Los mails quedan en mailpit; no se abre ningún link a `caballoscriollos.com`.
- **No tocar** las filas que ya dejó la app: inscripciones `190028` y `190029`,
  equipo `9061105`.
- Anotar **cada `IdInscripcion`** que se cree, para la limpieza.
- `cdev-qa` (usuario `9061001`) lo comparten la app y el e2e, y el e2e **borra
  por evento + usuario QA**: si una corrida del e2e pasa en el medio, se lleva lo
  de esta.

**La siembra la prepara el PM y la corre el usuario** (el equipo tiene
SELECT-only sobre cdev-db). No se le pide a otra sesión.

## Quién corre qué

- **Ejes A y B (pantalla contra pantalla)**: acá, recorriendo la web en el
  navegador y la app en el simulador.
- **Filas**: las corre `caballos-tests` con SELECT y pasa el diff. No hace falta
  repetir T-59-P1; lo único que vale mirar es C1 (abajo).

Cada caso, en este orden, para que el segundo camino no herede estado del
primero: primero la web (`paso1…paso7`, anotando qué pide cada paso, qué rechaza
y el precio de `paso6`), después la app, y al final la comparación. Lo que tiene
que coincidir es **el veredicto**, no el texto: los textos de la app están
reescritos a propósito en castellano llano (`src/erroresInscripcion.js`).

---

## Eje A — Lo que se pide

El eje principal, porque es el único que #59 no toca. Se compara contenido **y
orden**.

| # | Caso | Web | App | Qué comparar |
|---|---|---|---|---|
| A1 | Alertas previas | `expositores_alerta1.php` | paso `alertas` | Qué alertas y qué términos. La app replica a propósito el defecto del bucle de la web, que imprime el cuerpo de la última alerta (`mapAlertas`) |
| A2 | Eventos ofrecidos | paso1 | paso `evento` | La misma lista, incluidos los cerrados con «rehacer» habilitado |
| A3 | Avisos del evento | `alerta2` / `alerta3` | paso `avisoEvento` / `alerta3` | Que aparezcan en el mismo momento del flujo |
| A4 | Candidatos por SBA/RP/sexo | paso3 | paso `animal` | Mismos animales, mismo orden, y los ya inscriptos marcados igual |
| A5 | Cabañas del socio | `<select>` de paso4 | paso `datos` | La lista recortada, sin vacías, sin repetidos, **en el orden de la web** |
| A6 | Opciones para el animal | paso5 | paso `participacion` | Morfología, tipo y aptitud, pruebas, categorías y el `propia` de cada una |
| A7 | Jinetes | buscador de paso5 | paso `jinete` | Mismos resultados y el mismo marcado de deuda **a la fecha del evento** |
| A8 | Candidatos de yunta | paso5 | paso `yunta` | Mismos candidatos y los mismos bloqueados |
| A9 | Equipos | paso5 | paso `equipo` | Mismos equipos y los mismos ocupados |
| A10 | Precio | paso6 | paso `confirmar` → 201 | Total y por prueba. La app no calcula: muestra lo que trae el 201 |

---

## Eje B — Lo que cada pantalla deja hacer

Para cada caso: **¿la pantalla de la app permite llegar?** y **¿la de la web?**.
Un «no» de los dos lados es coincidencia, no un agujero. Un «no» de la app con
«sí» de la web es una función que el socio pierde en el teléfono; al revés, es un
alta que la app deja intentar y la ACCC después rechaza.

El 422 que devuelve la API en cada caso ya está probado en T-59-R: acá no se
verifica el código, se verifica **si la pantalla lo puede provocar**.

| # | Caso | App | Dónde bloquea la app | Web | Resultado |
|---|---|---|---|---|---|
| B1 | Cabaña vacía | no | `AltaInscripcionScreen.js:738` | no: error 4/8 de `paso4:107`. Con sólo espacios, `CabaniaFaltante` de los dos lados (medido en T-59-P1, escenario 22) | |
| B2 | Provincia o localidad vacías | no | `:738` | no: errores 256/512 de `paso4:126`. Los chequeos por id están **comentados**: los dos lados guardan texto libre | |
| B3 | Renspa vacío con `pide_renspa` | no | `:739` | no: `paso4:131`, sólo si el evento lo pide | |
| B4 | Renspa de 12 o 14 números | no | `:85` | no: `paso4:134`, **misma regex** que la app | |
| B5 | Castrado en una participación que no lo admite | a medir | — | a medir: qué ofrece paso5 para un castrado | |
| B6 | Animal sin categoría morfológica calculable | a medir | — | a medir: si paso5 ofrece morfología igual | |
| B7 | Dos categorías «comunes» de la misma prueba | no | `src/reglasAlta.js` | no: radios que comparten grupo | |
| B8 | Jinete con deuda a la fecha del evento | no | `:1291`, deshabilitado | a medir: si paso5 lo lista y lo deja elegir | |
| B9 | Animal ajeno | **sí** | — | a medir: la web deriva el expositor del `PROP` del animal (ver D1) | |
| B10 | Categoría sin cupo | **sí** | — | a medir | |
| B11 | Animal ya inscripto en el evento | no (viene bloqueado) | a medir: y **una inscripción rechazada cuenta** (#189) | | |
| B12 | Prueba o morfología sin jinete | no | `:916` | no | |
| B13 | Yunta sin compañero | no | `:916` | no | |
| B14 | Compañero o equipo ya ocupado | no (bloqueado en la lista) | no | | |
| B15 | Confirmar sin ninguna participación | no | `:940` | no | |

### Las carreras — los únicos 422 que un socio real se come

Dependen del tiempo y no de la interfaz, así que son alcanzables desde la app
**sin tocar el endpoint**. Son los que más vale la pena correr de verdad.

| # | Caso | Cómo | Resultado |
|---|---|---|---|
| B16 | `VentanaCerrada` | abrir el alta con la ventana abierta y cerrarla antes de confirmar | |
| B17 | `JineteNoDisponible` | elegir el jinete y dejarlo no disponible antes de confirmar | |
| B18 | `EquipoInexistente` | elegir el equipo y borrarlo antes de confirmar | |
| B19 | `CupoLleno` | llenar el cupo entre la pantalla de pruebas y el confirmar | |

### Los que no son 422

| # | Caso | Qué esperar | Resultado |
|---|---|---|---|
| B20 | Mantenimiento activo | un solo interruptor: la web cierra y la API da `503 mantenimiento` | |
| B21 | Emoji en la cabaña | `400` en la API; ver qué hace la web con el mismo texto (en T-59-U el emoji da 400 y 0 filas) | |

---

## Eje C — Lo único que queda de las filas

| # | Qué comparar | Resultado |
|---|---|---|
| C1 | **El payload que arma la pantalla.** Para un escenario de T-59-P1, hacer la misma elección en la app y comparar su `POST /inscripciones` con el JSON que usó el arnés. Si coinciden, la igualdad de filas se hereda de T-59-P1 y no hay que volver a medirla; si no, la diferencia está en la app y no en el núcleo | |

Eso es todo: C2 a C7 de la primera versión (filas, log, mail, certificado) están
cubiertos por T-59-P1, T-59-L y T-59-M.

---

## Datos que necesita la siembra

Lo que el planner necesita para armarla exacta. Entre paréntesis, los casos que
cada cosa habilita.

| # | Qué | Para |
|---|---|---|
| S1 | Socio QA con `NroSocio` y `TipoSocio` Activo | todo (hoy `/perfil` da `socio: null`) |
| S2 | Animales propios: 1 macho en `Pdre`, 1 hembra en `Exis`, 1 extranjero en `Extr`, 1 castrado | A4, B5 |
| S3 | 1 animal ajeno (otro `PROP`) | B9 |
| S4 | 1 animal del socio **ya inscripto** en el evento | A4, B11 |
| S5 | Evento QA con ventana abierta y `pide_renspa = 1`, con morfología habilitada, 1 prueba individual, 1 de yunta, 1 de equipo y 1 ofrecida **sólo a machos** | A6, A10, B3, B4, B12–B14 |
| S6 | 1 evento cerrado con «rehacer» habilitado | A2 |
| S7 | 1 evento cuya ventana se pueda cerrar durante la corrida | B16 |
| S8 | 1 jinete validado y disponible sin deuda; 1 con deuda **a la fecha del evento**; 1 domador | A7, B8, B17 |
| S9 | 1 equipo del año con sus 3 ternas; 1 equipo ya anotado en la categoría | A9, B14, B18 |
| S10 | 1 categoría con `CupoInscripcion` en 1, llenable durante la corrida | B10, B19 |
| S11 | Al menos 2 cabañas en inscripciones viejas del socio, con repetidos y espacios | A5 |

---

## Divergencias sospechadas

**D1 — El propietario: era una sospecha mía y se cayó.** `paso4` de la web pide
propietario (errores 1 y 2 de su máscara) y la app no lo pregunta nunca, así que
lo anoté como la única diferencia estructural. #59 lo midió y dice otra cosa: el
expositor **se deriva del `PROP` del animal** en los dos lados (`paso4:89` =
`paso7:196`, los dos `GetById($PROP)`), y por eso los estados `ObservadaPropietario`
y `Pendiente` son inalcanzables desde la web igual que desde la API. Queda como
caso B9 —animal ajeno— y no como diferencia de diseño. Lo dejo escrito porque la
hipótesis estaba en el commit anterior.

**D2 — La app es más estricta que el servidor, por diseño.** Doce de los
diecinueve casos del eje B no se pueden provocar desde la pantalla. Eso es bueno
para el socio —ve el problema antes de confirmar— pero significa que esos doce
caminos del validador no se ejercen desde la app en producción. T-59-R los cubre
por API; lo que nadie mide es si la pantalla **debería** dejar pasar alguno.

**D3 — La ubicación por texto.** Los dos lados guardan texto libre, con los
chequeos por id comentados en la web. Falta confirmar que la app no normaliza
algo que la web deja pasar tal cual.

**D4 — El e2e comparte la cuenta.** `cdev-qa` es del e2e también, y el e2e borra
por evento + usuario. Si una corrida pasa en el medio, lo de esta desaparece.
