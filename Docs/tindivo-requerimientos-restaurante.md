# TINDIVO · Requerimientos — App Restaurante

> Documento de producto centrado exclusivamente en la app que usan los restaurantes aliados. Sin detalles de implementación, sin stack, sin código — solo qué debe hacer la app, para quién, y bajo qué reglas.

---

## 1. Qué es esta app

La app del restaurante es la interfaz desde la cual un restaurante aliado de Tindivo solicita motorizado, registra el pago, monitorea el estado del pedido, y coordina cambios de tiempo o cancelaciones cuando algo se sale de lo planificado.

No es una app de delivery completa — es una **herramienta operativa específica** para restaurantes pequeños en Trujillo que no tienen motorizados propios. El cliente final nunca usa esta app; la dirección y teléfono del cliente viajan en un papel físico que el cajero le entrega al motorizado.

---

## 2. Quién la usa

**Usuario principal:** cajero o dueño del restaurante.

**Contexto real de uso:**
- Está detrás del mostrador, en medio del ajetreo de la hora pico.
- Probablemente tiene un teléfono sonando, gente esperando, y la cocina gritando pedidos al mismo tiempo.
- No es "técnico". Usa WhatsApp, redes sociales, pero no es desarrollador ni diseñador.
- Necesita resolver la creación del pedido en **menos de 20 segundos**.
- Sesión típica: abre la app, crea el pedido, la deja abierta a un costado, vuelve solo cuando algo requiere su atención (llega el driver, hay que cancelar, etc.).

**Dispositivo:** PC de escritorio, laptop, o tablet de 10–13 pulgadas. No es una app primariamente móvil.

---

## 3. El papelito de color — elemento único del modelo

Cada restaurante tiene un color de papel asignado (rosado, azul, verde, amarillo, lavanda). El cajero anota a mano en ese papel:
- Dirección del cliente con referencia clara.
- Número de celular del cliente.

Solo esos dos datos van en el papel. El pago se registra en la app. Este papelito físico es el puente entre el restaurante y el driver — el driver lo recoge junto con el pedido y lo lleva consigo. Cualquier referencia visual al "color del restaurante" en la app debe coincidir con el color de papel asignado.

---

## 4. Horario operativo

- **Días:** martes, jueves, viernes y sábado.
- **Horario:** 6:00 PM a 11:00 PM (zona horaria de Perú, UTC-5).
- Fuera de este horario la app está visible pero no permite crear pedidos.
- El horario es fijo en esta versión. No hay excepciones por feriados ni configuración por restaurante.

---

## 5. Reglas de negocio clave que el restaurante debe conocer

### 5.1 · Tiempos de preparación

Las únicas opciones al crear un pedido son **10, 20 o 30 minutos**. No existe "listo ahora". El mínimo es 10 minutos porque el motorizado necesita tiempo de tránsito, aunque el pedido esté listo antes.

### 5.2 · Estados visuales del pedido (el semáforo)

El pedido atraviesa 5 estados a lo largo de su vida:

| Estado | Significado para el restaurante | Color |
|---|---|---|
| Esperando driver | Ningún motorizado aceptó aún | Rojo |
| Driver en camino | Un motorizado aceptó y viene al local | Amarillo |
| Driver en el local | El motorizado llegó y está esperando | Naranja |
| En entrega | El motorizado salió con el pedido hacia el cliente | Amarillo oscuro |
| Entregado | El pedido llegó al cliente | Verde |

### 5.3 · Adelantar ("mi pedido está listo antes de tiempo")

El restaurante puede avisar al motorizado que el pedido está listo antes del tiempo estimado, **pero solo mientras queden más de 10 minutos** para el tiempo original. Si queda 10 min o menos, esta opción no está disponible porque el driver ya está en alerta activa. Es una acción **informativa**, no obligatoria.

### 5.4 · Prórroga ("necesito más tiempo")

