# API REST — Tindivo (v3)

> **Versión actualizada.** Cambios principales respecto a la versión anterior:
> - **Una sola autenticación** (Supabase Auth) para las tres apps — ya no hay endpoint `/api/auth/mobile/login` ni JWT manual.
> - **Sin canales Ably.** El realtime viaja por Supabase Realtime directamente desde las tablas Postgres, no por endpoints.
> - **Sin endpoint `/api/ably/token`.** Los clientes se conectan con su sesión Supabase directamente.
> - **Nuevos endpoints de Web Push** para suscripción/desuscripción de notificaciones.
> - **Todos los clientes son PWAs** con cookies httpOnly.

---

## 1. Convenciones generales

- Base URL: `https://tindivo.pe/api`
- Todos los requests y responses usan `Content-Type: application/json`
- Timestamps en ISO 8601: `2024-04-07T18:30:00.000Z`
- Dinero como número con dos decimales: `25.00`
- Formato de error estándar:
  ```json
  { "error": "Mensaje descriptivo del error" }
  ```

---

## 2. Autenticación

### 2.1 · Un solo mecanismo para las tres apps

Supabase Auth maneja la sesión con **cookies httpOnly**. Las tres PWAs (restaurante, driver, admin) usan el mismo mecanismo.

**Ya no hay:**
- Endpoint `/api/auth/mobile/login`
- Distinción entre "auth web" y "auth móvil"
- JWT manual firmado con `JWT_SECRET`
- NextAuth

**Ahora hay:**
- Supabase Auth con cookies httpOnly gestionadas automáticamente por `@supabase/ssr`
- Una sola sesión por navegador
- Middleware de Next.js que lee la sesión y redirige por rol

### 2.2 · Login

El login no pasa por la API REST tradicional. El cliente llama directamente a Supabase:

```typescript
// En el formulario de login (cliente)
const supabase = supabaseBrowser()
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
})

if (error) {
  // Mostrar error genérico: "Usuario o contraseña incorrectos"
  return
}

// El middleware redirige automáticamente según rol (restaurant / driver / admin)
```

### 2.3 · Logout

```typescript
await supabase.auth.signOut()
// Limpia la cookie httpOnly. El middleware redirige a /login.
```

### 2.4 · Obtener sesión en endpoints

```typescript
// En cualquier route handler
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(req: Request) {
  const supabase = supabaseServer()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const role = user.user_metadata.role
  if (role !== 'restaurant') return Response.json({ error: 'Forbidden' }, { status: 403 })

  // ... resto de la lógica
}
```

### 2.5 · Helper de autorización

```typescript
// lib/auth.ts
import { supabaseServer } from './supabase-server'

export async function requireUser(role?: 'restaurant' | 'driver' | 'admin') {
  const supabase = supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new HttpError(401, 'Unauthorized')
  if (role && user.user_metadata.role !== role) throw new HttpError(403, 'Forbidden')

  return {
    user,
    role: user.user_metadata.role,
    restaurantId: user.user_metadata.restaurant_id,
    driverId: user.user_metadata.driver_id,
  }
}
```

Uso simplificado:

```typescript
export async function POST(req: Request) {
  const { restaurantId } = await requireUser('restaurant')
  // ...
}
```

---

## 3. Códigos de respuesta

| Código | Significado |
|---|---|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request — datos inválidos o faltantes |
| 401 | Unauthorized — sin sesión |
| 403 | Forbidden — rol sin permiso o cuenta bloqueada |
| 404 | Not Found |
| 409 | Conflict — acción no permitida en el estado actual (ej: race condition al aceptar pedido) |
| 500 | Internal Server Error |

---

## 4. Endpoints del Restaurante

**Auth:** Supabase session — rol `restaurant`
**Bloqueo:** si `isBlocked = true`, endpoints de creación devuelven `403`

---

### `GET /api/restaurant/service-status`

Verifica si el servicio está disponible ahora (día y hora operativa).
No verifica disponibilidad del driver.

**Response 200:**
```json
{ "available": true, "message": null }
```
```json
{
  "available": false,
  "message": "El servicio opera martes, jueves, viernes y sábado de 6:00 PM a 11:00 PM."
}
```

---

### `POST /api/restaurant/orders`

