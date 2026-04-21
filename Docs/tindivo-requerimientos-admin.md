# TINDIVO · Requerimientos — Panel Admin

> Documento de producto centrado exclusivamente en el panel web que usa el administrador de Tindivo. Sin código, sin stack, sin detalles de implementación — solo qué debe hacer el panel, para quién, bajo qué reglas, considerando su rol único como **centro de control de toda la operación**.

---

## 1. Qué es este panel y por qué es distinto

El panel admin es el **sistema nervioso central** de Tindivo. No es una herramienta administrativa tradicional tipo "ver reportes"; es una **sala de control operativa en vivo**. Mientras la app del restaurante crea pedidos y la app del motorizado los ejecuta, el panel admin es el lugar donde **una persona observa todo, previene problemas y resuelve emergencias**.

**Diferencias clave con las otras dos apps:**

| Dimensión | App Restaurante | App Driver | Panel Admin |
|---|---|---|---|
| Usuarios | Muchos (N restaurantes) | Pocos (2 en piloto) | **Uno solo** |
| Superficie | PWA desktop/tablet | PWA móvil | PWA multi-dispositivo |
| Momento de uso | Ráfagas cortas | Turno de 5h | Presencia constante durante el turno |
| Carga emocional | Operativa | Operativa | **Vigilante + resolutiva** |
| Acciones críticas | Crear, confirmar | Aceptar, entregar | **Intervenir, cancelar, desbloquear** |
| Costo de error | Bajo-medio | Medio | **Alto** (afecta a otros usuarios) |

Por su naturaleza, el panel admin debe cumplir dos cualidades que las otras apps no exigen en la misma intensidad:

- **Visibilidad total al instante**: en una sola mirada el admin debe saber "¿todo está bien o necesito intervenir?".
- **Autoridad máxima**: puede hacer cosas que nadie más puede (cancelar cualquier pedido, bloquear cuentas, editar datos cuando hay emergencia).

---

## 2. Quién lo usa

**Usuario único:** el administrador de Tindivo. En el piloto y primera fase, **es una sola persona** — probablemente tú mismo como fundador/dueño del servicio.

**Contexto real de uso:**

El admin tiene el panel abierto durante **todo el horario operativo** (mar/jue/vie/sáb 6pm–11pm). Lo consulta periódicamente, aunque probablemente no mira la pantalla los 5 minutos siguientes a cada cambio. Está haciendo otras cosas: cenando, viendo TV, atendiendo otro asunto, o moviéndose físicamente.

Por eso el panel debe:
- Funcionar en PC para vigilancia detallada cuando esté en escritorio.
- Funcionar en celular para cuando esté fuera de casa.
- Captar la atención cuando algo urgente pasa (alertas visuales destacadas), sin depender de que el admin mire la pantalla constantemente.

Cuando aparece una emergencia (driver no responde, diferencia de efectivo, restaurante sin atender), el admin debe **resolver rápido**: una llamada telefónica, una cancelación, un desbloqueo. Cada acción que requiera muchos clics es fricción que cuesta.

---

## 3. El admin como autoridad — principios operativos

Tres principios de diseño que deben impregnar todas las decisiones del panel:

### 3.1 · Visibilidad radical
El admin no debe "buscar" lo que está mal. Lo que está mal debe **gritar solo**. Los indicadores de problema son grandes, coloreados, y ubicados arriba y al frente.

### 3.2 · Intervención con fricción controlada
Las acciones del admin son poderosas pero irreversibles (cancelar un pedido, bloquear un restaurante). Cada una debe requerir confirmación explícita y dejar rastro. La velocidad importa, pero no a costa de errores.

### 3.3 · Inmutabilidad del historial
**Nada que ya ocurrió se puede editar.** Solo cancelar lo que está en curso. Los pedidos entregados, las liquidaciones pagadas, los timestamps de estado — todos son piedra. Si hay error, se documenta con una nota, no se reescribe.

---

## 4. Horario y presencia del admin

Aunque técnicamente el admin podría conectarse 24/7, su presencia efectiva es:

- **Activa:** mar/jue/vie/sáb, **5:30 PM a 12:00 AM** (media hora antes y una hora después del horario operativo, para preparar y cerrar).
- **Pasiva / bajo demanda:** lunes (generación de liquidaciones semanales), y cualquier momento de emergencia.

El panel debe diseñarse asumiendo que el admin **no siempre está mirando**. De ahí la necesidad de alertas contundentes y estado siempre claro al volver.

---

## 5. Reglas de negocio clave que afectan al admin

### 5.1 · El admin puede cancelar cualquier pedido en cualquier estado
A diferencia del restaurante (que pierde el permiso de cancelar una vez el driver llega al local), el admin puede cancelar incluso pedidos en `in_delivery`. Esto es para emergencias reales (accidente del driver, restaurante se niega a entregar, cliente amenaza, etc.).

### 5.2 · Solo el admin puede bloquear o desbloquear cuentas
Restaurantes bloqueados por deuda no pueden crear pedidos. El desbloqueo es manual, tras verificar el pago. No hay desbloqueo automático por pago confirmado por terceros.

### 5.3 · Solo el admin crea usuarios
No existe autoregistro ni en la app del restaurante, ni en la del driver. Toda cuenta nueva pasa por el admin.

### 5.4 · La liquidación semanal es manual, a propósito
El cálculo de la deuda semanal de cada restaurante lo genera el admin manualmente cada lunes. Es manual para que el admin **revise antes de enviar** y detecte anomalías.

### 5.5 · El color de acento del restaurante = color del papelito físico
Cuando el admin crea un restaurante, elige un color de acento. Ese color debe corresponder al color de papel físico que el restaurante va a usar. **No son dos cosas distintas** — es el mismo concepto materializado en dos lugares (digital y físico).

### 5.6 · La deuda del restaurante se calcula en S/ 1.00 por entrega
Cada pedido en estado `delivered` genera S/ 1.00 de deuda al restaurante. Los pedidos cancelados no generan deuda.

### 5.7 · Sin registro de push token = sin notificaciones
Si un driver nunca abrió la app y aceptó los permisos de notificación, su `push_token` está vacío. Sin eso, el sistema no puede notificarle nada. El admin debe poder detectarlo y contactarlo.

---

## 6. Mapa de épicas

Organizadas por prioridad operativa, respetando la secuencia del documento original de flujo:

