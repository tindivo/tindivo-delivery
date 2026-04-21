# TINDIVO · Requerimientos — App Motorizado (PWA)

> Documento de producto centrado exclusivamente en la app que usan los motorizados de Tindivo. Sin código, sin stack, sin detalles de implementación — solo qué debe hacer la app, para quién, bajo qué reglas, y considerando las particularidades de ser una **PWA instalable**.

---

## 1. Qué es esta app

La app del motorizado es la interfaz desde la cual los dos drivers de Tindivo reciben pedidos disponibles, aceptan entregas, registran los datos del cliente al llegar al restaurante, ejecutan la entrega y liquidan el efectivo cobrado al final del ciclo.

Es una **Progressive Web App (PWA)** — funciona en el navegador pero se instala en la pantalla de inicio del celular como si fuera una app nativa. Esto trae ventajas importantes para Tindivo:

- **No requiere publicación en Play Store.** Tindivo puede lanzar mejoras el mismo día que las construye.
- **Funciona en cualquier Android**, sin importar marca o versión mínima.
- **Se actualiza sola** sin que el driver tenga que hacer nada.
- **Se instala con un link**. No hay fricción de "buscar en la tienda".

A cambio, hay consideraciones específicas de PWA (permisos, notificaciones, instalación, conectividad) que no existen en una app nativa tradicional y que este documento trata explícitamente.

---

## 2. Quién la usa

**Usuario:** motorizado (driver) de Tindivo. En esta fase son dos personas fijas, de confianza, contratadas directamente.

**Contexto real de uso:**
- Está en una motocicleta, mayoritariamente en horario nocturno (6pm–11pm).
- El celular está en un soporte en el manubrio, expuesto a lluvia, viento y vibración.
- Usa la app con **una sola mano**, generalmente el pulgar derecho, mientras está parado en semáforos o al llegar al destino.
- Puede estar con guantes livianos.
- El entorno suele ser ruidoso (tráfico, bocinas) — las notificaciones deben ser **contundentes auditiva y visualmente**.
- No es "techie". Conoce WhatsApp, Maps, Waze, y poco más.

**Dispositivo:** celular Android con pantalla de 5.5" a 6.8". Uso en vertical, principalmente.

---

## 3. Por qué PWA y no app nativa — implicaciones

### Lo que ganamos
- Un solo código, un solo deploy.
- Actualizaciones instantáneas sin depender de que el driver actualice desde la tienda.
- Cero costo de publicación.
- Se puede enviar por WhatsApp: "Entra a este link e instala la app".

### Lo que cambia y debemos manejar explícitamente

1. **Los permisos no se asumen, se piden.** Notificaciones push, ubicación, mantener pantalla encendida — todo requiere que el driver dé permiso activamente en el navegador.
2. **La instalación importa.** Si la PWA no está instalada en la pantalla de inicio, las notificaciones push funcionan peor y la experiencia es frágil. Hay que guiar fuerte hacia la instalación.
3. **El navegador puede "dormir" la app.** Los navegadores hacen throttling agresivo cuando una pestaña lleva mucho tiempo inactiva. Por eso las notificaciones push (que despiertan la app) son críticas.
4. **Funciona offline solo parcialmente.** La app puede cachear su interfaz y datos críticos, pero no todas las acciones funcionan sin red. El manejo de pérdida de conexión debe ser explícito.
5. **El sonido de notificación depende del sistema operativo**, no de la app. No podemos forzar volúmenes ni tonos custom.

---

## 4. Horario operativo

- **Días:** martes, jueves, viernes y sábado.
- **Horario:** 6:00 PM a 11:00 PM (hora de Perú, UTC-5).
- El driver solo puede marcarse como "disponible" dentro de este horario.
- Fuera de horario, la app se puede abrir para revisar historial y estadísticas, pero no hay bandeja de pedidos activa.

---

## 5. Reglas de negocio clave que el driver debe conocer

### 5.1 · Capacidad máxima

Cada driver puede tener como máximo **3 pedidos activos simultáneos** (aceptados pero no entregados). Al llegar al límite, no puede aceptar nuevos pedidos hasta completar una entrega.

### 5.2 · Estados visuales del pedido en la bandeja

El color de un pedido depende de cuánto tiempo falta para que esté listo en el restaurante:

| Estado | Tiempo restante | Dónde aparece |
|---|---|---|
| 🔴 Rojo | 0 min o vencido ("¡Salir ya!") | Bandeja principal — tarjeta destacada, botón con pulso |
| 🟡 Amarillo | 1 a 10 minutos | Bandeja principal — tarjeta accionable |
| 🟢 Verde | Más de 10 minutos | Sección colapsada "Próximos pedidos" — no aceptable aún |

### 5.3 · Ventana de aparición en bandeja

Los pedidos no aparecen todos al mismo tiempo. Aparecen en la bandeja accionable **10 minutos antes del tiempo estimado**:

| Tiempo de preparación | Cuándo aparece en bandeja | Estado inicial |
|---|---|---|
| 10 min | Inmediatamente al crearse | Amarillo |
| 20 min | A los 10 min de creado | Amarillo |
| 30 min | A los 20 min de creado | Amarillo |

Mientras no haya llegado su ventana, el pedido vive en "Próximos pedidos" en estado verde, visible pero no aceptable.

### 5.4 · Adelantar (disparado por el restaurante)

Si el restaurante avisa que el pedido está listo antes de tiempo, un pedido verde puede saltar inmediatamente a la bandeja principal como amarillo. El driver recibe notificación push informativa. No es obligatorio aceptarlo de inmediato — es una invitación, no una orden.

### 5.5 · Prórroga (disparada por el restaurante)

Si el restaurante necesita más tiempo (+5 o +10 min), el tiempo estimado se recalcula. Dos casos:
- El pedido amarillo vuelve a verde (vuelve a "Próximos pedidos") si la prórroga lo devuelve a más de 10 min.
- El pedido permanece amarillo si la prórroga no lo devuelve a verde.
- Si el driver ya aceptó, el pedido queda en su cola con el nuevo tiempo. Recibe notificación.

### 5.6 · Race condition entre drivers

Si ambos drivers intentan aceptar el mismo pedido al mismo tiempo, solo uno lo obtiene. El otro ve desaparecer la tarjeta con mensaje breve: "Este pedido ya fue tomado". No hay penalización.

### 5.7 · Liquidación de efectivo