Crea un nuevo pedido.

**Request:**
```json
{
  "prepTimeOption": "normal",
  "paymentStatus": "pending_cash",
  "orderAmount": 45.00,
  "clientPaysWith": 50.00
}
```

Nota: el teléfono y dirección del cliente **no van en este endpoint**. Los digita el driver al llegar al restaurante leyendo el papelito físico.

**Response 201:**
```json
{
  "id": "uuid",
  "shortId": "ABC12345",
  "status": "waiting_driver",
  "estimatedReadyAt": "2024-04-07T19:15:00.000Z",
  "appearsInQueueAt": "2024-04-07T19:05:00.000Z",
  "changeToGive": 5.00
}
```

**Errores:**
- `403` si la cuenta del restaurante está bloqueada
- `403` si está fuera del horario operativo
- `400` si los montos son inválidos

---

### `GET /api/restaurant/orders`

Lista pedidos activos del restaurante.

**Query params:** `status` (opcional)

**Response 200:**
```json
{
  "orders": [
    {
      "id": "uuid",
      "shortId": "ABC12345",
      "status": "waiting_at_restaurant",
      "orderAmount": 45.00,
      "paymentStatus": "pending_cash",
      "changeToGive": 5.00,
      "estimatedReadyAt": "2024-04-07T19:15:00.000Z",
      "minutesUntilReady": 3,
      "driver": { "fullName": "Carlos Ramírez", "phone": "999111222" },
      "extensionUsed": false,
      "readyEarlyUsed": false,
      "createdAt": "2024-04-07T18:45:00.000Z"
    }
  ]
}
```

**Realtime:** el cliente se suscribe a `postgres_changes` filtrando por `restaurant_id=eq.{id}` y no necesita volver a llamar este endpoint. Solo se llama al cargar inicialmente.

---

### `GET /api/restaurant/orders/:id`

Detalle completo de un pedido del restaurante.

**Response 200:** incluye `statusHistory` ordenado por timestamp asc.

---

### `POST /api/restaurant/orders/:id/ready-early`

Avisa al driver que el pedido está listo antes de tiempo. Recalcula `appearsInQueueAt` al momento actual.

**Condiciones:**
- El pedido debe estar en `waiting_driver`
- Deben faltar más de 10 minutos al `estimatedReadyAt` (es decir, estado visual verde)
- No puede haberse usado antes

**Response 200:** `{ "updated": true, "appearsInQueueAt": "..." }`

**Errores:**
- `409` si el pedido ya está en estado amarillo o rojo
- `409` si ya se usó antes

**Notas:** tras ejecutarlo, la fila se actualiza en la DB y automáticamente:
1. El driver recibe Web Push (enviado desde el servidor)
2. Su PWA se entera del cambio vía `postgres_changes`

---

### `POST /api/restaurant/orders/:id/extension`

Solicita prórroga de +5 o +10 minutos.

**Request:**
```json
{ "additionalMinutes": 10 }
```

**Condiciones:**
- El pedido debe estar en `waiting_driver` o `heading_to_restaurant`
- No puede haberse usado antes
- `additionalMinutes` debe ser 5 o 10 exactamente

**Response 200:**
```json
{
  "updated": true,
  "estimatedReadyAt": "2024-04-07T19:25:00.000Z",
  "extensionMinutes": 10
}
```

---

### `POST /api/restaurant/orders/:id/cancel`

Cancela un pedido.

**Condiciones por estado:**
- `waiting_driver` → cancelable sin advertencia
- `heading_to_restaurant` → cancelable con advertencia (notifica al driver)
- Otros estados → `403` (solo el admin puede)

**Request:**
```json
{ "reason": "Cliente canceló el pedido" }
```

**Response 200:** `{ "cancelled": true }`

---

### `POST /api/restaurant/cash-settlements/:id/confirm`

Confirma recepción del efectivo entregado por el driver.

**Request:**
```json
{ "receivedAmount": 87.00 }
```

**Response 200:** `{ "confirmed": true }`

---

### `POST /api/restaurant/cash-settlements/:id/dispute`

Reporta diferencia en el monto recibido.

**Request:**
```json
{
  "reportedAmount": 82.00,
  "note": "Se contaron varias veces, solo había 82 soles."
}
```