### 🔥 Prioridad 1 · Sin esto no opera el primer martes
| Épica | Foco |
|---|---|
| **EPIC-A1** | Acceso y sesión del admin |
| **EPIC-A2** | Monitor en tiempo real |
| **EPIC-A3** | Alertas automáticas |
| **EPIC-A4** | Intervención en pedidos |
| **EPIC-A5** | Gestión de restaurantes |
| **EPIC-A6** | Gestión de drivers |

### 🟡 Prioridad 2 · Puede esperar una semana
| Épica | Foco |
|---|---|
| **EPIC-A7** | Finanzas y liquidaciones semanales |
| **EPIC-A8** | Cierre diario de efectivo |

### 🟢 Prioridad 3 · Post-piloto
| Épica | Foco |
|---|---|
| **EPIC-A9** | Historial y auditoría de pedidos |
| **EPIC-A10** | Métricas y reportes |

### 🔧 Transversales
| Épica | Foco |
|---|---|
| **EPIC-A11** | Experiencia multi-dispositivo (responsive) |
| **EPIC-A12** | Conectividad en tiempo real |

---

## 7. Historias de usuario

### Convenciones
- **P1** crítico para primer martes · **P2** primera semana · **P3** post-piloto
- Criterios de aceptación verificables

---

## EPIC-A1 · Acceso y sesión del admin

### HU-A-001 · Iniciar sesión como admin
**Como** administrador de Tindivo,
**quiero** ingresar al panel con mis credenciales únicas,
**para** acceder a todo el sistema.

**Prioridad:** P1

**Criterios de aceptación:**
- Formulario de login con usuario y contraseña.
- Las credenciales del admin se configuran fuera del panel (por ejemplo, directo en la base de datos en la fase piloto).
- No existe autoregistro bajo ninguna forma.
- Tras 5 intentos fallidos consecutivos, bloqueo de 60 segundos.
- Al ingresar, el admin aterriza directamente en el Monitor en tiempo real.

---

### HU-A-002 · Persistencia de sesión
**Como** admin,
**quiero** no tener que loguearme cada vez que abro el panel,
**para** poder volver rápidamente cuando surja una emergencia.

**Prioridad:** P1

**Criterios de aceptación:**
- La sesión permanece activa durante 7 días sin reautenticarse.
- Cerrar el navegador o el dispositivo no cierra la sesión.
- Si la sesión expira, el siguiente acceso redirige al login.

---

### HU-A-003 · Cerrar sesión manualmente
**Como** admin,
**quiero** poder cerrar sesión cuando lo necesite,
**para** proteger el acceso si uso un dispositivo prestado.

**Prioridad:** P1

**Criterios de aceptación:**
- Botón "Cerrar sesión" visible en el menú de usuario.
- Al confirmar, elimina la sesión y redirige al login.

---

### HU-A-004 · Proteger contra acceso no autorizado
**Como** producto,
**quiero** que el panel admin esté fuertemente protegido,
**para** que nadie más pueda acceder a acciones críticas.

**Prioridad:** P1

**Criterios de aceptación:**
- Las rutas del panel admin son distintas a las rutas públicas (ej: `/admin/...`).
- Todas las rutas admin verifican el rol del usuario antes de renderizar.
- Un usuario con rol de restaurante o driver que intente acceder a `/admin/...` es rechazado con error 403.
- El login del admin es un endpoint separado del login de las otras apps.

---

## EPIC-A2 · Monitor en tiempo real

### HU-A-005 · Ver barra de estado global al entrar
**Como** admin,
**quiero** ver de un vistazo el estado general del sistema,
**para** saber si todo está normal o necesito intervenir.

**Prioridad:** P1

**Criterios de aceptación:**
- Al entrar al monitor, la primera fila muestra:
  - Estado del servicio: "● SERVICIO ACTIVO" o "● SERVICIO INACTIVO" (según horario).
  - Estado de drivers disponibles: cuántos están online.
  - Número de pedidos activos en este momento.
- Si el servicio está activo pero no hay drivers disponibles, el indicador cambia a rojo: "🔴 Sin driver".
- Si hay pedidos sin atender con el estado "Sin driver", se muestra advertencia: "⚠️ X pedidos sin atender".

---

### HU-A-006 · Ver lista de pedidos activos ordenada por antigüedad
**Como** admin,
**quiero** ver todos los pedidos del turno que aún no están cerrados,
**para** monitorear su progreso y detectar problemas.

**Prioridad:** P1

**Criterios de aceptación:**
- La lista muestra todos los pedidos en estados: `waiting_driver`, `heading_to_restaurant`, `waiting_at_restaurant`, `in_delivery`.
- Se ordenan por antigüedad: el más viejo primero (los que más tiempo llevan activos son los más urgentes).
- Cada tarjeta muestra:
  - Short ID del pedido (ej: `ABC12345`)
  - Nombre del restaurante
  - Dirección del cliente (si ya se capturó)
  - Método de pago y monto
  - Chip del estado actual
  - Driver asignado (si aplica)
  - Hora de creación del pedido

---

### HU-A-007 · Ver detalle completo de cualquier pedido activo
**Como** admin,
**quiero** abrir el detalle de cualquier pedido con un clic,
**para** ver su historial completo y tomar decisiones.

**Prioridad:** P1

**Criterios de aceptación:**
- Al hacer clic en una tarjeta, se abre el detalle del pedido.
- El detalle muestra:
  - Todos los datos del pedido (cliente, restaurante, monto, método de pago, vuelto si aplica)
  - Línea de tiempo vertical con los estados y sus timestamps exactos
  - Quién realizó cada transición (cajero, driver, admin)
  - Si hubo ediciones: quién y cuándo
- Desde el detalle, el admin puede cancelar el pedido o volver al monitor.

---

### HU-A-008 · Ver actualización del monitor sin recargar
**Como** admin,
**quiero** que el monitor se actualice automáticamente cuando algo cambie,
**para** no tener que estar refrescando la página manualmente.

**Prioridad:** P1

**Criterios de aceptación:**
- Cuando el estado de un pedido cambia, la tarjeta del monitor se actualiza en máximo 2 segundos.
- Los indicadores de la barra de estado global se actualizan en tiempo real.
- La conexión realtime se reestablece automáticamente si se pierde.
- Si la conexión realtime falla, el panel muestra banner: "⚠️ Conexión en tiempo real perdida — reintentando..." y cae a polling cada 10 segundos como fallback.

---

## EPIC-A3 · Alertas automáticas

### HU-A-009 · Ver alertas urgentes en la parte superior
**Como** admin,
**quiero** que las alertas aparezcan destacadas en la parte superior del panel,
**para** verlas aunque esté mirando otra sección.

**Prioridad:** P1