El driver retiene el efectivo cobrado durante el turno. En cada regreso al restaurante correspondiente, entrega el acumulado y confirma el monto. Si el restaurante reporta diferencia, **el driver no discute en el local** — el admin Tindivo resuelve.

### 5.8 · Datos del cliente — siempre del papelito físico

El driver nunca ve el teléfono ni la dirección del cliente antes de llegar al restaurante. Esos datos viajan en un **papelito de color físico** que el cajero entrega junto con la bolsa. Cuando el driver confirma que tiene el pedido, los digita manualmente en la app.

---

## 6. Mapa de épicas

| Épica | Foco |
|---|---|
| EPIC-D1 | Instalación y primer acceso |
| EPIC-D2 | Permisos del navegador y configuración del dispositivo |
| EPIC-D3 | Acceso y sesión |
| EPIC-D4 | Disponibilidad y panel principal |
| EPIC-D5 | Bandeja de pedidos disponibles |
| EPIC-D6 | Notificaciones push |
| EPIC-D7 | Cola personal de pedidos activos |
| EPIC-D8 | Flujo en el restaurante (los 4 momentos) |
| EPIC-D9 | Entrega al cliente |
| EPIC-D10 | Liquidación de efectivo con el restaurante |
| EPIC-D11 | Histórico y estadísticas personales |
| EPIC-D12 | Conectividad y estado offline |
| EPIC-D13 | Actualizaciones de la app |

---

## 7. Historias de usuario

### Convenciones
- **P0** crítico · **P1** importante · **P2** deseable.
- Criterios de aceptación verificables, escritos en español claro.

---

## EPIC-D1 · Instalación y primer acceso

### HU-D-001 · Acceder a la app por primera vez desde un link
**Como** motorizado contratado por Tindivo,
**quiero** abrir la app desde un link que me envían por WhatsApp,
**para** empezar a trabajar sin tener que buscarla en Play Store.

**Prioridad:** P0

**Criterios de aceptación:**
- La app se abre directamente en el navegador al tocar un link.
- No requiere registrarse: las credenciales las entrega Tindivo previamente.
- La primera pantalla es el formulario de login, con el logo Tindivo visible.
- El tiempo de carga inicial de la pantalla de login es máximo 4 segundos en conexión 4G.

---

### HU-D-002 · Invitar a instalar la PWA en pantalla de inicio
**Como** producto,
**quiero** guiar al driver a instalar la PWA en su pantalla de inicio,
**para** que las notificaciones push funcionen de forma confiable y la app se sienta como una app nativa.

**Prioridad:** P0

**Criterios de aceptación:**
- Después del primer login exitoso, se muestra una pantalla de bienvenida con instrucciones claras y visuales para "Instalar la app".
- La pantalla explica en lenguaje simple **por qué** es importante instalar (notificaciones, rapidez, funcionar siempre).
- Se muestra el prompt del navegador para "Agregar a pantalla de inicio" cuando sea posible.
- Si el driver pospone la instalación, un recordatorio visible aparece cada sesión hasta que la instale.
- Se detecta si la app ya está instalada y en ese caso no se muestra el prompt.

---

### HU-D-003 · Detectar navegador no compatible
**Como** producto,
**quiero** detectar si el driver abrió la app en un navegador poco compatible,
**para** evitar problemas de funcionamiento desde el inicio.

**Prioridad:** P1

**Criterios de aceptación:**
- Si se detecta un navegador no recomendado (por ejemplo, versiones muy antiguas), se muestra mensaje amable: "Te recomendamos usar Chrome para que todo funcione bien. [Abrir en Chrome]".
- Se proporciona un link directo para reabrir la app en Chrome.
- Navegadores soportados oficialmente: Chrome 100+ en Android, Safari 16.4+ en iOS (si aplica).

---

## EPIC-D2 · Permisos del navegador y configuración

### HU-D-004 · Pedir permiso de notificaciones push
**Como** producto,
**quiero** solicitar permiso de notificaciones push al driver,
**para** poder avisarle de pedidos nuevos incluso con la app cerrada.

**Prioridad:** P0

**Criterios de aceptación:**
- Tras el onboarding inicial, la app pide permiso de notificaciones mediante el prompt nativo del navegador.
- Antes de mostrar el prompt del navegador, se muestra una pantalla previa explicando en lenguaje claro: "Necesitamos enviarte notificaciones cuando haya un pedido disponible. Acepta para recibir alertas aunque tengas el celular bloqueado".
- Esta pantalla previa aparece solo una vez — si el driver la acepta, se muestra el prompt del navegador; si la rechaza, se muestra más tarde con otra explicación.
- El estado del permiso (concedido / denegado / pendiente) se detecta al entrar a la app cada vez.

---

### HU-D-005 · Detectar y guiar cuando el permiso fue denegado
**Como** producto,
**quiero** detectar cuando el driver denegó el permiso de notificaciones,
**para** ayudarlo a activarlo manualmente desde la configuración del navegador.

**Prioridad:** P0

**Criterios de aceptación:**
- Si los permisos de notificación están en estado "denegado", aparece bandera visible en la parte superior de la app: "⚠️ Las notificaciones están desactivadas. Sin ellas no recibirás alertas de pedidos nuevos".
- Al tocar la bandera se muestra un tutorial paso a paso (con capturas específicas de Chrome Android) para activar las notificaciones desde los ajustes del navegador.
- La bandera no desaparece hasta que los permisos estén concedidos.

---

### HU-D-006 · Pedir permiso de ubicación
**Como** producto,
**quiero** solicitar permiso de ubicación al driver,
**para** registrar métricas de tiempo de tránsito y tener contexto operativo.

**Prioridad:** P1

**Criterios de aceptación:**
- El permiso de ubicación se solicita la primera vez, con explicación previa: "Nos ayuda a medir cuánto tardas entre puntos, para mejorar el servicio".
- Si el driver rechaza, la app sigue funcionando normalmente — la ubicación es opcional en MVP.
- La ubicación se captura solo cuando la app está activa, no en segundo plano.

---

### HU-D-007 · Guía de configuración de batería
**Como** producto,
**quiero** guiar al driver a configurar el celular para que la app no se duerma,
**para** asegurar que las notificaciones lleguen rápidamente.

**Prioridad:** P0