**Response 200:** `{ "disputed": true }`

Tras esto:
- El admin recibe alerta vía broadcast `admin-alerts`
- El `CashSettlement` queda en estado `disputed`

---

### `GET /api/restaurant/dashboard`

Panel principal del restaurante.

**Response 200:**
```json
{
  "serviceActive": true,
  "activeOrdersCount": 2,
  "deliveredToday": 8,
  "balanceDue": 23.00,
  "nextSettlementDue": "2024-04-15"
}
```

---

## 5. Endpoints del Driver

**Auth:** Supabase session — rol `driver`

---

### `GET /api/driver/profile`

**Response 200:**
```json
{
  "id": "uuid",
  "fullName": "Carlos Ramírez",
  "phone": "999111222",
  "vehicleType": "moto",
  "licensePlate": "ABC-123",
  "operatingDays": ["tuesday", "thursday", "friday", "saturday"],
  "shiftStart": "18:00",
  "shiftEnd": "23:00",
  "isAvailable": false,
  "hasPushSubscription": true
}
```

---

### `PATCH /api/driver/availability`

**Request:** `{ "isAvailable": true }`

**Response 200:** `{ "isAvailable": true, "updatedAt": "..." }`

**Errores:** `403` si intenta activarse fuera del horario operativo.

Si se desactiva con pedidos activos → broadcast a `admin-alerts` con evento `driver.went_offline`.

---

### `POST /api/driver/push/subscribe`

Registra la suscripción Web Push del dispositivo actual.