El restaurante puede pedir **+5 o +10 minutos adicionales** cuando la cocina se atrasa. Restricciones:
- Solo **una vez** por pedido.
- Solo disponible antes de que el driver llegue al local (estados "esperando driver" o "driver en camino").
- Una vez usada, el botón desaparece y no reaparece.

### 5.5 · Cancelación

- **"Esperando driver":** el restaurante puede cancelar libremente.
- **"Driver en camino":** puede cancelar pero con advertencia; el driver es notificado y el admin recibe alerta.
- **"Driver en el local" o posterior:** el restaurante ya no puede cancelar. Solo el admin Tindivo puede hacerlo.

### 5.6 · Liquidación de efectivo

Cuando el motorizado cobra en efectivo al cliente, retiene el dinero durante su turno. Cuando regresa al local con efectivo acumulado, lo entrega al restaurante y el cajero debe confirmarlo en la app. Si hay diferencia, **no se discute en el local** — el cajero reporta la diferencia desde la app y el admin Tindivo se encarga.

### 5.7 · Deuda del servicio

El restaurante acumula **S/ 1.00 por entrega realizada**, que debe liquidar con Tindivo en ciclos definidos. Si la deuda no se paga, la cuenta del restaurante puede ser suspendida temporalmente.

---

## 6. Mapa de épicas de la app del restaurante

| Épica | Foco |
|---|---|
| EPIC-R1 | Acceso y sesión |
| EPIC-R2 | Estado del servicio y horario |
| EPIC-R3 | Creación de pedidos |
| EPIC-R4 | Monitoreo de pedidos activos |
| EPIC-R5 | Gestión de tiempos (adelantar / prórroga) |
| EPIC-R6 | Cancelación de pedidos |
| EPIC-R7 | Liquidación de efectivo |
| EPIC-R8 | Historial y cuenta |

---

## 7. Historias de usuario

### Convenciones

- **Prioridad:** P0 (crítico para operar), P1 (importante para buena experiencia), P2 (deseable).
- **Criterios de aceptación:** cada ítem debe poder validarse con un test o una observación directa.

---

## EPIC-R1 · Acceso y sesión

### HU-R-001 · Iniciar sesión con credenciales entregadas
**Como** cajero de un restaurante aliado,
**quiero** ingresar con usuario y contraseña que me entrega Tindivo,
**para** acceder al panel de mi restaurante sin tener que registrarme yo mismo.

**Prioridad:** P0

**Criterios de aceptación:**
- Al abrir la app por primera vez, se muestra un formulario con campos de usuario y contraseña.
- Las credenciales solo las crea el administrador Tindivo; no existe flujo de autoregistro.
- Si las credenciales son correctas, el usuario ingresa al panel principal.
- Si son incorrectas, se muestra un mensaje genérico: "Usuario o contraseña incorrectos", sin revelar cuál de los dos falló.
- Tras 5 intentos fallidos consecutivos, el formulario se bloquea por 60 segundos.

---

### HU-R-002 · Permanecer autenticado entre visitas
**Como** cajero,
**quiero** no tener que loguearme cada vez que abro la app,
**para** ser ágil durante el turno.

**Prioridad:** P0

**Criterios de aceptación:**
- Una vez ingresado, la sesión permanece activa durante 7 días sin reautenticarse.
- Cerrar la pestaña o el navegador no cierra la sesión.
- Si la sesión expiró, al abrir la app el usuario es redirigido al formulario de login.

---

### HU-R-003 · Cerrar sesión manualmente
**Como** cajero,
**quiero** poder cerrar sesión al terminar mi turno,
**para** proteger el acceso si comparto la computadora con otro turno.

**Prioridad:** P1

**Criterios de aceptación:**
- Existe un botón visible de "Cerrar sesión" en la navegación principal.
- Al confirmar, el usuario es devuelto al formulario de login.

---

### HU-R-004 · Recuperar contraseña olvidada
**Como** cajero que olvidó su contraseña,
**quiero** saber cómo recuperar el acceso,
**para** no perder el turno.