**Criterios de aceptación:**
- Durante el onboarding inicial se muestra una sección "Preparar tu celular" con instrucciones visuales para:
  - Permitir que Chrome (o el navegador) ignore la optimización de batería.
  - Mantener los datos móviles activos.
  - Permitir sonidos de notificación con el celular en silencio (opcional).
- Cada paso tiene captura visual y botón "Ya lo hice".
- La sección se puede reabrir desde el menú de configuración en cualquier momento.

---

## EPIC-D3 · Acceso y sesión

### HU-D-008 · Iniciar sesión con credenciales entregadas
**Como** motorizado,
**quiero** ingresar con el usuario y contraseña que me entregó Tindivo,
**para** acceder a la app sin tener que registrarme.

**Prioridad:** P0

**Criterios de aceptación:**
- Formulario simple con dos campos: usuario y contraseña.
- No hay autoregistro.
- Tras 5 intentos fallidos consecutivos el formulario se bloquea 60 segundos.
- Los errores son genéricos: "Usuario o contraseña incorrectos".

---

### HU-D-009 · Permanecer autenticado entre sesiones
**Como** motorizado,
**quiero** no tener que loguearme cada vez que abro la app,
**para** empezar el turno de inmediato.

**Prioridad:** P0

**Criterios de aceptación:**
- Una vez autenticado, la sesión permanece activa durante 7 días.
- Cerrar el navegador o reiniciar el celular no cierra la sesión.
- Si la sesión expira, al abrir la app el driver es devuelto al login.

---

### HU-D-010 · Cerrar sesión manualmente
**Como** motorizado,
**quiero** poder cerrar sesión cuando lo necesite,
**para** proteger el acceso si presto el celular o cambio de equipo.

**Prioridad:** P1

**Criterios de aceptación:**
- Existe botón "Cerrar sesión" en el menú de configuración.
- Pide confirmación antes de ejecutar.
- Al confirmar, devuelve al formulario de login.

---

### HU-D-011 · Recuperar contraseña
**Como** motorizado que olvidó su contraseña,
**quiero** saber cómo recuperar el acceso,
**para** no quedarme sin poder trabajar.

**Prioridad:** P1

**Criterios de aceptación:**
- En el login existe un link "Olvidé mi contraseña".
- Al tocarlo, se muestran instrucciones: "Llama a Tindivo al 906 550 166".
- En esta versión no hay flujo automático — la gestiona el admin.

---

## EPIC-D4 · Disponibilidad y panel principal

### HU-D-012 · Marcar disponibilidad del turno
**Como** motorizado,
**quiero** indicar si estoy disponible para recibir pedidos,
**para** controlar cuándo recibo alertas.

**Prioridad:** P0

**Criterios de aceptación:**
- Toggle grande "Disponible / Offline" es el elemento principal del panel de inicio.
- El toggle solo es activable dentro del horario operativo.
- Fuera de horario aparece desactivado con mensaje: "El servicio opera mar, jue, vie y sáb de 6 PM a 11 PM".
- El inicio y fin de turno se registran automáticamente como métrica.

---

### HU-D-013 · Ver contadores del turno
**Como** motorizado,
**quiero** ver mis pedidos completados, activos y efectivo pendiente en el panel principal,
**para** tener visibilidad de mi jornada sin navegar.

**Prioridad:** P1

**Criterios de aceptación:**
- El panel principal muestra tres indicadores claros:
  - "Pedidos completados hoy": número grande
  - "Pedidos activos": X / 3 (se pone en rojo al llegar a 3/3)
  - "Efectivo pendiente devolver": monto total acumulado
- Los datos se actualizan en tiempo real.

---

### HU-D-014 · Ver recordatorios de liquidación pendiente
**Como** motorizado,
**quiero** ver qué restaurantes me deben recibir efectivo,
**para** no olvidar entregarlo en mi siguiente visita.

**Prioridad:** P0

**Criterios de aceptación:**
- Si hay efectivo pendiente, aparece tarjeta destacada con cada restaurante y monto:
  - "⚠️ EL BUEN SABOR — Pendiente: S/ 47.00" + botón [ENTREGAR EFECTIVO]
- Se listan todos los restaurantes con deuda pendiente, ordenados por monto descendente.
- Al tocar el botón, se abre el flujo de liquidación para ese restaurante específico.

---

## EPIC-D5 · Bandeja de pedidos disponibles

### HU-D-015 · Ver pedidos aceptables ahora
**Como** motorizado,
**quiero** ver los pedidos que puedo aceptar en este momento,
**para** elegir cuál recojo.

**Prioridad:** P0

**Criterios de aceptación:**
- La bandeja principal muestra solo pedidos dentro de la ventana accionable (rojos y amarillos).
- Cada tarjeta muestra:
  - Nombre del restaurante con su color de acento
  - Chip de tiempo (rojo o amarillo)
  - Método de pago y monto
  - Si es efectivo: "🛍 Vuelto ya en la bolsa"
- La tarjeta NO muestra teléfono ni dirección del cliente (esos datos vienen en el papelito).
- Los pedidos se ordenan: rojos primero, luego amarillos por tiempo de llegada ascendente.

---

### HU-D-016 · Distinguir pedidos críticos visualmente
**Como** motorizado,
**quiero** identificar con claridad qué pedidos están atrasados,
**para** priorizar al elegir.

**Prioridad:** P0

**Criterios de aceptación:**
- Pedidos rojos (vencidos) se muestran con fondo rosado claro, borde izquierdo rojo y botón con pulso sutil.
- Pedidos amarillos (1-10 min) se muestran con fondo neutro, chip ámbar, botón naranja estándar.
- El texto del chip es claro: rojo dice "¡Salir ya!" o "Hace X min", amarillo dice "Recoger en X min".

---

### HU-D-017 · Ver próximos pedidos en sección colapsada
**Como** motorizado,
**quiero** poder ver qué pedidos vienen más adelante,
**para** planificar mi próximo movimiento.

**Prioridad:** P1

**Criterios de aceptación:**
- Al pie de la bandeja hay una sección colapsable: "Próximos pedidos (N)".
- Al expandirla se muestran los pedidos verdes sin botón [ACEPTAR].
- Cada tarjeta muestra nombre del restaurante, chip verde "En X min", método de pago, y nota "disponible en Y min".
- La barra de acento de estas tarjetas es gris claro, no el color del restaurante — para enfatizar que no son accionables todavía.

---

### HU-D-018 · Aceptar un pedido con un toque
**Como** motorizado,
**quiero** aceptar un pedido con una sola acción,
**para** ser rápido y no perderlo.