**Criterios de aceptación:**
- Las alertas activas se muestran en una zona fija en la parte superior del panel, visible en todas las pantallas.
- Cada alerta muestra:
  - Tipo de alerta (con ícono + color rojo)
  - Restaurante o driver afectado
  - Pedido afectado (si aplica), con short ID clickeable
  - Hace cuánto ocurrió
  - Botón de acción directa (ej: "Llamar al driver", "Cancelar pedido")
- Las alertas desaparecen automáticamente cuando se resuelven.
- Si hay múltiples alertas simultáneas, se listan una debajo de la otra, la más reciente arriba.

---

### HU-A-010 · Alerta de pedido sin aceptar
**Como** admin,
**quiero** ser alertado cuando un pedido lleva más de 90 segundos sin ser aceptado,
**para** poder contactar al driver y evitar que el cliente espere demasiado.

**Prioridad:** P1

**Criterios de aceptación:**
- Si un pedido lleva más de 90 segundos en estado `waiting_driver`, aparece alerta automática.
- La alerta incluye nombre del restaurante, short ID del pedido y tiempo transcurrido.
- Botón de acción: "📞 Llamar al driver" que abre el marcador con el teléfono del driver asignado (si aplica) o del único driver disponible.
- Si el pedido se acepta, la alerta desaparece automáticamente.

---

### HU-A-011 · Alerta de driver desconectado con pedidos activos
**Como** admin,
**quiero** saber cuándo un driver se marcó como no disponible teniendo pedidos aún en curso,
**para** intervenir antes de que se pierda la entrega.

**Prioridad:** P1

**Criterios de aceptación:**
- Si un driver cambia su estado a "no disponible" mientras tiene pedidos en estados activos (aceptados pero no entregados), aparece alerta.
- La alerta muestra nombre del driver y cantidad de pedidos en curso.
- Botón de acción: "📞 Llamar al driver".
- Si el driver vuelve a estar disponible, la alerta desaparece.

---

### HU-A-012 · Alerta de diferencia de efectivo reportada
**Como** admin,
**quiero** saber de inmediato cuando un restaurante reporta una diferencia al cerrar efectivo,
**para** resolverla antes de que se agrave.

**Prioridad:** P1

**Criterios de aceptación:**
- Cuando un restaurante usa "Reportar diferencia" en la pantalla de confirmación de efectivo, aparece alerta en el panel.
- La alerta muestra:
  - Nombre del restaurante
  - Nombre del driver
  - Monto declarado por el driver vs monto reportado por el restaurante
  - Diferencia (positiva o negativa)
- Botón de acción: "Resolver" que lleva a la vista detalle del cierre.

---

### HU-A-013 · Alerta de restaurante bloqueado intentando crear pedido
**Como** admin,
**quiero** saber cuándo un restaurante con deuda intenta usar el servicio,
**para** contactarlo y gestionar el pago.

**Prioridad:** P2

**Criterios de aceptación:**
- Si un restaurante bloqueado intenta crear un pedido, se registra el intento.
- Aparece alerta con nombre del restaurante y hora del intento.
- La alerta persiste por 1 hora o hasta que el admin la descarte manualmente.

---

### HU-A-014 · Alerta sonora opcional para emergencias críticas
**Como** admin,
**quiero** poder activar un sonido cuando aparece una alerta crítica,
**para** darme cuenta aunque no esté mirando la pantalla.

**Prioridad:** P2

**Criterios de aceptación:**
- En configuración del panel, existe toggle "Alertas con sonido".
- Si está activado, las alertas críticas (pedido sin aceptar, driver desconectado) reproducen un sonido corto al aparecer.
- El sonido solo se reproduce una vez por alerta, no en loop.
- El browser pide permiso de reproducción automática si es necesario.

---

## EPIC-A4 · Intervención en pedidos

### HU-A-015 · Cancelar cualquier pedido sin restricción
**Como** admin,
**quiero** poder cancelar cualquier pedido en cualquier estado,
**para** resolver emergencias reales.

**Prioridad:** P1

**Criterios de aceptación:**
- Desde el detalle de cualquier pedido activo, aparece botón "Cancelar pedido".
- Al tocarlo se pide confirmación con diálogo que incluye:
  - El estado actual del pedido
  - Advertencia si el pedido está en `in_delivery`: "⚠️ El driver ya está con el pedido. ¿Confirmas?"
  - Campo de texto obligatorio: "Motivo de la cancelación"
- Al confirmar:
  - El pedido pasa a estado `cancelled` con nota "Cancelado por admin: [motivo]"
  - Si el driver ya había aceptado → recibe push inmediata con el motivo
  - El restaurante recibe alerta en su PWA
  - El pedido queda registrado con timestamp y autor (admin)
  - No se genera deuda al restaurante

---

### HU-A-016 · Editar teléfono de cliente en emergencia
**Como** admin,
**quiero** poder corregir el teléfono de un cliente si el restaurante lo registró mal,
**para** que el driver pueda contactarlo sin tener que cancelar y recrear.

**Prioridad:** P2

**Criterios de aceptación:**
- Desde el detalle del pedido, si el estado es `waiting_driver` o `heading_to_restaurant`, existe botón "Editar teléfono del cliente".
- Al editarlo se requiere motivo.
- La edición se registra con timestamp y autor.
- Si el estado es posterior (driver ya digitó el papelito), el admin debe cancelar y pedir al restaurante recrear.

**Notas:** El documento original menciona editar teléfono solo en `waiting_driver`, pero conviene extenderlo a `heading_to_restaurant` para más flexibilidad de rescate.

---

### HU-A-017 · Reasignar pedido a otro driver
**Como** admin,
**quiero** poder reasignar un pedido aceptado a otro driver,
**para** responder a emergencias cuando haya más de un driver disponible.

**Prioridad:** P2 *(se activa cuando haya más de 1 driver)*

**Criterios de aceptación:**
- Si hay más de un driver activo, en el detalle del pedido aparece opción "Reasignar a otro driver".
- Se muestra lista de drivers disponibles con sus cargas actuales.
- Al seleccionar nuevo driver:
  - El pedido cambia de asignación
  - El driver original recibe push: "El pedido [ID] fue reasignado"
  - El nuevo driver recibe push: "Te asignaron el pedido [ID]"
  - Se registra la reasignación en el historial con motivo

---

### HU-A-018 · Ver registro de acciones del admin
**Como** admin,
**quiero** ver un historial de las intervenciones que hice en pedidos,
**para** consultar qué hice y cuándo.

**Prioridad:** P3 *(post-piloto)*