**Prioridad:** P1

**Criterios de aceptación:**
- En el formulario de login existe un link "Olvidé mi contraseña".
- Al tocarlo, se muestran instrucciones: "Comunícate con Tindivo al 906 550 166".
- En esta versión no existe flujo automático de recuperación — la gestiona el admin.

---

## EPIC-R2 · Estado del servicio y horario

### HU-R-005 · Ver el estado del servicio al entrar
**Como** cajero,
**quiero** ver inmediatamente si el servicio Tindivo está operativo,
**para** saber si puedo pedir moto ahora.

**Prioridad:** P0

**Criterios de aceptación:**
- El panel principal muestra un indicador visual prominente con el estado: "Servicio activo" o "Servicio no disponible".
- Dentro del horario operativo, el estado es activo.
- Fuera del horario, el estado es inactivo con explicación del próximo turno disponible (ej.: "Próximo turno: jueves, 6:00 PM").
- La decisión considera la zona horaria de Perú, independientemente de la configuración del dispositivo.

---

### HU-R-006 · Impedir creación de pedido fuera de horario
**Como** producto,
**quiero** bloquear la creación de pedidos fuera del horario,
**para** evitar confusiones y expectativas incumplidas.

**Prioridad:** P0

**Criterios de aceptación:**
- Fuera de horario, el botón "Pedir moto" aparece visiblemente desactivado.
- Al pasar el cursor o dedo sobre el botón, un tooltip explica el horario de operación.
- Aunque por algún error el botón se tocara, el sistema rechaza la solicitud.

---

### HU-R-007 · Ver cuenta suspendida por deuda
**Como** cajero de un restaurante con deuda impaga,
**quiero** ver claramente el estado y a quién contactar,
**para** resolverlo sin perder el turno.

**Prioridad:** P1

**Criterios de aceptación:**
- Si la cuenta está suspendida, el panel muestra un bloque destacado: "Cuenta suspendida".
- Se muestra el número de contacto de Tindivo: 906 550 166.
- Todos los botones de creación de pedido están deshabilitados.
- El histórico de pedidos anteriores sigue siendo consultable.

---

## EPIC-R3 · Creación de pedidos

### HU-R-008 · Elegir tiempo de preparación
**Como** cajero,
**quiero** indicar cuánto tardará la preparación del pedido,
**para** que el motorizado llegue al restaurante justo a tiempo.

**Prioridad:** P0

**Criterios de aceptación:**
- Las opciones disponibles son exactamente **10 min**, **20 min** y **30 min**.
- No existe la opción "Listo ahora" ni valores intermedios personalizables.
- La opción seleccionada se destaca visualmente.
- Es obligatorio seleccionar una opción antes de avanzar al siguiente paso.

---

### HU-R-009 · Registrar método de pago con flujo progresivo
**Como** cajero,
**quiero** registrar cómo pagó o pagará el cliente,
**para** que el motorizado sepa si debe cobrar y con qué método.

**Prioridad:** P0

**Criterios de aceptación:**
- La primera pregunta es: "¿El cliente ya pagó?" con opciones [Ya pagó] y [Por pagar].
- Si el cajero elige "Ya pagó", no se piden más datos y se puede crear el pedido directamente.
- Si elige "Por pagar", se despliega la pregunta: "¿Cómo va a pagar?" con opciones [Efectivo] y [Yape/Plin].
- Si elige "Efectivo", se piden dos montos: monto del pedido y monto con el que paga el cliente.
- Si elige "Yape/Plin", solo se pide el monto del pedido.
- Los campos nuevos aparecen como despliegue dentro del mismo formulario, sin reemplazar lo ya ingresado (el usuario nunca pierde contexto).

---

### HU-R-010 · Calcular y mostrar el vuelto a preparar
**Como** cajero,
**quiero** ver claramente el vuelto que debo preparar cuando el pago es en efectivo,
**para** meterlo en la bolsa antes de que llegue el motorizado.