**Prioridad:** P0

**Criterios de aceptación:**
- Cada tarjeta aceptable tiene botón [ACEPTAR] grande, mínimo 56px de alto.
- El botón es tocable aun con guantes livianos (área de toque generosa).
- Al tocarlo el pedido se mueve a "Mis pedidos" y el driver es redirigido automáticamente al detalle.
- El pedido desaparece de la bandeja inmediatamente.

---

### HU-D-019 · Manejar el conflicto cuando otro driver aceptó primero
**Como** motorizado,
**quiero** ver claramente cuando un pedido ya fue tomado,
**para** no confundirme ni reclamar.

**Prioridad:** P0

**Criterios de aceptación:**
- Si ambos drivers tocan [ACEPTAR] del mismo pedido al mismo tiempo, el backend decide por orden.
- El driver perdedor ve la tarjeta desaparecer con animación suave.
- Aparece mensaje breve: "Este pedido ya fue tomado."
- No hay mensaje negativo ni penalización.

---

### HU-D-020 · Respetar límite de capacidad
**Como** producto,
**quiero** limitar al driver a máximo 3 pedidos activos,
**para** evitar que un pedido se quede sin atención real.

**Prioridad:** P0

**Criterios de aceptación:**
- Al alcanzar 3 pedidos activos, los botones [ACEPTAR] de la bandeja se desactivan.
- Aparece mensaje: "Estás al límite de capacidad (3/3). Completa una entrega para recibir nuevos."
- La sección "Próximos pedidos" sigue siendo visible para referencia.
- Al completar una entrega, los botones se reactivan automáticamente.

---

## EPIC-D6 · Notificaciones push

### HU-D-021 · Recibir notificación cuando un pedido entra en bandeja
**Como** motorizado,
**quiero** recibir una alerta fuerte cuando hay un pedido disponible,
**para** verlo aunque tenga el celular bloqueado o la app cerrada.

**Prioridad:** P0

**Criterios de aceptación:**
- Cada vez que un pedido pasa a estar "dentro de ventana" para este driver, ambos drivers disponibles reciben notificación push.
- La notificación incluye nombre del restaurante, tiempo restante y método de pago.
- La notificación tiene sonido fuerte y vibración (dentro de lo que permite el sistema operativo).
- Al tocar la notificación, se abre la app directamente en la bandeja.

---

### HU-D-022 · Recibir notificación de adelantar
**Como** motorizado,
**quiero** saber cuando un restaurante adelanta un pedido verde,
**para** considerar ir ahora si me conviene.

**Prioridad:** P0

**Criterios de aceptación:**
- Cuando el restaurante usa "Pedido listo antes de tiempo", el driver recibe push: "[Restaurante] ya tiene tu pedido listo. Puedes ir antes si puedes".
- La notificación tiene tono informativo, no urgente.
- En la bandeja, el pedido se mueve de "Próximos" a la sección principal con animación suave.

---

### HU-D-023 · Recibir notificación de prórroga
**Como** motorizado,
**quiero** saber cuando un restaurante pide más tiempo,
**para** ajustar mi plan.

**Prioridad:** P0

**Criterios de aceptación:**
- Cuando el restaurante solicita prórroga, el driver recibe push: "[Restaurante] necesita X minutos más. Nuevo tiempo: [hora]".
- Si el pedido ya estaba aceptado, la cola personal se actualiza con el nuevo tiempo.
- Si no estaba aceptado y la prórroga lo devuelve a verde, vuelve a "Próximos pedidos".

---

### HU-D-024 · Recibir notificación de cancelación
**Como** motorizado ya en camino al restaurante,
**quiero** ser alertado de inmediato si el restaurante cancela el pedido,
**para** no perder tiempo llegando a un local que ya no tiene pedido.

**Prioridad:** P0

**Criterios de aceptación:**
- Si el restaurante cancela mientras el driver está en `heading_to_restaurant`, el driver recibe push urgente con sonido fuerte: "❌ [Restaurante] canceló el pedido #ABC123".
- El pedido desaparece automáticamente de la cola del driver.
- Se muestra mensaje visible al abrir la app: "Este pedido fue cancelado por el restaurante".

---

### HU-D-025 · Notificaciones diferenciadas por tipo
**Como** motorizado,
**quiero** distinguir al instante qué tipo de notificación recibí,
**para** reaccionar con la urgencia correcta.

**Prioridad:** P1

**Criterios de aceptación:**
- Cada tipo de notificación tiene ícono y título distintivo:
  - Pedido nuevo disponible: 🛵 urgente
  - Adelantar: ⚡ informativo
  - Prórroga: ⏱ informativo
  - Cancelación: ❌ urgente
- En la medida que el sistema operativo lo permita, se usan canales distintos para que el driver pueda configurar prioridades diferenciadas.

---

## EPIC-D7 · Cola personal de pedidos activos

### HU-D-026 · Ver mis pedidos aceptados ordenados por urgencia
**Como** motorizado,
**quiero** ver mis pedidos activos con los más urgentes primero,
**para** saber a dónde ir ahora.

**Prioridad:** P0

**Criterios de aceptación:**
- La vista "Mis pedidos" ordena:
  1. Pedidos en "Esperando en local" (siempre arriba, borde naranja).
  2. Pedidos con tiempo vencido (borde rojo).
  3. Resto por tiempo estimado ascendente.
- Cada tarjeta muestra: nombre del restaurante, chip del estado actual, tiempo restante, método de pago y monto.

---

### HU-D-027 · Ver timer de espera en el local
**Como** motorizado esperando en un restaurante,
**quiero** ver cuánto tiempo llevo esperando,
**para** saber si estoy gastando demasiado tiempo.

**Prioridad:** P1

**Criterios de aceptación:**
- En pedidos en estado "Esperando en local", debajo del chip de estado se muestra timer "Esperando hace X min".
- El color del timer cambia por rangos:
  - 0-5 min: gris
  - 5-10 min: ámbar
  - +10 min: rojo
- El tiempo se captura como métrica de performance del restaurante.

---

### HU-D-028 · Acceder al detalle con un toque
**Como** motorizado,
**quiero** abrir el detalle de cualquier pedido activo,
**para** avanzar su flujo o revisar información.

**Prioridad:** P0