**Criterios de aceptación:**
- Existe vista "Mis intervenciones" accesible desde el menú.
- Muestra cancelaciones, ediciones y reasignaciones ejecutadas por el admin con timestamp y motivo.

---

## EPIC-A5 · Gestión de restaurantes

### HU-A-019 · Ver lista de todos los restaurantes
**Como** admin,
**quiero** ver todos los restaurantes registrados,
**para** monitorear su estado de un vistazo.

**Prioridad:** P1

**Criterios de aceptación:**
- La lista muestra todos los restaurantes con:
  - Nombre
  - Estado (Activo / Bloqueado / Desactivado)
  - Deuda actual acumulada
  - Color de acento (muestra visual pequeña)
- Se puede filtrar por estado y buscar por nombre.
- Se ordena por nombre alfabético por defecto.

---

### HU-A-020 · Crear un nuevo restaurante
**Como** admin,
**quiero** crear una cuenta de restaurante con todos sus datos,
**para** habilitarlo a usar el servicio.

**Prioridad:** P1

**Criterios de aceptación:**
- Formulario con campos obligatorios:
  - Nombre del restaurante
  - Teléfono
  - Dirección del local
  - Email (será su usuario para la PWA)
  - Contraseña temporal
  - Número de Yape/Plin
  - QR de Yape/Plin (imagen)
  - Color de acento (selector de color, visual claro)
- Validaciones:
  - Email con formato válido y único en el sistema
  - Teléfono numérico de 9 dígitos
  - Color de acento no duplicado con otros restaurantes activos
  - Contraseña mínimo 6 caracteres
- Al crear:
  - Se genera el registro en el sistema
  - El restaurante queda en estado "Activo"
  - Se inicializa la deuda en 0
  - Se muestra confirmación con las credenciales que debe compartir al cajero

---

### HU-A-021 · Asegurar que el color de acento sea único
**Como** producto,
**quiero** evitar que dos restaurantes activos tengan el mismo color de acento,
**para** que el driver pueda identificar visualmente cada restaurante y su papelito.

**Prioridad:** P1

**Criterios de aceptación:**
- Al crear o editar un restaurante, si el color elegido ya está en uso por un restaurante activo, se muestra advertencia.
- El admin puede forzar el uso duplicado solo si el otro restaurante está desactivado.
- El selector de color sugiere colores no usados en paletas predefinidas (rosado, azul, verde, amarillo, lavanda, etc.).

---

### HU-A-022 · Editar datos de un restaurante
**Como** admin,
**quiero** poder corregir o actualizar los datos de un restaurante,
**para** mantener la información precisa.

**Prioridad:** P1

**Criterios de aceptación:**
- Desde el detalle del restaurante, cualquier campo del perfil se puede editar.
- Los cambios se aplican inmediatamente.
- Se registra timestamp y usuario que modificó.
- Cambios sensibles (email de acceso, contraseña) requieren confirmación explícita.

---

### HU-A-023 · Bloquear un restaurante
**Como** admin,
**quiero** bloquear un restaurante cuando tiene deuda vencida o incumple reglas,
**para** suspender su acceso hasta que regularice.

**Prioridad:** P1

**Criterios de aceptación:**
- Desde el detalle del restaurante existe botón "Bloquear cuenta".
- Al tocar se pide motivo obligatorio.
- El restaurante pasa a estado "Bloqueado".
- Al abrir su PWA ve el mensaje: "Tu cuenta está suspendida. Comunícate con Tindivo al 906 550 166".
- No puede crear pedidos ni ejecutar acciones hasta desbloquearse.
- Queda registrado en historial el bloqueo con timestamp y motivo.

---

### HU-A-024 · Desbloquear un restaurante
**Como** admin,
**quiero** desbloquear un restaurante una vez regularice su situación,
**para** que vuelva a operar.

**Prioridad:** P1

**Criterios de aceptación:**
- Desde el detalle de un restaurante bloqueado existe botón "Desbloquear cuenta".
- Se muestra la deuda actual y se pide confirmación.
- Al desbloquear, el restaurante recupera acceso inmediato.
- Si se marcó como pagado al mismo tiempo, el `balance_due` se descuenta automáticamente.

---

### HU-A-025 · Ver detalle completo de un restaurante
**Como** admin,
**quiero** ver toda la información de un restaurante en una sola vista,
**para** tener contexto completo al tomar decisiones.

**Prioridad:** P1

**Criterios de aceptación:**
- El detalle muestra:
  - Perfil con todos los campos (editables)
  - Estado actual (activo / bloqueado / desactivado)
  - Color de acento destacado visualmente
  - Deuda acumulada actual
  - Historial de liquidaciones (P2)
  - Pedidos del día actual
  - Botón bloquear / desbloquear

---

## EPIC-A6 · Gestión de drivers

### HU-A-026 · Ver lista de drivers
**Como** admin,
**quiero** ver todos los drivers del sistema,
**para** monitorear su disponibilidad en tiempo real.

**Prioridad:** P1

**Criterios de aceptación:**
- La lista muestra:
  - Nombre completo
  - Estado de disponibilidad (Disponible / No disponible / Sin conectarse hoy)
  - Días asignados (mar, jue, vie, sáb)
  - Tipo de vehículo y placa
- Se puede ver la disponibilidad en tiempo real vía la conexión realtime.

---

### HU-A-027 · Crear un nuevo driver
**Como** admin,
**quiero** registrar un driver con sus datos y credenciales,
**para** habilitarlo a operar.

**Prioridad:** P1

**Criterios de aceptación:**
- Formulario con campos obligatorios:
  - Nombre completo
  - Teléfono
  - Tipo de vehículo (Moto / Bicicleta / Auto / A pie)
  - Placa del vehículo (opcional)
  - Días asignados (multi-select: mar, jue, vie, sáb)
  - Horario de turno (hora inicio y fin)
  - Email (usuario de la app)
  - Contraseña temporal
- Al crear:
  - Se genera el registro con `is_available = false`
  - No tiene push token aún (lo registra al abrir la app)
  - Se muestra confirmación con credenciales a compartir

---

### HU-A-028 · Ver detalle completo de un driver
**Como** admin,
**quiero** ver toda la información de un driver,
**para** tener contexto cuando necesite contactarlo o tomar decisiones.

**Prioridad:** P1

**Criterios de aceptación:**
- El detalle muestra:
  - Perfil con campos editables
  - Estado de disponibilidad actual (con indicador en tiempo real)
  - Indicador de push token: "Configurado ✓" o "No configurado ⚠️"
  - Pedidos completados hoy
  - Historial de pedidos del turno actual
  - Botón activar / desactivar cuenta

---