**Prioridad:** P0

**Criterios de aceptación:**
- Al ingresar "monto del pedido" y "con cuánto paga", la app calcula automáticamente el vuelto.
- El vuelto aparece destacado visualmente con el mensaje: "🛍 Mételo en la bolsa antes de que llegue el motorizado".
- Si el cliente paga con monto exacto, el vuelto es S/ 0.00 y se muestra nota: "Paga con monto exacto — no hay vuelto".
- El campo "con cuánto paga" no permite valores menores al monto del pedido.

---

### HU-R-011 · Recordatorio del papelito antes de crear
**Como** producto,
**quiero** recordar al cajero anotar los datos del cliente en el papelito físico,
**para** que no se olvide de ese paso crítico fuera de la app.

**Prioridad:** P1

**Criterios de aceptación:**
- Antes del botón de creación final, se muestra un recordatorio visual con el color de papel asignado al restaurante: "¿Ya anotaste dirección y teléfono en tu papelito [COLOR]?".
- El recordatorio es informativo y no bloquea la creación.
- El recordatorio usa el mismo color que el papel físico real del restaurante.

---

### HU-R-012 · Validar datos antes de habilitar creación
**Como** cajero,
**quiero** que el botón "Crear pedido" se active solo cuando todos los datos estén completos,
**para** evitar enviar pedidos incompletos al motorizado.

**Prioridad:** P0

**Criterios de aceptación:**
- El botón permanece deshabilitado mientras falten datos obligatorios.
- Al tocar el botón deshabilitado, los campos faltantes se resaltan visualmente sin mostrar mensajes de error agresivos.
- Los montos ingresados se validan como numéricos positivos con hasta 2 decimales.

---

### HU-R-013 · Confirmar creación exitosa
**Como** cajero,
**quiero** recibir confirmación clara cuando se crea el pedido,
**para** saber que el motorizado fue notificado y puedo pasar al siguiente cliente.

**Prioridad:** P0

**Criterios de aceptación:**
- Al crear el pedido se muestra una confirmación visible con el ID del pedido asignado.
- El usuario es redirigido automáticamente a la vista de pedidos activos, donde ve su pedido recién creado en el primer estado del semáforo.

---

## EPIC-R4 · Monitoreo de pedidos activos

### HU-R-014 · Ver todos los pedidos activos del turno
**Como** cajero,
**quiero** ver todos los pedidos que aún no se han entregado,
**para** monitorear el estado de cada uno.

**Prioridad:** P0

**Criterios de aceptación:**
- La vista muestra todos los pedidos del día que no están en estado "entregado" ni "cancelado".
- Cada tarjeta muestra: ID del pedido, hora de creación, estado actual (chip de color), tiempo restante, método de pago y monto.
- Los pedidos se ordenan por urgencia: primero los críticos, luego por tiempo restante ascendente.
- La vista se actualiza automáticamente sin recargar la página.

---

### HU-R-015 · Identificar estado rápido con semáforo visual
**Como** cajero,
**quiero** identificar el estado de cada pedido por color,
**para** priorizar mi atención de un vistazo.

**Prioridad:** P0

**Criterios de aceptación:**
- Cada pedido muestra un chip con color correspondiente al estado (ver tabla en sección 5.2).
- El color siempre se acompaña de un ícono y texto descriptivo — nunca solo color, por accesibilidad.

---

### HU-R-016 · Alerta de pedido sin motorizado
**Como** cajero,
**quiero** ser alertado cuando un pedido lleva más de 5 minutos sin ser aceptado por ningún motorizado,
**para** poder llamar a Tindivo y evitar que el cliente se desespere.

**Prioridad:** P0

**Criterios de aceptación:**
- Si un pedido lleva más de 5 minutos en "Esperando driver", su tarjeta muestra una alerta visual destacada.
- La alerta incluye el texto: "⚠️ Lleva X min sin ser aceptado. Llama al 906 550 166."
- El número de teléfono mostrado es tocable (abre el marcador del dispositivo o copia al portapapeles según plataforma).