**Criterios de aceptación:**
- Cada tarjeta tiene botón "Ver detalles".
- En pedidos urgentes (esperando en local, vencidos), el botón es naranja sólido.
- En pedidos normales, el botón es outline gris.

---

## EPIC-D8 · Flujo en el restaurante (los 4 momentos)

### HU-D-029 · Zona fija siempre visible con información crítica
**Como** motorizado en cualquier momento del flujo,
**quiero** tener siempre visible el nombre del restaurante, monto a cobrar y método de pago,
**para** no olvidar cuánto cobrar ni a nombre de quién.

**Prioridad:** P0

**Criterios de aceptación:**
- En los 4 momentos, la parte superior del detalle muestra zona fija con:
  - Nombre del restaurante + color de acento
  - Dirección del restaurante
  - Teléfono del restaurante
  - Método de pago del cliente
  - Monto
  - Vuelto si aplica ("🛍 Vuelto en la bolsa: S/ X")
- Esta zona no desaparece ni se colapsa entre transiciones.
- Un stepper visual de los 4 momentos está presente, mostrando el actual resaltado.

---

### HU-D-030 · Momento 1 · Marcar llegada al restaurante
**Como** motorizado que llegó al local,
**quiero** indicarle a la app que llegué,
**para** avanzar al siguiente estado.

**Prioridad:** P0

**Criterios de aceptación:**
- En estado "En camino al local", el detalle muestra mensaje: "Dirígete al restaurante. Lista a las HH:MMpm (en X min)".
- Si hay prórroga activa, se muestra nota: "⚠️ Restaurante pidió X min más — lista a las HH:MMpm".
- Botón grande naranja [LLEGUÉ AL RESTAURANTE →], mínimo 56px alto.

---

### HU-D-031 · Pregunta "¿El pedido está listo?"
**Como** motorizado,
**quiero** indicar si el pedido ya está listo cuando llego,
**para** saltar el paso de espera si no es necesario.

**Prioridad:** P0

**Criterios de aceptación:**
- Al tocar [LLEGUÉ AL RESTAURANTE], aparece hoja inferior (bottom sheet) con la pregunta: "¿El pedido está listo?".
- Dos opciones: [✓ Sí, tengo el pedido] en verde, [⏳ No, estoy esperando] en gris.
- Si selecciona "Sí", pasa directo al Momento 3 (digitar datos).
- Si selecciona "No", pasa al Momento 2 (timer de espera).

---

### HU-D-032 · Momento 2 · Esperar con timer visible
**Como** motorizado esperando que el pedido esté listo,
**quiero** ver cuánto tiempo llevo esperando,
**para** tener contexto y que Tindivo mida al restaurante.

**Prioridad:** P0

**Criterios de aceptación:**
- Al entrar al Momento 2 se inicia un timer en formato MM:SS grande y monoespaciado (mínimo 48px).
- El color del timer cambia automáticamente:
  - 0-5 min: gris
  - 5-10 min: ámbar
  - +10 min: rojo
- Se muestra nota: "ⓘ Tindivo registra el tiempo de espera".
- Botón grande [YA ME ENTREGARON EL PEDIDO] para avanzar al Momento 3.

---

### HU-D-033 · Momento 3 · Digitar datos del cliente
**Como** motorizado con el pedido en mano,
**quiero** registrar teléfono y dirección del cliente leyendo el papelito,
**para** que el sistema envíe WhatsApp al cliente y yo tenga navegación.

**Prioridad:** P0

**Criterios de aceptación:**
- La pantalla muestra visualmente el color del papelito (rosado, azul, verde, etc., según el restaurante) como recordatorio.
- Campo teléfono: prefijo "+51" fijo, 9 dígitos, teclado numérico automático.
- Campo dirección: textarea libre con placeholder "Av. Larco 234, frente al grifo".
- Botón [INICIAR ENTREGA →] solo se activa cuando ambos campos son válidos.
- Validación: teléfono debe ser exactamente 9 dígitos numéricos.

---

### HU-D-034 · Iniciar entrega y enviar WhatsApp al cliente
**Como** motorizado,
**quiero** confirmar que voy a iniciar la entrega,
**para** que el cliente sepa que viene su pedido.

**Prioridad:** P0

**Criterios de aceptación:**
- Al tocar [INICIAR ENTREGA]:
  - Sistema guarda teléfono y dirección.
  - El estado pasa a "En entrega".
  - Sistema envía WhatsApp automático al cliente desde número Tindivo con link de tracking.
  - El botón de navegación queda habilitado.
- Se muestra confirmación: "✅ WhatsApp enviado al cliente".
- Si el envío de WhatsApp falla, la operación continúa pero se registra la falla en métricas.

---

## EPIC-D9 · Entrega al cliente

### HU-D-035 · Navegar al cliente desde la app
**Como** motorizado,
**quiero** abrir Google Maps o Waze directamente con la dirección del cliente,
**para** no tener que copiar y pegar.

**Prioridad:** P0

**Criterios de aceptación:**
- En el Momento 4, botón primario naranja [🗺 NAVEGAR AL CLIENTE →] abre la app de mapas instalada por defecto con la dirección como destino.
- Si hay varias apps de mapas instaladas, Android muestra el selector nativo (Google Maps, Waze, etc.).
- Si la dirección ingresada no es reconocible, se muestra mapa de la zona aproximada.

---

### HU-D-036 · Llamar al cliente desde la app
**Como** motorizado,
**quiero** llamar al cliente con un toque,
**para** avisar que llegué o confirmar la dirección.

**Prioridad:** P0

**Criterios de aceptación:**
- Botón secundario outline [📞 Llamar al cliente] abre el marcador del sistema con el número pre-cargado.
- Al regresar a la app tras la llamada, la pantalla del Momento 4 está intacta.

---

### HU-D-037 · Marcar pedido como entregado con confirmación
**Como** motorizado,
**quiero** marcar el pedido como entregado de forma segura,
**para** no cometer errores por toque accidental mientras conduzco.

**Prioridad:** P0

**Criterios de aceptación:**
- El botón [✓ PEDIDO ENTREGADO] es verde y está separado visualmente del resto con espaciado generoso (mínimo 48px de separación del siguiente elemento).
- Al tocarlo se pide confirmación explícita en hoja inferior: "¿Confirmas que entregaste el pedido?".
- Al confirmar:
  - Estado pasa a "Entregado".
  - Si el pago era efectivo no pagado, el monto se acumula al contador de "efectivo a entregar" del restaurante.