**Request:**
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/xxx",
  "keys": {
    "p256dh": "BEa...",
    "auth": "xxx..."
  }
}
```

**Response 200:** `{ "subscribed": true }`

**Notas:**
- Un mismo driver puede tener múltiples suscripciones (distintos dispositivos)
- El endpoint hace `upsert` por `(userId, endpoint)` — si ya existe se actualizan las keys

---

### `POST /api/driver/push/unsubscribe`

Elimina una suscripción Web Push (al cerrar sesión).

**Request:** `{ "endpoint": "https://fcm.googleapis.com/fcm/send/xxx" }`

**Response 200:** `{ "unsubscribed": true }`

---

### `GET /api/driver/orders/available`

Pedidos en `waiting_driver` dentro de la ventana aceptable (rojos y amarillos).

**Response 200:**
```json
{
  "available": [
    {
      "id": "uuid",
      "shortId": "XYZ99999",
      "restaurant": { "name": "El Buen Sabor", "accentColor": "f97316" },
      "orderAmount": 40.00,
      "paymentStatus": "pending_cash",
      "changeToGive": 10.00,
      "prepTimeOption": "fast",
      "prepTimeMinutes": 15,
      "estimatedReadyAt": "2024-04-07T19:15:00.000Z",
      "minutesUntilReady": 3,
      "visualState": "yellow"
    }
  ],
  "upcoming": [
    {
      "id": "uuid",
      "shortId": "DEF11111",
      "restaurant": { "name": "Santiago's", "accentColor": "2563eb" },
      "orderAmount": 15.00,
      "paymentStatus": "pending_yape",
      "prepTimeOption": "normal",
      "prepTimeMinutes": 25,
      "estimatedReadyAt": "2024-04-07T19:40:00.000Z",
      "minutesUntilQueue": 15,
      "visualState": "green"
    }
  ]
}
```

**Realtime:** el cliente complementa con suscripción a `postgres_changes` sobre `orders` filtrando `status=eq.waiting_driver`, y recalcula localmente si cae en ventana aceptable.

---

### `GET /api/driver/orders`

Cola personal del driver (ordenada por urgencia).

**Response 200:**
```json
{
  "orders": [
    {
      "id": "uuid",
      "shortId": "ABC12345",
      "restaurant": {
        "name": "El Buen Sabor",
        "address": "Av. Principal 100",
        "phone": "999888777",
        "accentColor": "f97316"
      },
      "clientPhone": "987654321",
      "deliveryAddress": "Los Pinos 234",
      "orderAmount": 25.00,
      "deliveryFee": 1.00,
      "paymentStatus": "pending_cash",
      "changeToGive": 4.00,
      "status": "heading_to_restaurant",
      "estimatedReadyAt": "2024-04-07T19:25:00.000Z",
      "createdAt": "2024-04-07T19:00:00.000Z"
    }
  ],
  "cashSummary": {
    "totalToReturn": 87.00,
    "byRestaurant": [
      { "restaurantId": "uuid", "restaurantName": "El Buen Sabor", "amount": 47.00 },
      { "restaurantId": "uuid", "restaurantName": "La Esquina", "amount": 40.00 }
    ]
  }
}
```

---

### `POST /api/driver/orders/:id/accept`

Acepta un pedido disponible.

**Condiciones:**
- Pedido en `waiting_driver`
- Driver tiene capacidad (< 3 pedidos activos)
- Pedido dentro de ventana aceptable (`appearsInQueueAt <= now`)

**Response 200:**
```json
{ "id": "uuid", "status": "heading_to_restaurant", "acceptedAt": "..." }
```

**Errores:**
- `409` si el pedido ya fue aceptado por otro driver (race condition)
- `409` si el driver está al límite de capacidad
- `409` si el pedido aún no entra en ventana

---

### `POST /api/driver/orders/:id/arrived`

Marca llegada al restaurante. Pasa a `waiting_at_restaurant`.

**Request:** `{ "readyOnArrival": false }` (si ya está listo, se omite el momento 2)

**Response 200:** `{ "status": "waiting_at_restaurant", "waitingStartedAt": "..." }`

---

### `POST /api/driver/orders/:id/picked-up`

El driver confirma que tiene el pedido. Hay que capturar datos del cliente.

**Request:**
```json
{
  "clientPhone": "987654321",
  "deliveryAddress": "Los Pinos 234, frente al grifo azul"
}
```

**Response 200:**
```json
{
  "status": "in_delivery",
  "deliveryStartedAt": "...",
  "whatsappSent": true,
  "trackingUrl": "https://tindivo.pe/pedidos/ABC12345"
}
```

**Acción interna:** el sistema envía WhatsApp automático al cliente con el link de tracking.

---

### `POST /api/driver/orders/:id/delivered`

Marca pedido como entregado.

**Response 200:** `{ "status": "delivered", "deliveredAt": "..." }`

**Acción interna:**
- Si `paymentStatus = pending_cash`, suma `orderAmount` al `CashSettlement` del día para ese restaurante
- Genera `deliveryFee` como deuda del restaurante con Tindivo (+1.00 a `balanceDue`)

---

### `PATCH /api/driver/orders/:id/payment-method`

Cambiar método de pago real antes de entregar (por ejemplo: cliente iba a pagar Yape pero al final paga efectivo).

**Request:**
```json
{
  "paymentStatusReal": "pending_cash",
  "clientPaysWith": 50.00
}
```

**Response 200:**
```json
{ "id": "uuid", "paymentStatusReal": "pending_cash", "changeToGive": 24.00 }
```

---

### `GET /api/driver/cash-summary`

**Response 200:**
```json
{
  "totalCash": 87.00,
  "byRestaurant": [
    {
      "restaurantId": "uuid",
      "restaurantName": "El Buen Sabor",
      "amount": 47.00,
      "settlementStatus": "pending",
      "orders": [
        { "shortId": "ABC12345", "orderAmount": 25.00, "deliveredAt": "..." }
      ]
    }
  ]
}
```

---

### `POST /api/driver/cash-settlements/:id/deliver`

Driver registra la entrega de efectivo al restaurante.

**Request:** `{ "amount": 87.00 }`

**Response 200:** `{ "status": "pending_confirmation" }`

Tras esto, el restaurante recibe notificación en su PWA vía `postgres_changes` sobre `cash_settlements`.

---

## 6. Endpoints del Admin

**Auth:** Supabase session — rol `admin`

---

### `GET /api/admin/monitor`

Datos iniciales del monitor en tiempo real. Tras la carga inicial, las actualizaciones vienen por `postgres_changes` y broadcast.

**Response 200:**
```json
{
  "serviceActive": true,
  "driversAvailable": 1,
  "driversList": [
    { "id": "uuid", "fullName": "Carlos R.", "isAvailable": true, "activeOrdersCount": 2 }
  ],
  "activeOrdersCount": 3,
  "deliveredToday": 12,
  "alerts": [
    {
      "type": "order.unaccepted",
      "orderId": "uuid",
      "shortId": "XYZ99999",
      "restaurantName": "El Buen Sabor",
      "minutesWaiting": 4
    }
  ]
}
```

---

### `GET /api/admin/orders`

Búsqueda y filtrado de pedidos.

**Query params:**
- `status`: filtro por estado
- `restaurantId`, `driverId`: filtro por relación
- `from`, `to`: rango de fechas (YYYY-MM-DD)
- `search`: busca por shortId o teléfono del cliente
- `page`, `pageSize`: paginación (default 50)

**Response 200:**
```json
{
  "orders": [ /* ... */ ],
  "total": 148,
  "page": 1,
  "pageSize": 50
}
```

---

### `GET /api/admin/orders/:id`

Detalle completo con `statusHistory` inmutable.

---

### `POST /api/admin/orders/:id/cancel`

Cancela cualquier pedido en cualquier estado.

**Request:**
```json
{ "reason": "Driver no responde a llamadas" }
```

**Response 200:** `{ "cancelled": true }`

**Acciones internas:**
- Si había driver asignado → Web Push al driver
- Si el pedido estaba en `in_delivery` → WhatsApp al cliente informando cancelación
- No se suma deuda al restaurante

---

### `PATCH /api/admin/orders/:id/client-phone`

Corrige teléfono del cliente en emergencia.

**Condiciones:** solo en `waiting_driver` o `heading_to_restaurant`.

**Request:**
```json
{
  "clientPhone": "987654321",
  "reason": "Teléfono original estaba incompleto"
}
```

**Response 200:** `{ "updated": true }`

La edición se registra en `statusHistory` con nota.

---

### `POST /api/admin/orders/:id/reassign`

Reasigna un pedido a otro driver (solo cuando hay más de uno disponible).

**Request:**
```json
{
  "newDriverId": "uuid",
  "reason": "Driver original no responde"
}
```

**Response 200:** `{ "reassigned": true }`

**Acciones internas:**
- Driver anterior recibe Web Push: "El pedido fue reasignado"
- Nuevo driver recibe Web Push: "Te asignaron el pedido XYZ"

---

### `GET /api/admin/restaurants`

Lista completa de restaurantes.

**Query params:** `status` (`active`, `blocked`, `inactive`), `search`

**Response 200:**
```json
{
  "restaurants": [
    {
      "id": "uuid",
      "name": "El Buen Sabor",
      "phone": "999888777",
      "address": "Av. Principal 100",
      "accentColor": "f97316",
      "yapeNumber": "999888777",
      "qrUrl": "https://xxxx.supabase.co/storage/v1/object/public/restaurant-qrs/xxx",
      "isActive": true,
      "isBlocked": false,
      "balanceDue": 8.00,
      "createdAt": "..."
    }
  ]
}
```

---

### `POST /api/admin/restaurants`

Crea un restaurante.

**Request:**
```json
{
  "name": "El Buen Sabor",
  "phone": "999888777",
  "address": "Av. Principal 100",
  "yapeNumber": "999888777",
  "qrUrl": "https://xxxx.supabase.co/storage/v1/object/public/restaurant-qrs/xxx",
  "accentColor": "f97316",
  "email": "restaurante@gmail.com",
  "password": "contraseña_temporal"
}
```

**Validaciones:**
- Email único en el sistema
- `accentColor` no duplicado con otros restaurantes activos (si lo está, devuelve `409` con lista de colores disponibles)

**Response 201:** datos del restaurante creado.

**Acción interna:** crea usuario en `auth.users` de Supabase con rol `restaurant` y `restaurant_id` en `user_metadata`.

---

### `PATCH /api/admin/restaurants/:id`

Edita datos del restaurante. Campos editables: nombre, teléfono, dirección, yape, QR, accentColor, isBlocked.

**Request:** cualquier subset de los campos editables.

**Response 200:** datos actualizados.

---

### `POST /api/admin/restaurants/:id/block`

Bloquea el acceso del restaurante a su PWA.

**Request:** `{ "reason": "Deuda vencida de S/ 23.00" }`

**Response 200:** `{ "blocked": true }`

---

### `POST /api/admin/restaurants/:id/unblock`

Desbloquea el acceso.

**Response 200:** `{ "unblocked": true }`

---

### `GET /api/admin/drivers`

Lista completa de drivers.

**Response 200:**
```json
{
  "drivers": [
    {
      "id": "uuid",
      "fullName": "Carlos Ramírez",
      "phone": "999111222",
      "vehicleType": "moto",
      "licensePlate": "ABC-123",
      "operatingDays": ["tuesday", "thursday", "friday", "saturday"],
      "shiftStart": "18:00",
      "shiftEnd": "23:00",
      "isActive": true,
      "isAvailable": false,
      "hasPushSubscription": true,
      "activeOrdersCount": 0,
      "deliveredToday": 0,
      "createdAt": "..."
    }
  ]
}
```

**Nota:** `hasPushSubscription` es un campo calculado que indica si el driver tiene al menos una suscripción Web Push registrada. Si es `false`, el driver no recibirá notificaciones.

---

### `POST /api/admin/drivers`

Crea un driver.

**Request:**
```json
{
  "fullName": "Carlos Ramírez",
  "phone": "999111222",
  "vehicleType": "moto",
  "licensePlate": "ABC-123",
  "operatingDays": ["tuesday", "thursday", "friday", "saturday"],
  "shiftStart": "18:00",
  "shiftEnd": "23:00",
  "email": "carlos@gmail.com",
  "password": "contraseña_temporal"
}
```

**Response 201:** datos del driver creado.

**Acción interna:** crea usuario en `auth.users` con rol `driver`, inicializa `DriverAvailability` con `isAvailable: false`.

---

### `PATCH /api/admin/drivers/:id`

Edita datos del driver.

---

### `POST /api/admin/drivers/:id/deactivate`

Desactiva un driver. Si tiene pedidos activos, responde `409` sugiriendo reasignar o cancelar primero.

---

### `GET /api/admin/settlements`

Liquidaciones semanales de comisiones.

**Query params:** `status`, `restaurantId`

---

### `POST /api/admin/settlements/generate`

Genera liquidaciones de la semana anterior. Se ejecuta cada lunes.

**Request:**
```json
{
  "periodStart": "2024-04-01",
  "periodEnd": "2024-04-07",
  "dueDate": "2024-04-15",
  "excludeRestaurantIds": ["uuid1", "uuid2"]
}
```

**Response 201:**
```json
{
  "generated": 12,
  "totalAmount": 245.00,
  "settlements": [ /* ... */ ]
}
```

---

### `PATCH /api/admin/settlements/:id/mark-paid`

Marca liquidación como pagada.

**Request:**
```json
{
  "paymentMethod": "yape",
  "notes": "Recibido el 8 abril 2024"
}
```

**Response 200:** `{ "marked": true }`

**Acciones internas:**
- Decrementa `balanceDue` del restaurante
- Si el restaurante estaba bloqueado → desbloquea automáticamente
- El restaurante recibe notificación en su PWA

---

### `GET /api/admin/cash-settlements`

**Query params:** `date` (default hoy)

---

### `POST /api/admin/cash-settlements/:id/resolve`

Resuelve una diferencia reportada de efectivo.

**Request:**
```json
{
  "resolvedAmount": 85.00,
  "decision": "accept_restaurant_amount",
  "notes": "Se acepta el monto reportado por el restaurante."
}
```

**Campos del request:**
- `resolvedAmount`: monto final oficial
- `decision`: `"accept_driver_amount"` | `"accept_restaurant_amount"` | `"custom"`
- `notes`: obligatorio

**Response 200:** `{ "resolved": true }`

---

## 7. Endpoints públicos (sin autenticación)

### `GET /api/tracking/:shortId`

Información pública del pedido para el cliente final.

**Response 200:**
```json
{
  "shortId": "ABC12345",
  "restaurantName": "El Buen Sabor",
  "status": "in_delivery",
  "paymentStatus": "pending_cash",
  "orderAmount": 25.00,
  "deliveryFee": 1.00,
  "changeToGive": 4.00,
  "estimatedReadyAt": "2024-04-07T19:25:00.000Z",
  "deliveredAt": null,
  "driverName": "Carlos R."
}
```

**Nunca expone:** teléfono del cliente, IDs internos, teléfono del driver, coordenadas exactas del restaurante.

**Error `404`:** no existe o lleva más de 24h en estado `delivered`.

**Realtime para el cliente:**
La página pública usa Supabase Realtime con ANON KEY (sin autenticar) para suscribirse a `postgres_changes` del pedido específico. Una policy RLS permite lectura anónima solo de pedidos accedidos por shortId:

```sql
create policy "Public tracking read"
on orders for select
using (
  -- Solo accesible conociendo el shortId
  true  -- el shortId de 8 caracteres es el secreto
);
```

*(La protección real es que el shortId es suficientemente aleatorio para no ser adivinable. Nunca se expone vía listado.)*

---

## 8. Realtime — Suscripciones directas sin endpoints

**No existe `/api/ably/token`.** Los clientes se conectan a Supabase Realtime directamente con su sesión.

### 8.1 · Suscripciones principales por app

| App | Suscripción | Qué observa |
|---|---|---|
| Restaurante | `postgres_changes` · tabla `orders` · filter `restaurant_id=eq.{id}` | Sus pedidos cambian de estado |
| Restaurante | `postgres_changes` · tabla `cash_settlements` · filter `restaurant_id=eq.{id}` | Solicitudes de confirmación de efectivo |
| Driver | `postgres_changes` · tabla `orders` · filter `status=eq.waiting_driver` | Nuevos pedidos entrantes |
| Driver | `postgres_changes` · tabla `orders` · filter `driver_id=eq.{id}` | Cambios en sus pedidos activos |
| Admin | `postgres_changes` · tabla `orders` · filter todos los activos | Monitor general |
| Admin | `postgres_changes` · tabla `cash_settlements` · filter `status=eq.disputed` | Diferencias reportadas |
| Admin | Broadcast `admin-alerts` | Alertas sintéticas (pedido sin aceptar, driver offline) |
| Público | `postgres_changes` · tabla `orders` · filter `short_id=eq.{shortId}` | Tracking del cliente |

### 8.2 · Ejemplo de suscripción (PWA Restaurante)

```typescript
const supabase = supabaseBrowser()