---

### HU-R-017 · Ver detalle completo de un pedido
**Como** cajero,
**quiero** poder abrir el detalle de un pedido específico,
**para** ver su línea de tiempo, ejecutar acciones o cancelarlo.

**Prioridad:** P0

**Criterios de aceptación:**
- Al tocar una tarjeta de pedido, se abre la vista de detalle.
- El detalle muestra: línea de tiempo vertical con los estados y sus timestamps, monto, método de pago, vuelto si aplica, ID, hora de creación, tiempo restante.
- Las acciones disponibles varían según el estado actual del pedido.

---

### HU-R-018 · Ver actualizaciones en tiempo real
**Como** cajero,
**quiero** ver los cambios de estado sin refrescar la página,
**para** no tener que estar tocando la app constantemente.

**Prioridad:** P0

**Criterios de aceptación:**
- Cuando el estado de un pedido cambia (driver lo acepta, llega al local, etc.), la tarjeta se actualiza automáticamente en máximo 5 segundos.
- La transición de estado incluye una animación suave para llamar la atención del cajero sin ser invasiva.

---

## EPIC-R5 · Gestión de tiempos

### HU-R-019 · Avisar que el pedido está listo antes de tiempo
**Como** cajero,
**quiero** notificar al motorizado cuando mi pedido esté listo antes del tiempo estimado,
**para** que pueda venir ahora si le conviene.

**Prioridad:** P1

**Criterios de aceptación:**
- El botón "Pedido listo" solo aparece cuando el pedido tiene **más de 10 minutos restantes** al tiempo estimado.
- El botón NO aparece si el pedido ya está en ventana crítica (≤10 minutos).
- Al tocarlo, el motorizado recibe notificación informativa: "[Restaurante] ya tiene tu pedido listo. Puedes ir antes si puedes".
- Esta acción no cambia el estado del pedido, solo informa al driver.
- Solo se puede usar una vez por pedido.

---

### HU-R-020 · Solicitar prórroga cuando la cocina se atrasa
**Como** cajero cuando la cocina se atrasa,
**quiero** pedir tiempo adicional,
**para** avisar al motorizado sin quedar mal y sin perder el pedido.

**Prioridad:** P0

**Criterios de aceptación:**
- El botón "Necesito más tiempo" está disponible solo en los estados "Esperando driver" y "Driver en camino".
- Al tocarlo se presentan dos opciones: **+5 minutos** o **+10 minutos**.
- La prórroga puede usarse **una sola vez** por pedido; después desaparece.
- El sistema recalcula el tiempo estimado sumando los minutos extra.
- El motorizado recibe notificación: "[Restaurante] necesita X minutos más. Nuevo tiempo estimado: [hora]".

---

### HU-R-021 · Ver claramente cuando la prórroga fue usada
**Como** cajero,
**quiero** ver visualmente que ya usé la prórroga de un pedido,
**para** no intentar usarla nuevamente.

**Prioridad:** P1

**Criterios de aceptación:**
- Una vez usada, el pedido muestra un indicador visible: "⏱ Prórroga usada (+X min)".
- El botón de prórroga desaparece de las opciones disponibles.
- En la línea de tiempo del detalle, el evento queda registrado con su hora.

---

## EPIC-R6 · Cancelación de pedidos

### HU-R-022 · Cancelar sin restricción en "Esperando driver"
**Como** cajero,
**quiero** cancelar un pedido libremente mientras ningún motorizado lo haya aceptado,
**para** corregir errores de registro sin penalización.

**Prioridad:** P0

**Criterios de aceptación:**
- En estado "Esperando driver" aparece el botón "Cancelar pedido" sin advertencias especiales.
- Se pide una confirmación simple antes de ejecutar.
- Tras confirmar, el pedido desaparece del panel y no aparece más en pedidos activos.
- El pedido queda registrado en el histórico con estado "cancelado".