### HU-A-029 · Verificar que el driver tenga notificaciones configuradas
**Como** admin,
**quiero** saber si un driver tiene push token válido,
**para** detectar si no va a recibir notificaciones.

**Prioridad:** P1

**Criterios de aceptación:**
- En el detalle del driver, si `push_token` está vacío o inválido, se muestra advertencia visible:
  - "⚠️ Este driver no tiene notificaciones configuradas. Debe abrir la app y activar los permisos."
- Desde el monitor principal, si un driver está marcado como disponible pero no tiene push token, aparece alerta global.
- El admin puede contactar al driver directamente con botón "Llamar al driver".

---

### HU-A-030 · Editar datos del driver
**Como** admin,
**quiero** poder modificar los datos de un driver,
**para** mantener la información precisa.

**Prioridad:** P1

**Criterios de aceptación:**
- Cualquier campo del perfil se puede editar.
- Cambios sensibles (email, contraseña) requieren confirmación.
- Los cambios se aplican inmediatamente.

---

### HU-A-031 · Desactivar un driver
**Como** admin,
**quiero** poder desactivar un driver (temporal o definitivamente),
**para** cuando deje de trabajar o necesite pausa.

**Prioridad:** P1

**Criterios de aceptación:**
- Desde el detalle del driver existe botón "Desactivar cuenta".
- Si el driver tiene pedidos activos, se advierte y se sugiere reasignarlos o cancelarlos primero.
- Al desactivar, el driver no puede loguearse hasta que se reactive.

---

## EPIC-A7 · Finanzas y liquidaciones semanales

### HU-A-032 · Ver deuda actual de todos los restaurantes
**Como** admin,
**quiero** ver cuánto me debe cada restaurante al día de hoy,
**para** planificar liquidaciones.

**Prioridad:** P2

**Criterios de aceptación:**
- Vista "Finanzas" muestra tabla con:
  - Nombre del restaurante
  - Deuda actual acumulada
  - Pedidos del periodo no liquidado
  - Estado de última liquidación (pagada / pendiente / vencida)
- Se puede filtrar por estado de deuda (todos / con deuda / vencida).

---

### HU-A-033 · Generar liquidación semanal manualmente
**Como** admin,
**quiero** generar las liquidaciones de la semana con un solo botón,
**para** enviar los cobros cada lunes.

**Prioridad:** P2

**Criterios de aceptación:**
- Cada lunes el admin ejecuta "Generar liquidaciones de la semana".
- Antes de ejecutar, muestra preview con:
  - Período cubierto (fecha inicio y fin)
  - Por cada restaurante: pedidos entregados, monto a cobrar, fecha de vencimiento sugerida
- El admin puede revisar, editar fecha de vencimiento o excluir un restaurante antes de confirmar.
- Al confirmar:
  - Se crean los registros de liquidación con estado `pending`
  - Se actualiza el `balance_due` de cada restaurante
  - Se registra timestamp y autor de la generación

---

### HU-A-034 · Marcar liquidación como pagada
**Como** admin,
**quiero** marcar una liquidación como pagada cuando el restaurante me deposita,
**para** cerrar el ciclo y desbloquear si estaba bloqueado.

**Prioridad:** P2

**Criterios de aceptación:**
- Cada liquidación pendiente tiene botón "Marcar como pagado".
- Se pide opcional: método de pago recibido (efectivo / Yape / transferencia) y nota.
- Al marcar:
  - Liquidación pasa a estado `paid` con timestamp
  - El monto se descuenta del `balance_due` del restaurante
  - Si el restaurante estaba bloqueado por esta deuda, se desbloquea automáticamente
  - El restaurante recibe notificación en su PWA: "Tu pago fue registrado. Gracias."

---

### HU-A-035 · Ver historial de liquidaciones
**Como** admin,
**quiero** ver el historial completo de liquidaciones de cualquier restaurante,
**para** resolver consultas y auditar pagos.

**Prioridad:** P2

**Criterios de aceptación:**
- Desde el detalle de un restaurante, sección "Liquidaciones" muestra lista con:
  - Período
  - Monto
  - Estado (pagada / pendiente / vencida)
  - Fecha de generación
  - Fecha de pago (si aplica)
- Se puede filtrar por estado y rango de fechas.

---

## EPIC-A8 · Cierre diario de efectivo

### HU-A-036 · Ver cierre de efectivo del día
**Como** admin,
**quiero** ver cuánto efectivo se debe liquidar al final del turno,
**para** verificar que todo cuadre antes de cerrar.

**Prioridad:** P2

**Criterios de aceptación:**
- Vista "Cierre de efectivo" muestra por día:
  - Por cada restaurante y driver: monto a liquidar
  - Estado de cada liquidación (confirmado por el restaurante / pendiente confirmación / diferencia reportada)
  - Monto total del día
- Los estados se actualizan en tiempo real.

---

### HU-A-037 · Resolver diferencia reportada de efectivo
**Como** admin,
**quiero** resolver manualmente cuando hay diferencia entre lo declarado por el driver y lo recibido por el restaurante,
**para** cerrar el caso y evitar disputas.

**Prioridad:** P2

**Criterios de aceptación:**
- Cuando un restaurante reporta diferencia, aparece en esta vista con ambos montos.
- Botón "Resolver" abre modal con:
  - Monto declarado por driver
  - Monto reportado por restaurante
  - Diferencia
  - Campo obligatorio: decisión del admin (texto libre)
  - Opciones: aceptar monto del driver, aceptar monto del restaurante, o registrar otro monto
- Al resolver:
  - Se cierra el registro de cierre con la decisión
  - Se notifica a ambas partes
  - Queda en auditoría permanente

---

### HU-A-038 · Confirmar manualmente un cierre pendiente
**Como** admin,
**quiero** poder forzar la confirmación de un cierre que quedó pendiente,
**para** no acumular casos abiertos.

**Prioridad:** P3

**Criterios de aceptación:**
- Si pasaron más de 48 horas sin que el restaurante confirme un cierre, el admin puede marcarlo como confirmado manualmente.
- Requiere nota explicativa.

---

## EPIC-A9 · Historial y auditoría

### HU-A-039 · Buscar pedidos con filtros
**Como** admin,
**quiero** poder buscar pedidos pasados con distintos filtros,
**para** resolver consultas o disputas.

**Prioridad:** P3

**Criterios de aceptación:**
- Vista "Historial" permite filtrar por:
  - Restaurante
  - Driver
  - Rango de fechas
  - Estado (entregado / cancelado)
  - Método de pago
  - Short ID o teléfono del cliente (búsqueda directa)