- El driver es devuelto a "Mis pedidos" con el pedido ya fuera de la lista activa.

---

## EPIC-D10 · Liquidación de efectivo con el restaurante

### HU-D-038 · Ver efectivo pendiente desglosado por restaurante
**Como** motorizado,
**quiero** ver cuánto debo entregar a cada restaurante,
**para** organizar mis visitas y no olvidar nada.

**Prioridad:** P0

**Criterios de aceptación:**
- En el panel principal, si hay efectivo pendiente, aparece lista desglosada.
- Cada ítem muestra:
  - Nombre del restaurante
  - Monto acumulado
  - Botón [ENTREGAR EFECTIVO]
- La lista se actualiza en tiempo real al completar cada entrega en efectivo.

---

### HU-D-039 · Registrar entrega de efectivo al restaurante
**Como** motorizado,
**quiero** confirmar cuánto efectivo estoy entregando a un restaurante,
**para** cerrar el ciclo de ese dinero.

**Prioridad:** P0

**Criterios de aceptación:**
- Al tocar [ENTREGAR EFECTIVO], la pantalla muestra:
  - Restaurante objetivo (nombre y dirección)
  - Monto acumulado sugerido (prellenado pero editable)
  - Campo de monto con signo S/
  - Botón [CONFIRMAR ENTREGA DE EFECTIVO]
- Al confirmar:
  - El restaurante recibe notificación en su app para validar.
  - El contador local del driver para ese restaurante se reinicia a cero.
  - Se muestra mensaje: "Esperando confirmación del restaurante".

---

### HU-D-040 · No discutir en el local si hay diferencia
**Como** producto,
**quiero** que el driver no tenga que lidiar con disputas en el local,
**para** proteger la relación operativa.

**Prioridad:** P0

**Criterios de aceptación:**
- En la pantalla de entrega de efectivo aparece nota explícita: "Si hay diferencia, el restaurante la reportará y el admin Tindivo la resolverá. No discutas en el local".
- Si el restaurante reporta diferencia posteriormente, el driver recibe notificación informativa: "Diferencia reportada en la entrega. El admin revisará y te contactará".

---

## EPIC-D11 · Histórico y estadísticas personales

### HU-D-041 · Ver pedidos completados del día
**Como** motorizado,
**quiero** revisar los pedidos que entregué hoy,
**para** verificar mi trabajo o consultar uno en particular.

**Prioridad:** P1

**Criterios de aceptación:**
- Existe vista "Historial del día" accesible desde menú.
- Lista todos los pedidos del turno con: ID, restaurante, cliente (teléfono), hora de entrega, método de pago, monto.
- Permite abrir el detalle de cualquier pedido en modo solo-lectura.

---

### HU-D-042 · Ver estadísticas del turno
**Como** motorizado,
**quiero** ver mi performance del turno,
**para** conocer mi jornada.

**Prioridad:** P2

**Criterios de aceptación:**
- Vista "Mi turno" muestra:
  - Total de pedidos entregados
  - Tiempo promedio de entrega
  - Total facturado (efectivo + Yape)
  - Tiempo total conectado como disponible
- Los datos son solo del turno actual, no acumulados históricos (eso lo ve el admin).

---

## EPIC-D12 · Conectividad y estado offline

### HU-D-043 · Mostrar estado de conexión claramente
**Como** motorizado,
**quiero** saber cuándo no tengo internet,
**para** no pensar que la app está fallando.

**Prioridad:** P0

**Criterios de aceptación:**
- Cuando el dispositivo pierde conexión, aparece banner visible en la parte superior: "Sin conexión a internet. Reintentando...".
- El banner desaparece automáticamente al recuperar la conexión, con mensaje breve: "Conectado de nuevo ✓".
- Las acciones críticas (aceptar, marcar llegada, entregar) se intentan sincronizar automáticamente al recuperar conexión.

---

### HU-D-044 · Reintentar acciones pendientes al recuperar conexión
**Como** motorizado,
**quiero** que mis acciones se guarden aunque pierda internet momentáneamente,
**para** no perder el progreso del pedido.

**Prioridad:** P1

**Criterios de aceptación:**
- Si el driver toca un botón crítico ([LLEGUÉ AL RESTAURANTE], [PEDIDO ENTREGADO], etc.) sin conexión, la acción queda en cola local.
- Al recuperar conexión, la acción se envía automáticamente.
- Mientras tanto, la UI refleja el cambio de estado optimistamente.
- Si la sincronización falla permanentemente, se avisa al driver.

---

### HU-D-045 · Ver la última información conocida sin conexión
**Como** motorizado sin conexión,
**quiero** poder seguir viendo mis pedidos activos,
**para** no perder contexto mientras se recupera la red.

**Prioridad:** P1

**Criterios de aceptación:**
- Las pantallas "Mis pedidos" y el detalle de cada pedido muestran la información disponible en caché cuando no hay conexión.
- Se indica claramente con un sello: "Información no actualizada — sin conexión".
- La bandeja de pedidos disponibles sí requiere conexión (no tiene sentido cachear pedidos disponibles que cambian a cada segundo).

---

## EPIC-D13 · Actualizaciones de la app

### HU-D-046 · Detectar y aplicar nuevas versiones de la PWA
**Como** producto,
**quiero** que el driver siempre tenga la última versión de la app,
**para** que no use versiones obsoletas con bugs conocidos.

**Prioridad:** P0

**Criterios de aceptación:**
- Cuando se detecta una nueva versión de la app, se muestra banner discreto: "Hay una nueva versión disponible. [Actualizar]".
- Al tocar "Actualizar", la app se recarga con la nueva versión.
- Si hay cambios críticos (obligatorios), la actualización se fuerza: banner no cerrable hasta actualizar.
- Las actualizaciones de la app NO interrumpen un flujo en curso — esperan a terminar el pedido activo.

---

### HU-D-047 · Ver qué versión tengo instalada
**Como** motorizado,
**quiero** saber qué versión de la app tengo,
**para** poder reportar bugs con contexto claro.

**Prioridad:** P2

**Criterios de aceptación:**
- En el menú de configuración aparece la versión actual visible: "Tindivo Driver v1.2.3".
- Se muestra también la fecha de la última actualización.

---

## 8. Requerimientos no funcionales específicos del driver