---

### HU-R-023 · Cancelar con advertencia cuando el driver ya está en camino
**Como** cajero,
**quiero** poder cancelar aunque el motorizado esté en camino, pero entendiendo el impacto,
**para** usarlo solo en casos justificados.

**Prioridad:** P0

**Criterios de aceptación:**
- En estado "Driver en camino" aparece el botón "Cancelar" con advertencia visual (ícono, color).
- La confirmación muestra el mensaje: "⚠️ El motorizado ya está en camino. ¿Estás seguro?".
- Al confirmar, el motorizado recibe notificación inmediata y el admin Tindivo es alertado.

---

### HU-R-024 · No poder cancelar después de que el driver llegó
**Como** producto,
**quiero** que el restaurante no pueda cancelar una vez el motorizado llegó al local,
**para** proteger al motorizado de pérdidas de tiempo no compensadas.

**Prioridad:** P0

**Criterios de aceptación:**
- En los estados "Driver en el local", "En entrega" y posteriores, el botón de cancelar no existe en la app.
- El detalle del pedido muestra una nota informativa: "Para cancelar en este estado, contacta al admin Tindivo: 906 550 166".

---

## EPIC-R7 · Liquidación de efectivo

### HU-R-025 · Recibir solicitud de confirmación de efectivo
**Como** cajero,
**quiero** recibir en la app una solicitud de confirmación cuando el motorizado entrega efectivo,
**para** validar el monto sin tener que buscar papeles o recibos.

**Prioridad:** P0

**Criterios de aceptación:**
- Cuando el motorizado acciona "Entregar efectivo" desde su app, el restaurante recibe una notificación visible en pantalla.
- La notificación muestra: monto total declarado por el motorizado, desglose de los pedidos que conforman ese monto (ID y monto parcial de cada uno), y dos opciones: [Confirmar recepción] y [Reportar diferencia].

---

### HU-R-026 · Confirmar recepción de efectivo
**Como** cajero,
**quiero** confirmar con un toque que recibí el monto correcto,
**para** cerrar el ciclo rápidamente y seguir atendiendo.

**Prioridad:** P0

**Criterios de aceptación:**
- Al tocar "Confirmar recepción", el sistema registra la transacción como cerrada.
- El contador de efectivo pendiente del motorizado para ese restaurante se reinicia a cero.
- Se muestra un mensaje de confirmación breve.

---

### HU-R-027 · Reportar diferencia sin discutir en el local
**Como** cajero,
**quiero** reportar que el monto recibido no coincide con lo declarado, sin tener que discutir con el motorizado,
**para** mantener buena relación operativa y que el admin resuelva el caso.

**Prioridad:** P0

**Criterios de aceptación:**
- La opción "Reportar diferencia" está visualmente neutral — no roja, no acusatoria.
- Al tocarla se pide el monto real recibido y un comentario opcional.
- El admin Tindivo recibe una alerta inmediata con ambos montos (declarado por el driver vs. reportado por el restaurante).
- El pedido queda marcado "en revisión" hasta que el admin resuelva.
- El restaurante no debe discutir con el motorizado en el local — esto se comunica explícitamente en la interfaz.

---

## EPIC-R8 · Historial y cuenta

### HU-R-028 · Ver historial de pedidos del día
**Como** cajero,
**quiero** ver los pedidos que ya se completaron o cancelaron hoy,
**para** hacer seguimiento de mi operación.

**Prioridad:** P1

**Criterios de aceptación:**
- Existe una vista "Historial del día" accesible desde la navegación principal.
- Muestra todos los pedidos del turno con su estado final, hora, monto y método de pago.
- Permite abrir el detalle de cualquier pedido histórico (solo lectura).

---

### HU-R-029 · Ver métricas básicas del turno
**Como** dueño del restaurante,
**quiero** ver cuántos pedidos hice hoy y cuánto facturé,
**para** tomar decisiones operativas.