- Los resultados se paginan (50 por página).

---

### HU-A-040 · Ver detalle inmutable de pedido histórico
**Como** admin,
**quiero** ver el detalle completo de cualquier pedido pasado,
**para** revisar qué pasó en cada caso.

**Prioridad:** P3

**Criterios de aceptación:**
- El detalle histórico muestra:
  - Todos los datos capturados al crear el pedido
  - Historial completo de transiciones de estado con timestamps exactos
  - Autor de cada acción (cajero, driver, admin)
  - Si hubo cancelación o edición: motivo y autor
  - Método de pago original vs real (si hubo cambio)
- **No hay ningún campo editable** — la vista es estrictamente de solo lectura.

---

### HU-A-041 · Exportar datos históricos
**Como** admin,
**quiero** poder exportar pedidos filtrados a CSV,
**para** análisis externo o contabilidad.

**Prioridad:** P3 *(post-piloto)*

**Criterios de aceptación:**
- Desde la vista de historial con filtros aplicados, botón "Exportar a CSV".
- El CSV incluye todos los campos relevantes: ID, restaurante, driver, estado, fechas, monto, método de pago, etc.

---

## EPIC-A10 · Métricas y reportes (post-piloto)

### HU-A-042 · Ver métricas operativas básicas
**Como** admin,
**quiero** ver indicadores clave del negocio,
**para** tomar decisiones informadas.

**Prioridad:** P3

**Criterios de aceptación:**
- Dashboard post-piloto con:
  - Pedidos por día / semana / mes
  - Tiempo promedio de entrega
  - Tasa de cancelación (% de pedidos cancelados)
  - Tasa de prórroga por restaurante
  - Ingreso por comisiones por período
  - Top restaurantes por volumen
  - Productividad por driver
- Filtros por rango de fechas.

---

## EPIC-A11 · Experiencia multi-dispositivo

### HU-A-043 · Panel completamente usable en PC
**Como** admin,
**quiero** usar el panel desde mi laptop con todas las funcionalidades,
**para** tener máxima visibilidad cuando esté en escritorio.

**Prioridad:** P1

**Criterios de aceptación:**
- En pantallas ≥ 1024px:
  - Layout de múltiples columnas
  - Todas las listas visibles sin scroll horizontal
  - Atajos de teclado para acciones frecuentes (opcional, pero deseable)
- Optimizado para resoluciones 1280×800 en adelante.

---

### HU-A-044 · Panel usable en celular para emergencias
**Como** admin,
**quiero** poder usar el panel desde mi celular,
**para** responder emergencias cuando no esté en la computadora.

**Prioridad:** P1

**Criterios de aceptación:**
- En pantallas < 768px:
  - Layout de una columna
  - Navegación por menú hamburguesa
  - Todos los botones al menos 44×44 px
  - Las tablas se convierten en tarjetas apiladas
  - Los modales ocupan pantalla completa
- Las acciones críticas (cancelar pedido, llamar, ver alertas) son fácilmente accesibles.
- No se "esconde" funcionalidad — todo lo de PC está disponible en móvil, aunque reorganizado.

---

### HU-A-045 · Instalable como PWA en celular del admin
**Como** admin,
**quiero** poder instalar el panel como app en mi celular,
**para** abrirlo rápido cuando suene una emergencia.

**Prioridad:** P2

**Criterios de aceptación:**
- El panel cumple criterios de PWA instalable.
- Al abrir en móvil, tras el primer login, se sugiere "Agregar a pantalla de inicio".
- Una vez instalado, funciona en modo standalone sin barra de navegador.

---

## EPIC-A12 · Conectividad en tiempo real

### HU-A-046 · Mantener sincronización con el servidor en tiempo real
**Como** producto,
**quiero** que el panel reciba cambios del sistema al instante,
**para** que el admin vea la realidad sin delay.

**Prioridad:** P1

**Criterios de aceptación:**
- Se usa una solución de tiempo real (WebSocket, Ably, u otra equivalente) para propagar cambios.
- Cuando un pedido cambia de estado, el panel recibe el evento en menos de 2 segundos.
- Cuando un driver cambia disponibilidad, la lista se actualiza al instante.
- Cuando aparece una alerta, se muestra sin delay.

---

### HU-A-047 · Manejar pérdida de conexión realtime con fallback
**Como** producto,
**quiero** que el panel siga funcionando aunque se pierda la conexión en tiempo real,
**para** que el admin no se quede ciego.

**Prioridad:** P1

**Criterios de aceptación:**
- Si la conexión realtime se pierde, el panel detecta el fallo.
- Se muestra banner visible: "⚠️ Conexión en tiempo real perdida. Reintentando..."
- Automáticamente se cae a modo polling (consultas periódicas cada 10 segundos) hasta recuperar.
- Cuando se recupera, el banner desaparece y se muestra brevemente: "Conectado de nuevo ✓"

---

## 8. Requerimientos no funcionales del panel admin

### RNF-A-001 · Rendimiento
- El monitor en tiempo real debe cargar completamente en menos de **3 segundos**.
- Los eventos de realtime se propagan y reflejan en la UI en menos de **2 segundos**.
- Las búsquedas en historial responden en menos de **1 segundo** para datasets de hasta 10,000 pedidos.

### RNF-A-002 · Disponibilidad
- El panel debe estar disponible 24/7 (no solo en horario operativo).
- Uptime objetivo ≥ **99.9%** durante horario operativo.
- Ventanas de mantenimiento fuera del horario operativo, anunciadas al admin con 24h de anticipación.

### RNF-A-003 · Seguridad
- Credenciales de admin con contraseña fuerte (mínimo 10 caracteres, mixta).
- Autenticación con factor adicional opcional (2FA) post-piloto.
- Todas las rutas admin verifican rol explícitamente.
- Logs completos de todas las acciones sensibles (cancelar, bloquear, desbloquear, marcar como pagado).
- Contraseñas hasheadas. Nunca en texto plano.
- HTTPS obligatorio.
- Sesión expira en 7 días de inactividad.

### RNF-A-004 · Auditoría
- Toda acción del admin queda registrada con timestamp, usuario, y parámetros.
- Los logs de auditoría son inmutables (solo escritura).
- En la fase piloto los logs se consultan directo en la BD; post-piloto se expone vista UI (HU-A-018).

### RNF-A-005 · Usabilidad
- El panel sigue principios de **visibilidad radical**: lo importante siempre al frente, sin hacer scroll.
- Áreas tocables mínimo 44×44px en móvil.
- Contraste WCAG AA en todo el panel.
- Los botones destructivos (cancelar pedido, bloquear restaurante) tienen confirmación explícita.
- Las acciones frecuentes están a máximo 2 clics de distancia desde el monitor principal.