### RNF-D-001 · Rendimiento
- La app debe cargar en menos de **3 segundos** en conexión 4G.
- Las transiciones de estado críticas (aceptar pedido, marcar llegada, entregar) responden en menos de **1 segundo**.
- El envío de una notificación push desde que se dispara hasta que llega al celular del driver debe ser menor a **5 segundos**.

### RNF-D-002 · Consumo de batería
- El uso típico de la app durante un turno de 5 horas no debe consumir más del **15% de batería** de un dispositivo medio (asumiendo ubicación activa y pantalla encendida parcialmente).
- Se minimiza el polling innecesario; se privilegian notificaciones push y web sockets cuando estén disponibles.

### RNF-D-003 · Consumo de datos
- Un turno completo no debe consumir más de **50 MB** de datos móviles.
- Los assets estáticos se cachean para minimizar descargas repetidas.

### RNF-D-004 · Usabilidad en moto
- Todos los botones críticos tienen **al menos 56×56 píxeles** de área tocable.
- Los botones destructivos (cancelar, entregar) tienen confirmación explícita y están separados de otros elementos tocables por al menos 40px.
- Contraste de texto mínimo WCAG AAA en elementos críticos (para uso en exteriores con luz variable).
- Los montos, tiempos y números de pedido usan tipografía monoespaciada grande (mínimo 18px).

### RNF-D-005 · Modo oscuro y modo claro
- La app tiene modo oscuro por defecto, apropiado para uso nocturno (el horario operativo es 6pm-11pm).
- El driver puede cambiar manualmente entre claro y oscuro desde configuración.
- Ambos modos cumplen estándares de contraste.

### RNF-D-006 · Audio de notificaciones
- Las notificaciones críticas (pedido nuevo, cancelación) tienen sonido fuerte.
- Se intenta usar el canal de "alarma" del sistema operativo cuando sea posible, para que se escuche incluso con el celular en silencio (dentro de lo que permite el navegador).

### RNF-D-007 · Compatibilidad
- **Android:** Chrome 100+, Samsung Internet 20+, Edge 100+.
- **iOS:** Safari 16.4+ (si aplica, no es prioridad del MVP).
- **Tamaño de pantalla:** desde 360×640 px hasta 430×932 px.
- **Orientación:** solo vertical. El landscape no se optimiza.

### RNF-D-008 · Instalación
- La PWA cumple todos los criterios técnicos para ser instalable (manifest, service worker, HTTPS).
- El prompt de instalación aparece proactivamente la primera vez.
- Una vez instalada, el ícono en la pantalla de inicio es de alta resolución y reconocible.

### RNF-D-009 · Seguridad
- Las contraseñas nunca se almacenan en texto plano.
- Toda comunicación con el servidor es cifrada.
- La sesión se invalida tras 7 días sin actividad.
- Si un driver pierde el celular, el admin puede invalidar la sesión remotamente (historia futura pero arquitectura preparada).

### RNF-D-010 · Idioma y tono
- Todo el contenido está en español peruano informal (tuteo).
- Los mensajes de error son amables: "Algo salió mal, intenta de nuevo en un momento" en lugar de códigos técnicos.
- Se evitan tecnicismos. Al driver no se le habla de "estado del pedido" sino de "tu pedido está en camino", por ejemplo.

---

## 9. Flujos completos — cómo se encadenan las historias

### Flujo A · Día normal de trabajo (caso feliz)

1. 5:55 PM — Carlos abre la PWA desde su celular. Está en horario.
2. Toca el toggle "Disponible". Su turno arranca.
3. 6:12 PM — Suena notificación fuerte: "EL BUEN SABOR · Recoger en 3 min · Efectivo S/ 45".
4. Toca la notificación. La app abre la bandeja con el pedido en amarillo.
5. Toca [ACEPTAR]. Es redirigido al detalle del pedido.
6. Ve la dirección del restaurante en la zona fija: "Av. España 520".
7. Arranca en su moto.
8. Llega al restaurante. Toca [LLEGUÉ AL RESTAURANTE].
9. Aparece bottom sheet: "¿El pedido está listo?". Responde "Sí".
10. El cajero le entrega la bolsa + papelito rosado.
11. Lee el papelito: "Av. Larco 234, 2do piso - 987654321".
12. Digita los datos en la app. Toca [INICIAR ENTREGA].
13. Se envía WhatsApp automático al cliente.
14. Toca [NAVEGAR AL CLIENTE]. Se abre Google Maps.
15. Llega al cliente, entrega la bolsa, cobra los S/ 45.
16. Vuelve a la app. Toca [PEDIDO ENTREGADO]. Confirma.
17. El monto de S/ 45 se acumula al "Efectivo pendiente - EL BUEN SABOR".
18. En su siguiente visita al local, toca [ENTREGAR EFECTIVO] de EL BUEN SABOR.
19. Confirma el monto. El cajero recibe la notificación y confirma.
20. El contador se reinicia a cero.

### Flujo B · Esperando en el restaurante

1. Carlos acepta un pedido de EL BUEN SABOR que decía estar listo en 5 min.
2. Llega al restaurante. Toca [LLEGUÉ AL RESTAURANTE].
3. Bottom sheet: "¿El pedido está listo?". Responde "No, estoy esperando".
4. Pasa al Momento 2. El timer arranca en 00:00.
5. Minuto 4: el timer aún está en gris.
6. Minuto 6: el timer cambia a ámbar.
7. Minuto 11: el timer está en rojo. Tindivo está registrando este tiempo como métrica del restaurante.
8. Minuto 13: el cajero por fin le entrega la bolsa. Carlos toca [YA ME ENTREGARON EL PEDIDO].
9. Pasa al Momento 3 y continúa el flujo normal.

### Flujo C · Conflicto con el otro driver

1. Carlos y Juan (el otro driver) están ambos disponibles.
2. Entra un pedido nuevo a la bandeja. Ambos reciben la notificación.
3. Carlos toca [ACEPTAR] a las 18:45:22.341.
4. Juan toca [ACEPTAR] a las 18:45:22.512 (190 ms después).
5. El sistema asigna el pedido a Carlos.
6. Juan ve la tarjeta desaparecer con animación suave.
7. Juan ve mensaje: "Este pedido ya fue tomado".
8. No hay penalización. Sigue esperando el siguiente pedido.

### Flujo D · Cancelación durante "en camino"