const channel = supabase
  .channel(`restaurant-${restaurantId}-orders`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'orders',
      filter: `restaurant_id=eq.${restaurantId}`,
    },
    (payload) => {
      if (payload.eventType === 'UPDATE') updateOrderInState(payload.new)
      if (payload.eventType === 'INSERT') addOrderToState(payload.new)
    }
  )
  .subscribe()

return () => { supabase.removeChannel(channel) }
```

### 8.3 · Broadcast para alertas del admin

El admin necesita alertas que no son cambios directos de fila (ej: "este pedido lleva 90s sin aceptar"). Para eso usamos broadcast desde el servidor:

```typescript
// En un cron job o worker que corre cada 30s
const unacceptedOrders = await db.order.findMany({
  where: {
    status: 'waiting_driver',
    createdAt: { lt: new Date(Date.now() - 90_000) },
  },
})

for (const order of unacceptedOrders) {
  await supabaseAdmin.channel('admin-alerts').send({
    type: 'broadcast',
    event: 'order.unaccepted',
    payload: {
      orderId: order.id,
      shortId: order.shortId,
      restaurantName: order.restaurant.name,
      minutesWaiting: Math.floor((Date.now() - order.createdAt) / 60_000),
    },
  })
}
```

### 8.4 · Seguridad de Realtime con RLS

Las suscripciones de `postgres_changes` respetan las mismas policies RLS que las queries normales. Un restaurante que intente suscribirse a `filter=restaurant_id=eq.OTRO` recibe 0 eventos porque RLS bloquea las filas antes de emitirlas.

---

## 9. Web Push — Endpoints de suscripción

### `POST /api/push/subscribe`

Registra una suscripción Web Push (para cualquier rol).

**Request:**
```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/xxx",
  "keys": {
    "p256dh": "BEa...",
    "auth": "xxx..."
  }
}
```

**Response 200:** `{ "subscribed": true }`

**Notas:**
- Un usuario puede tener múltiples suscripciones (ej: celular + tablet).
- La tabla `push_subscriptions` tiene constraint único en `(userId, endpoint)`.
- Si ya existe, se hace upsert.

---

### `DELETE /api/push/unsubscribe`

**Request:** `{ "endpoint": "https://fcm.googleapis.com/fcm/send/xxx" }`

**Response 200:** `{ "unsubscribed": true }`

---

### `GET /api/push/vapid-public-key`

Devuelve la clave pública VAPID para que el cliente pueda crear la suscripción.

**Response 200:**
```json
{ "publicKey": "BPxxxxx..." }
```

*(Alternativa: exponer como variable pública `NEXT_PUBLIC_VAPID_PUBLIC_KEY` y evitar este endpoint.)*

---

## 10. Storage — Subida de archivos

Los archivos se suben directamente a Supabase Storage desde el cliente autenticado. No hay endpoint wrapper.

### Ejemplo · Subir QR del restaurante (admin)

```typescript
const { data, error } = await supabase.storage
  .from('restaurant-qrs')
  .upload(`${restaurantId}/qr.png`, file, {
    upsert: true,
    contentType: 'image/png',
  })