### RNF-A-006 · Compatibilidad
- **Desktop:** Chrome 100+, Firefox 100+, Safari 15+, Edge 100+.
- **Móvil:** Chrome 100+ en Android, Safari en iOS 15+.
- Resoluciones soportadas: desde 360×640 hasta 1920×1080.

### RNF-A-007 · Responsividad
- Breakpoints:
  - Móvil: < 768px
  - Tablet: 768px – 1024px
  - Desktop: > 1024px
- La experiencia debe ser equivalente en funcionalidades entre breakpoints.

### RNF-A-008 · Idioma y tono
- Todo el contenido en español peruano.
- Tono operativo-claro: directo, sin exceso de palabras, pero amable.
- Los mensajes de confirmación son claros: "¿Cancelar este pedido?" no "Are you sure?".

---

## 9. Flujos completos narrados

### Flujo A · Primer martes de operación (caso feliz)

1. 5:45 PM — El admin abre el panel desde su laptop.
2. Monitor en tiempo real muestra: "● SERVICIO ACTIVO · 1 driver disponible · 0 pedidos activos". Todo en orden.
3. 6:05 PM — Primer pedido del día. El admin ve la tarjeta aparecer automáticamente con estado `waiting_driver`.
4. 6:06 PM — El driver acepta. La tarjeta se actualiza solo: nuevo estado, driver asignado.
5. 6:18 PM — Estado pasa a `waiting_at_restaurant`. El admin ve el timer interno avanzar.
6. 6:22 PM — Estado pasa a `in_delivery`. El admin no necesita hacer nada.
7. 6:35 PM — Estado pasa a `delivered`. La tarjeta desaparece del monitor (se va al historial).
8. El admin sigue monitoreando con un café en la mano. Todo bien.

### Flujo B · Emergencia — driver no responde

1. 7:12 PM — Aparece alerta roja en la parte superior del panel: "⚠️ Pedido sin aceptar — EL BUEN SABOR — 90 segundos".
2. El admin toca "📞 Llamar al driver". Su celular marca automáticamente al número de Carlos.
3. Carlos no contesta. El admin intenta de nuevo en 30 segundos.
4. A los 3 minutos sin respuesta, el admin decide cancelar el pedido.
5. Abre el detalle del pedido desde la alerta. Toca "Cancelar pedido".
6. Llena motivo: "Driver no responde a llamadas".
7. Confirma. El pedido pasa a `cancelled`.
8. El admin llama al restaurante por su cuenta para avisar personalmente.
9. La alerta desaparece automáticamente.

### Flujo C · Crear un restaurante nuevo

1. Llega un restaurante nuevo interesado en el servicio. Agenda cita presencial con el admin.
2. El admin abre el panel → "Restaurantes" → "+ Crear restaurante".
3. Llena el formulario con los datos del restaurante: nombre, teléfono, dirección, email elegido, contraseña temporal.
4. Sube el QR de Yape desde su celular.
5. Elige color de acento: rosado. El sistema avisa que ese color ya está en uso por "Dulcería María". El admin elige azul cielo.
6. Confirma creación. Ve la pantalla de éxito con las credenciales.
7. Imprime las credenciales en un papel y se las entrega al cajero del nuevo restaurante.
8. También le entrega físicamente el paquete de papelitos de color azul cielo.

### Flujo D · Cierre semanal — lunes por la mañana

1. Lunes 10 AM — El admin abre el panel → "Finanzas".
2. Toca "Generar liquidaciones de esta semana".
3. Ve preview de cada restaurante con pedidos entregados y monto a cobrar.
4. Nota que un restaurante con solo 2 pedidos tiene deuda de S/ 2. Decide esperar a la próxima semana y lo excluye.
5. Confirma el resto. Se generan las liquidaciones con fecha de vencimiento el viernes.
6. El admin envía los cobros por WhatsApp manualmente (fuera del panel por ahora).
7. Conforme los restaurantes pagan durante la semana, el admin va marcando cada liquidación como pagada.

### Flujo E · Diferencia de efectivo al cierre del viernes

1. 11:30 PM del viernes — El driver terminó su turno, entregó S/ 87 a "La Esquina".
2. El restaurante cuenta el dinero y reporta que solo recibió S/ 82.
3. Alerta aparece en el panel: "Diferencia reportada · La Esquina · Carlos declaró S/ 87, restaurante recibió S/ 82 · Diferencia: S/ 5".
4. El admin toca "Resolver".
5. Ve ambos montos. Llama a Carlos por su cuenta. Carlos dice que contó S/ 87 pero pudo haberse equivocado.
6. Llama a "La Esquina" para confirmar. Restaurante reitera S/ 82.
7. El admin decide aceptar el monto del restaurante y registra nota: "Resuelto por diferencia aceptada en favor del restaurante. Recordatorio a Carlos de contar mejor".
8. El caso queda cerrado, ambas partes notificadas. La diferencia queda registrada.

---

## 10. Casos de emergencia — guía operativa

### Emergencia 1 · Driver no responde y hay pedidos esperando
1. Ver alerta en monitor
2. Llamar al driver desde el botón de alerta
3. Si no contesta en 2 min, cancelar pedidos activos
4. Llamar a los restaurantes manualmente para explicar
5. Registrar incidente en notas del driver

### Emergencia 2 · Restaurante creó pedido con datos incorrectos
1. Abrir el pedido desde el monitor
2. Si está en `waiting_driver` o `heading_to_restaurant`, editar teléfono del cliente
3. Si está en estados posteriores, cancelar y pedir al restaurante crear nuevo pedido

### Emergencia 3 · Conflicto de efectivo al cierre
1. Ver diferencia en la vista de cierre de efectivo
2. Llamar a ambas partes por separado
3. Resolver manualmente con nota justificativa
4. Registrar decisión en el sistema

### Emergencia 4 · Restaurante dice que no recibió un pedido entregado
1. Buscar el pedido en historial por short_id o teléfono del cliente
2. Ver historial de estados con timestamps exactos
3. Si figura como `delivered`, hay evidencia del timestamp de entrega
4. Compartir captura con el restaurante como respaldo

### Emergencia 5 · Admin no puede acceder al panel
**Este es un caso crítico que el documento original no cubre.** Cuando el admin es único y no puede acceder, el sistema queda sin intervención posible.

Mitigaciones sugeridas:
1. Tener acceso directo a la base de datos (respaldo máximo)
2. Mantener credenciales en gestor de contraseñas accesible
3. Post-piloto: contemplar 2do admin con rol limitado o acceso de emergencia