1. Carlos aceptó un pedido y está en moto hacia el restaurante.
2. A mitad de camino, el restaurante cancela.
3. Carlos recibe push urgente con sonido fuerte: "❌ EL BUEN SABOR canceló el pedido #ABC123".
4. Se detiene, abre la app. El pedido ya no está en su cola.
5. Ve mensaje visible: "Este pedido fue cancelado por el restaurante".
6. Puede seguir trabajando con los otros pedidos o volver a la bandeja.

### Flujo E · Sin conexión momentánea

1. Carlos está en una zona con mala señal.
2. Termina una entrega y toca [PEDIDO ENTREGADO].
3. La app muestra banner: "Sin conexión. Reintentando...".
4. La UI refleja el cambio localmente (el pedido sale de "Mis pedidos").
5. A los 30 segundos recupera señal.
6. La acción se sincroniza automáticamente.
7. Aparece confirmación breve: "Conectado de nuevo ✓".

---

## 10. Supuestos y decisiones pendientes

### Supuestos actuales
- Hay exactamente 2 drivers, ambos de confianza directa con Tindivo.
- No existe validación de geolocalización al marcar "llegué al restaurante" — se confía en el driver.
- El driver siempre tiene un smartphone Android con Chrome o similar.
- El horario es fijo; no hay turnos distintos por día.
- La PWA se instala desde un link que Tindivo envía por WhatsApp.
- El cliente final no usa app — solo recibe WhatsApp desde número Tindivo.

### Decisiones pendientes (por resolver antes del lanzamiento o en fases posteriores)
1. ¿La PWA debe intentar funcionar en iOS desde el día 1, o priorizamos 100% Android?
2. ¿La app debería capturar la ubicación del driver en tiempo real para que el cliente pueda ver dónde está su pedido?
3. ¿Se permite que el driver rechace un pedido ya aceptado por alguna razón (moto descompuesta, emergencia)? ¿Con qué consecuencias?
4. ¿Debe haber un sistema de pausas durante el turno? (Cenar, ir al baño, combustible).
5. ¿Qué pasa si el driver termina el turno con pedidos activos aún no entregados?
6. ¿Qué pasa si el cliente no abre la puerta / no responde en la dirección? ¿Flujo de "entrega fallida"?
7. ¿El driver debe poder adjuntar foto del pedido entregado como comprobante?
8. ¿Debería existir un chat directo entre driver y restaurante dentro de la app para casos puntuales?
9. ¿Qué hacer si el driver pierde el papelito físico con los datos del cliente?
10. ¿Se registra el kilómetro recorrido del driver para cálculo de compensación?

---

## 11. Resumen priorizado

| Prioridad | Cantidad | Áreas cubiertas |
|---|---|---|
| **P0** | 31 historias | Core: instalación, login, bandeja, aceptar, 4 momentos, entrega, liquidación, push, conectividad |
| **P1** | 13 historias | Calidad de vida: logout, histórico del día, timer de espera, navegador compatible, recordatorios |
| **P2** | 3 historias | Estadísticas del turno, versión instalada, notificaciones diferenciadas |

**Total:** 47 historias + 10 requerimientos no funcionales.

### Estimación de alcance

Con un equipo de 2-3 personas enfocado solo en esta app (sin contar backend compartido con la del restaurante), el MVP se puede construir en **7–9 semanas**, distribuidas aproximadamente así:

- **Semanas 1-2:** Setup de PWA, autenticación, instalación, permisos, onboarding (EPIC-D1 a D3)
- **Semanas 3-4:** Panel principal, bandeja de pedidos, aceptar, cola personal (EPIC-D4 a D7)
- **Semanas 5-6:** Los 4 momentos, entrega al cliente (EPIC-D8, D9)
- **Semana 7:** Notificaciones push, liquidación de efectivo (EPIC-D6, D10)
- **Semana 8:** Estado offline, actualizaciones, estadísticas (EPIC-D11 a D13)
- **Semana 9:** QA integral, pruebas en campo con los drivers reales, ajustes

---

## 12. Consideraciones especiales por ser PWA

Esta sección es un checklist específico para asegurar que la naturaleza PWA no genere problemas operativos en producción.

### 12.1 · Checklist técnico de instalabilidad
- [ ] Manifest declarado con nombre, íconos, color de tema, modo standalone.
- [ ] Service Worker registrado y funcionando.
- [ ] HTTPS obligatorio (excepto localhost en desarrollo).
- [ ] Íconos en múltiples tamaños (192, 256, 384, 512 px).
- [ ] Splash screen personalizado al abrir desde pantalla de inicio.
- [ ] Nombre y descripción claros en el manifest.

### 12.2 · Checklist de notificaciones
- [ ] Suscripción a Web Push configurada correctamente.
- [ ] Endpoint de envío en backend preparado para manejar ambos drivers.
- [ ] Sonido de notificación fuerte y distintivo (dentro de lo permitido por SO).
- [ ] Categorías de notificación distinguibles (pedido nuevo, cancelación, prórroga).
- [ ] Acciones desde la notificación redirigen a la pantalla correcta.

### 12.3 · Checklist de experiencia offline
- [ ] Assets estáticos cacheados.
- [ ] Datos de pedidos activos disponibles en caché para lectura.
- [ ] Cola de acciones pendientes implementada.
- [ ] Indicador de estado de conexión siempre visible.
- [ ] Mensajes claros cuando algo requiere conexión.

### 12.4 · Checklist de onboarding
- [ ] Primer login guía a instalar la PWA.
- [ ] Flujo de permisos de notificación con contexto previo.
- [ ] Flujo de permisos de ubicación (opcional).
- [ ] Guía de configuración de batería.
- [ ] Tutorial inicial de uso de la app (opcional, puede ser video corto).

### 12.5 · Checklist de compatibilidad
- [ ] Probado en Chrome Android últimas 3 versiones mayores.
- [ ] Probado en Samsung Internet.
- [ ] Probado en dispositivos de diferentes fabricantes (Samsung, Xiaomi, Motorola).
- [ ] Probado con permisos denegados (degradación graceful).
- [ ] Probado con conexión 3G/4G/WiFi.
- [ ] Probado con datos móviles casi agotados (para ver comportamiento cuando ISP ralentiza).

---

**Con este documento completo, la app del motorizado queda definida funcional, técnica y operativamente — sin necesidad de referencias al stack tecnológico. La PWA es una decisión explícita del producto que se traduce en requisitos concretos (instalación, permisos, offline), no en una etiqueta técnica vacía.**