const publicUrl = supabase.storage
  .from('restaurant-qrs')
  .getPublicUrl(data.path).data.publicUrl

// Guardar publicUrl en Restaurant.qrUrl
await fetch('/api/admin/restaurants/' + restaurantId, {
  method: 'PATCH',
  body: JSON.stringify({ qrUrl: publicUrl }),
})
```

### Buckets y permisos

| Bucket | Público | Uso |
|---|---|---|
| `restaurant-qrs` | Sí (lectura pública) | QR que verá el driver para pagar |
| `payment-proofs` | No | Capturas de pago Yape — post-piloto |
| `logos` | Sí | Logos de restaurantes |

---

## 11. Variables de entorno

```env
# Supabase (plataforma unificada)
NEXT_PUBLIC_SUPABASE_URL="https://xxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOi..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."  # Solo server

# Prisma (usa la DB Postgres de Supabase)
DATABASE_URL="postgres://postgres:[password]@db.xxxx.supabase.co:6543/postgres?pgbouncer=true"
DIRECT_URL="postgres://postgres:[password]@db.xxxx.supabase.co:5432/postgres"

# Web Push
VAPID_PUBLIC_KEY="BPxxx..."
VAPID_PRIVATE_KEY="xxx..."
NEXT_PUBLIC_VAPID_PUBLIC_KEY="BPxxx..."