**Prioridad:** P1

**Criterios de aceptación:**
- El panel principal muestra al menos: número de pedidos del día, monto total facturado del día, deuda acumulada con Tindivo del período.
- Los números se actualizan en tiempo real conforme avanzan los pedidos.

---

### HU-R-030 · Ver información de la cuenta
**Como** dueño del restaurante,
**quiero** ver los datos de mi cuenta, mi color de papel asignado y mi deuda acumulada,
**para** saber mi estado con Tindivo.

**Prioridad:** P1

**Criterios de aceptación:**
- Existe una sección "Mi cuenta" con: nombre del restaurante, dirección, teléfono, color de papel asignado (destacado visualmente), deuda acumulada del período, próximo corte de facturación.
- Los datos son de solo lectura en esta versión. Cambios los hace el admin Tindivo.

---

## 8. Requerimientos no funcionales de la app del restaurante

### RNF-R-001 · Rendimiento
- La app debe cargar y estar lista para usar en máximo **3 segundos** en conexión 4G.
- Las acciones críticas (crear pedido, aceptar liquidación, cancelar) deben responder en máximo **1 segundo**.
- La vista de pedidos activos debe reflejar cambios en máximo **5 segundos** desde que suceden.

### RNF-R-002 · Confiabilidad
- La app debe estar disponible al menos el **99.5%** del horario operativo.
- Ventanas de mantenimiento solo fuera del horario operativo.
- En caso de pérdida momentánea de conexión, la app debe indicar claramente que está offline y reintentar automáticamente al recuperarse.

### RNF-R-003 · Seguridad
- Las contraseñas nunca se almacenan en texto plano.
- Toda comunicación entre la app y el servidor usa conexión cifrada.
- Los intentos fallidos de login son limitados para prevenir ataques.
- La sesión expira automáticamente tras 7 días de inactividad.

### RNF-R-004 · Usabilidad y accesibilidad
- Contraste de texto cumple estándar WCAG AA.
- Áreas tocables tienen mínimo **44×44 píxeles**; los botones principales **56 píxeles o más** de alto.
- Los estados nunca se comunican solo por color — siempre acompañados de ícono y texto.
- Tipografía base no inferior a **14 píxeles**.
- Ningún flujo crítico requiere más de **5 toques** para completarse.

### RNF-R-005 · Compatibilidad
- Funciona en navegadores Chrome, Safari, Firefox y Edge (versiones de los últimos 2 años).
- Diseñada para resoluciones desde 1024×768 hasta 1920×1080.
- Puede usarse en tablet horizontal con la misma experiencia que en laptop/PC.

### RNF-R-006 · Confirmaciones destructivas
- Toda acción irreversible (cancelar pedido, reportar diferencia de efectivo) requiere confirmación explícita.
- Las confirmaciones usan lenguaje claro en español peruano, no jerga técnica.

### RNF-R-007 · Idioma y tono
- Todo el contenido está en español, con tono cálido y cercano (tuteo, no formal).
- Los errores se comunican de forma amable, nunca acusatoria.
- Se evitan tecnicismos — se usan palabras que un cajero entiende sin explicación.

---

## 9. Flujos completos — cómo se encadenan las historias

### Flujo A · Pedido normal (el caso feliz)
1. El cliente llama por teléfono pidiendo delivery.
2. El cajero anota dirección y teléfono en el papelito del color asignado.
3. El cajero abre la app y toca "Pedir moto".
4. Elige 20 minutos de preparación.
5. Indica que el cliente pagará en efectivo con S/ 50, el pedido cuesta S/ 38.
6. La app muestra "Vuelto a preparar: S/ 12".
7. El cajero mete los S/ 12 en la bolsa del pedido.
8. Crea el pedido. Ve la tarjeta aparecer en "Pedidos activos" con estado rojo.
9. Al minuto 8, un motorizado acepta. La tarjeta cambia a amarillo.
10. Al minuto 18, el motorizado llega al local. La tarjeta se pone naranja.
11. El cajero entrega la bolsa + el papelito al motorizado.
12. Minutos después, la tarjeta cambia a "En entrega".
13. Al rato, la tarjeta cambia a "Entregado". El ciclo cerró.