---

## 11. Lo que el admin NO necesita en MVP (decisión explícita)

Confirmado por el documento original, pero importante listarlo para alcance:

- ❌ Dashboard de métricas con gráficas
- ❌ Exportación a Excel o PDF
- ❌ Múltiples usuarios admin con roles distintos
- ❌ Configuración de horarios operativos desde el panel
- ❌ Notificaciones push al celular del admin (solo alertas visuales en el panel abierto)
- ❌ Chat con restaurantes o drivers desde el panel
- ❌ Generación automática de liquidaciones (es manual a propósito)
- ❌ Geolocalización en tiempo real del driver en un mapa

---

## 12. Supuestos, riesgos y decisiones pendientes

### Supuestos actuales
- El admin es una sola persona (el fundador en la fase piloto).
- El admin tiene acceso permanente al panel durante el turno.
- El admin puede recibir llamadas telefónicas en su celular durante el turno.
- No hay 2FA ni multi-admin en MVP.
- La generación de liquidaciones es semanal y manual.
- El color de acento del restaurante es el mismo que el color del papelito físico.

### Riesgos críticos identificados

**Riesgo 1 · Single point of failure**
Si el admin único no puede operar (enfermedad, emergencia, dispositivos rotos), el sistema queda sin intervención. No hay respaldo operativo. **Mitigación sugerida post-piloto:** figura de "admin secundario" con permisos limitados o acceso de emergencia por consola directo a BD.

**Riesgo 2 · Alerta visual requiere atención humana**
El documento original descarta push al admin argumentando que "el panel siempre está abierto". En la práctica, el admin humano no mira la pantalla 100% del tiempo. Una alerta crítica puede pasar desapercibida varios minutos. **Mitigación sugerida:** HU-A-014 (alerta sonora opcional), o contemplar push al celular del admin en fase 2.

**Riesgo 3 · Cancelación de pedidos `in_delivery` tiene impacto en cliente final**
El admin puede cancelar un pedido que ya está en camino al cliente. No está claro cómo se comunica al cliente final (que no tiene app). **Mitigación sugerida:** envío automático de WhatsApp de cancelación al cliente cuando se cancela un pedido en `in_delivery`.

**Riesgo 4 · Contraseña del admin comprometida**
Con un solo admin, si su contraseña se filtra, un atacante tiene acceso total. **Mitigación sugerida:** 2FA obligatorio post-piloto.

### Decisiones pendientes (por resolver antes del lanzamiento o en fases)

1. ¿Debe existir log público de acciones del admin (quién canceló qué, cuándo)? Esto da transparencia a restaurantes y drivers.
2. ¿Qué pasa si se cancela un pedido en `in_delivery`? ¿Se envía WhatsApp al cliente?
3. ¿El admin debe recibir notificación push en su celular cuando hay alertas críticas?
4. ¿Se expone al restaurante un "botón de emergencia" para contactar al admin directamente desde su PWA?
5. ¿El admin puede desbloquear un driver que por alguna razón quedó bloqueado?
6. ¿Existe un proceso de backup de la base de datos que el admin pueda ejecutar?
7. ¿Qué pasa si se necesita cambiar el color de acento de un restaurante activo? ¿Se pueden cambiar los papelitos físicos sincronizadamente?
8. ¿Los drivers y restaurantes ven quién canceló un pedido (admin vs ellos mismos)?
9. ¿Hay límites en la cantidad de cancelaciones que el admin puede hacer sin justificación especial?
10. ¿Post-piloto habrá un rol de "admin operativo" distinto del "admin financiero" (separación de funciones)?

---

## 13. Resumen priorizado

| Prioridad | Historias | Áreas |
|---|---|---|
| **P1 · Antes del primer martes** | 29 historias | Login, monitor, alertas, cancelación, gestión de restaurantes y drivers, multi-dispositivo, realtime |
| **P2 · Primera semana post-lanzamiento** | 11 historias | Finanzas, liquidaciones, cierre de efectivo, PWA instalable, alerta sonora |
| **P3 · Post-piloto** | 7 historias | Historial avanzado, exportación, métricas con gráficas, log de intervenciones |

**Total:** 47 historias de usuario + 8 requerimientos no funcionales.

### Estimación de alcance

Con un equipo dedicado de 2-3 personas, asumiendo que el backend se desarrolla en paralelo con las apps del restaurante y del motorizado:

- **Semana 0-2:** Setup, autenticación admin, monitor básico (EPIC-A1, A2)
- **Semana 3-4:** Gestión de restaurantes y drivers completa (EPIC-A5, A6)
- **Semana 5:** Alertas automáticas, intervención en pedidos (EPIC-A3, A4)
- **Semana 6:** Tiempo real robusto, responsive móvil (EPIC-A11, A12)
- **Semana 7-8:** Finanzas y cierre de efectivo (EPIC-A7, A8)
- **Semana 9:** QA integral, pruebas con admin real, ajustes

---

## 14. Análisis estratégico — por qué este panel es el más importante

Al finalizar este análisis, vale la pena una reflexión. De las tres aplicaciones de Tindivo:

- La **app del restaurante** es la que genera pedidos.
- La **app del driver** es la que ejecuta pedidos.
- El **panel admin** es el que **garantiza que el sistema funciona** cuando algo sale mal.

Las dos primeras pueden tener buggy UX y el negocio sobrevive. El panel admin no. Si falla el panel, el admin no puede intervenir, y cuando una emergencia ocurra (driver no responde, restaurante cancela mal, diferencia de efectivo), **no habrá resolución posible**.

Por eso, aunque el documento original marca al admin como "Prioridad 1 básica", vale la pena invertir tiempo extra en:

1. **Alertas visibles y contundentes** — el admin no debe perderse emergencias.
2. **Intervención rápida** — cancelar, editar y desbloquear debe ser fluido.
3. **Auditoría inmutable** — cada acción del admin queda registrada para siempre.
4. **Multi-dispositivo real** — el admin no siempre está en la laptop; debe poder resolver desde el celular.
5. **Mitigación del single-point-of-failure** — aunque el MVP sea de un solo admin, la arquitectura debe preparar el terreno para un segundo admin o acceso de emergencia.

Este panel no es una "herramienta administrativa". Es **la red de seguridad de toda la operación**.

---

**Con este documento completo, el panel admin queda definido en función, alcance y principios. Es el lugar donde la operación de Tindivo se vuelve humana — donde las máquinas dejan de decidir y empiezas tú.**