# URLs
NEXT_PUBLIC_APP_URL="https://tindivo.pe"
```

### Ya no existen

- `ABLY_API_KEY`, `NEXT_PUBLIC_ABLY_KEY`
- `FIREBASE_STORAGE_BUCKET`
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- `JWT_SECRET`
- `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_ABLY_KEY`

---

## 12. Resumen · qué cambió respecto a v2

### Endpoints eliminados
- `POST /api/auth/mobile/login` — login unificado via Supabase Auth
- `GET /api/ably/token` — ya no se usa Ably

### Endpoints nuevos
- `POST /api/push/subscribe`, `DELETE /api/push/unsubscribe` — Web Push
- `GET /api/push/vapid-public-key` — clave VAPID pública

### Endpoints renombrados / ajustados
- Clases de endpoint `/api/admin/...` añaden `/block`, `/unblock`, `/reassign`, `/client-phone` como acciones explícitas
- `cash-settlements` ahora tiene `/confirm`, `/dispute`, `/resolve` separados
- Se clarifican flujos de `ready-early` y `extension` como POST a recursos específicos

### Cambios en autenticación
- Todas las rutas usan `requireUser(role)` que lee sesión Supabase de cookies
- No hay header `Authorization: Bearer` en ningún flujo
- La sesión persiste en cookies httpOnly automáticamente

### Cambios en realtime
- Los clientes se suscriben a `postgres_changes` directamente desde el frontend
- Los eventos "sintéticos" (alertas admin) usan broadcast
- Los canales Ably desaparecen — ver sección 8 para mapa de equivalencias

---

**Este API está alineado con la arquitectura v3 y los tres documentos de requerimientos (restaurante, driver PWA, admin). Cualquier historia de usuario en esos documentos se implementa contra los endpoints aquí definidos.**