### Flujo B · La cocina se atrasó
1. Cajero creó un pedido de 20 minutos.
2. Al minuto 15 se da cuenta de que la cocina necesita 10 min más.
3. Abre el detalle del pedido → "Necesito más tiempo" → elige "+10 minutos".
4. El motorizado recibe notificación automática.
5. Tiempo estimado se actualiza. Si el motorizado aún no había aceptado, el pedido puede volver a verde temporalmente.

### Flujo C · El pedido estuvo listo antes
1. Cajero creó un pedido de 30 minutos.
2. En el minuto 12 el pedido ya está listo.
3. Faltan 18 minutos al tiempo original → está disponible el botón "Pedido listo antes de tiempo".
4. Cajero lo toca. El motorizado recibe aviso informativo.
5. El motorizado puede venir ahora si puede; si no, vendrá al tiempo original.

### Flujo D · Cancelación correcta
1. Cajero creó un pedido por error (datos equivocados).
2. Nadie aceptó aún → toca "Cancelar pedido" → confirma.
3. El pedido desaparece. Ningún motorizado se entera.
4. Crea el pedido correcto.

### Flujo E · Liquidación de efectivo
1. A lo largo del turno, el motorizado cobró S/ 87 en efectivo de 2 pedidos distintos de este restaurante.
2. El motorizado regresa al local y toca "Entregar efectivo" en su app.
3. En la app del restaurante aparece notificación: "El motorizado dice haber entregado S/ 87.00".
4. El cajero cuenta el efectivo físicamente → coincide → toca "Confirmar recepción".
5. Si no coincide, toca "Reportar diferencia", ingresa el monto real y un comentario. El admin resuelve.

---

## 10. Supuestos y decisiones pendientes

### Supuestos actuales
- El horario operativo es fijo y no tiene excepciones por feriados en esta versión.
- Cada restaurante tiene un único color de papel asignado, no cambia.
- La cuenta es única por restaurante — no hay usuarios múltiples con roles distintos (cajero, dueño, etc.).
- El admin Tindivo es quien crea cuentas, cambia contraseñas, suspende y reactiva.

### Decisiones pendientes (recomendado resolver antes del lanzamiento)
1. ¿Debe la app guardar como backup el teléfono del cliente (en caso de que el motorizado pierda el papelito)?
2. ¿Debe existir notificación al restaurante cuando el cliente confirma recepción del pedido?
3. ¿El restaurante debería poder consultar histórico de días anteriores (más allá del día actual)?
4. ¿Debe existir una función de exportar datos (CSV, PDF) para contabilidad del restaurante?
5. ¿Existe un flujo para que el restaurante dé feedback sobre el servicio del motorizado?
6. ¿Qué sucede si un pedido queda "congelado" en un estado por un error técnico — puede el restaurante forzar cierre o solo el admin?
7. ¿Debería existir un chat o canal directo entre restaurante y motorizado dentro de la app?

---

## 11. Resumen priorizado

| Prioridad | Cantidad | Áreas cubiertas |
|---|---|---|
| **P0** | 21 historias | Flujo core de operación: login, creación, monitoreo, estados, prórroga, cancelación, liquidación |
| **P1** | 9 historias | Calidad de vida: cerrar sesión, recuperar contraseña, recordatorios visuales, historial, métricas |
| **P2** | 0 en MVP | — |

**Total:** 30 historias de usuario para la app del restaurante + 7 requerimientos no funcionales.

Con este alcance, un equipo de 2-3 personas puede construir el MVP de la app del restaurante en **aproximadamente 6-8 semanas**, dependiendo de si el backend se desarrolla en paralelo con la app del motorizado o no.
