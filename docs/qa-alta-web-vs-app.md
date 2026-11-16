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

**Ninguna de las tres capas es superconjunto de las otras.** La web tiene un
chequeo que la app no tiene, la app tiene dos que la web no tiene, y el POST no
tiene dos que las dos pantallas sí. Las cinco divergencias están abajo, ordenadas
por consecuencia para el socio.

---

## Divergencias encontradas

### D-1 · El POST acepta lo que las dos pantallas bloquean (B27 y B28)

| | |
|---|---|
| **B27, pertenencia al equipo** | Las dos pantallas ofrecen **sólo** los equipos que incluyen al animal (medido en A9). `POST /inscripciones` con `extr:9061221` y `equipo: 9061205`, que no lo contiene ⇒ **201**, inscripción 190066. `ValidarEquipos` mira faltante, ocupado y «en otro equipo»; la pertenencia **no la valida nadie** del lado del servidor |
| **B28, yunta J-1** | `pdre:9061201` inscripto en 2/1 de E3 con yunta `exis:9061212` (190067). Después, `exis:9061213` en la misma categoría con yunta `pdre:9061201` ⇒ **201**, inscripción 190068. **Control web**: ese candidato viene con `<Permitir>0</Permitir>`. **Control app**: viene con `permitido: false`. El validador usa `IapfPorYunta` donde las pantallas usan `IapfPorAnimalYunta` |

Pronóstico del plan: «API más laxa». **Medido: se cumple, con los dos controles.**

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

### D-4 · La app marca equipos que la web no puede marcar (A9 / B14)

Para `extr:9061221` en 6/29 de E2, `GET /equipos` devuelve «Equipo Deuda» con
`habilitado: false` y `jinetes_inhabilitados: ['QA WVA Deuda']`, y «Equipo Uno»
con `bloqueado: true`, `bloqueado_por: 'QA WvA Yegua Dos'` (comparte integrante
con el Equipo Ocupado, ya anotado en esa categoría).

El XML de la web para el mismo caso devuelve **los mismos dos equipos sin ningún
campo de marca** (`Anio, FNac, FechaCreacion, IdAnimal, IdEquipo, IdEquipoAnimal,
IdJinete, IdUsuario, Jinete, Nombre, Rp, Sba, Sexo, Tabla`). La tabla de la web se
arma con ese XML, así que no tiene de dónde sacar el bloqueo.

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
| A9 | Equipos | **Coinciden** en el conjunto y el orden; ⚠️ difieren en el marcado — ver D-4 |
| A10 | Precio | **Pendiente**: sale del 201, va con el eje C |

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

## Eje C — Pendiente

C-1, C-2 y C-3 (las mismas altas por pantalla en E1 y E2) y su diff, que corre
`caballos-tests`. **C-1 pide acentos y ñ**, que no puedo tipear en el simulador:
va sin acentos o los tipea el usuario.

---

## Inscripciones creadas

Todas en **E3 (9061203)**, usuario 9061201, por API directa, anotadas para la
limpieza: **190066** (B27), **190067** (preparación de B28), **190068** (B28).

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
- La web **no entra por `expositores_index.php`** con este usuario (`:34` lo manda
  al empadronamiento). El alta se entra directo por `expositores_inscripcion_paso1.php`,
  que no tiene ese gate. No es divergencia: `apiv2/src/Modulo/Perfil/Socio.php:40`
  declara aceptado R-9.
