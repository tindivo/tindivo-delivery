# Base de datos — Tindivo (v3)

> **Versión actualizada.** Cambios principales respecto a la versión anterior:
> - **PostgreSQL vive en Supabase** (reemplaza Contabo VPS). Supabase incluye connection pooling, backups automáticos y Realtime nativos.
> - **`Driver.expoPushToken` reemplazado por tabla `PushSubscription`** (multi-dispositivo, Web Push estándar).
> - **Nuevas policies de Row Level Security** como capa de seguridad nativa de la DB.
> - **Campo `appearsInQueueAt` explícito** en `orders` (antes se calculaba en memoria).
> - **Prisma se mantiene como ORM**, pero apunta a Supabase Postgres.

---

## 1. Stack

- **Base de datos:** Supabase PostgreSQL 15 (managed)
- **ORM:** Prisma ORM (tipado, migraciones, cliente generado)
- **Connection pooling:** Supabase Pooler (incluido, puerto 6543)
- **Auth:** Supabase Auth (tabla `auth.users` gestionada por Supabase)
- **Realtime:** Supabase Realtime (emite cambios de fila automáticamente)
- **Storage:** Supabase Storage (buckets)
- **Seguridad:** Row Level Security activado en todas las tablas

---

## 2. Configuración inicial

```bash
npm install prisma @prisma/client @supabase/ssr @supabase/supabase-js
npx prisma init
```

```env
# .env

# Conexión via pooler (para queries de app)
DATABASE_URL="postgres://postgres.xxxxx:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# Conexión directa (solo para migraciones Prisma)
DIRECT_URL="postgres://postgres.xxxxx:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

# Supabase client keys
NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGci..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGci..."  # Solo servidor
```

**Notas:**
- `pgbouncer=true` es necesario para que Prisma funcione correctamente con el pooler de Supabase.
- `DIRECT_URL` se usa solo para `prisma migrate` (requiere conexión directa sin pooler).
- `SUPABASE_SERVICE_ROLE_KEY` debe estar **solo en el servidor** — bypassa RLS, nunca se expone al cliente.

```prisma
// prisma/schema.prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

generator client {
  provider = "prisma-client-js"
}
```

---

## 3. Schema completo de Prisma

```prisma
// prisma/schema.prisma

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ─────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────

enum UserRole {
  restaurant
  driver
  admin
}

enum OrderStatus {
  waiting_driver
  heading_to_restaurant
  waiting_at_restaurant
  picked_up
  delivered
  cancelled
}

enum PaymentStatus {
  prepaid           // cliente ya pagó antes del pedido
  pending_yape      // paga Yape/Plin al entregar
  pending_cash      // paga efectivo al entregar
}

enum PrepTimeOption {
  fast    // 10 min
  normal  // 20 min
  slow    // 30 min
}

enum SettlementStatus {
  pending
  paid
  overdue
}

enum CashSettlementStatus {
  pending
  confirmed
  disputed
  resolved
}

enum VehicleType {
  moto
  bicicleta
  pie
  auto
}

// ─────────────────────────────────────────────
// USERS
// Tabla de aplicación. Los usuarios reales viven en `auth.users`
// (gestionada por Supabase). Esta tabla extiende con datos de dominio.
//
// IMPORTANTE: el campo `id` de este modelo debe coincidir con el
// `id` de `auth.users` de Supabase. Se sincroniza via trigger.
// ─────────────────────────────────────────────

model User {
  id        String   @id // Coincide con auth.users.id (UUID de Supabase)
  email     String   @unique
  role      UserRole
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  restaurant                Restaurant?
  driver                    Driver?
  pushSubscriptions         PushSubscription[]
  cancelledOrders           Order[]              @relation("CancelledBy")
  statusHistory             OrderStatusHistory[]
  cashSettlementConfirmedBy CashSettlement[]     @relation("ConfirmedBy")
  cashSettlementResolvedBy  CashSettlement[]     @relation("ResolvedBy")

  @@map("users")
}

// ─────────────────────────────────────────────
// PUSH SUBSCRIPTIONS
// Reemplaza el campo expoPushToken del antiguo Driver.
// Soporta múltiples dispositivos por usuario (celular + tablet + PC).
// Aplica a los 3 roles: restaurante, driver, admin.
// ─────────────────────────────────────────────

model PushSubscription {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  endpoint  String   // URL única del push service (FCM, Apple, etc.)
  p256dh    String   // Clave pública del cliente
  auth      String   // Secret de autenticación
  userAgent String?  @map("user_agent")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, endpoint])
  @@index([userId])
  @@map("push_subscriptions")
}

// ─────────────────────────────────────────────
// RESTAURANTS
// Creado por el admin. El cajero hace login con
// las credenciales del User asociado.
// ─────────────────────────────────────────────

model Restaurant {
  id      String  @id @default(uuid())
  userId  String  @unique @map("user_id")
  name    String
  phone   String
  address String?

  // Datos de pago Yape/Plin
  yapeNumber String? @map("yape_number")
  qrUrl      String? @map("qr_url") // URL Supabase Storage

  // Color hex sin # (ej: "f97316"). Debe coincidir con el color del papelito físico.
  accentColor String @default("f97316") @map("accent_color")

  isActive  Boolean @default(true)  @map("is_active")
  isBlocked Boolean @default(false) @map("is_blocked")
  blockReason String? @map("block_reason")

  // Deuda acumulada con Tindivo (comisiones no pagadas)
  balanceDue Decimal @default(0.00) @map("balance_due") @db.Decimal(10, 2)

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  user            User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  orders          Order[]
  settlements     Settlement[]
  cashSettlements CashSettlement[]

  @@index([accentColor])
  @@index([isActive, isBlocked])
  @@map("restaurants")
}

// ─────────────────────────────────────────────
// DRIVERS
// ─────────────────────────────────────────────

model Driver {
  id           String      @id @default(uuid())
  userId       String      @unique @map("user_id")
  fullName     String      @map("full_name")
  phone        String
  vehicleType  VehicleType @default(moto) @map("vehicle_type")
  licensePlate String?     @map("license_plate")

  // Días operativos: ["tuesday","thursday","friday","saturday"]
  operatingDays String[] @map("operating_days")
  shiftStart    String   @default("18:00") @map("shift_start")
  shiftEnd      String   @default("23:00") @map("shift_end")

  isActive Boolean @default(true) @map("is_active")

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  user            User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  availability    DriverAvailability?
  orders          Order[]
  cashSettlements CashSettlement[]

  @@map("drivers")
}

// ─────────────────────────────────────────────
// DRIVER AVAILABILITY
// Estado actual del driver durante el turno.
// ─────────────────────────────────────────────

model DriverAvailability {
  id          String   @id @default(uuid())
  driverId    String   @unique @map("driver_id")
  isAvailable Boolean  @default(false) @map("is_available")
  updatedAt   DateTime @updatedAt @map("updated_at")

  driver Driver @relation(fields: [driverId], references: [id], onDelete: Cascade)

  @@map("driver_availability")
}

// ─────────────────────────────────────────────
// ORDERS
// Tabla principal. Ciclo de vida completo del pedido.
// ─────────────────────────────────────────────

model Order {
  id      String @id @default(uuid())
  shortId String @unique @map("short_id") // 8 chars

  restaurantId String  @map("restaurant_id")
  driverId     String? @map("driver_id")

  // Datos del cliente — NULL hasta que el driver los digita al llegar
  clientPhone       String?  @map("client_phone")
  deliveryAddress   String?  @map("delivery_address")
  deliveryLatitude  Decimal? @map("delivery_latitude") @db.Decimal(10, 7)
  deliveryLongitude Decimal? @map("delivery_longitude") @db.Decimal(10, 7)

  // Pago
  orderAmount    Decimal       @map("order_amount") @db.Decimal(10, 2)
  deliveryFee    Decimal       @default(1.00) @map("delivery_fee") @db.Decimal(10, 2)
  paymentStatus  PaymentStatus @map("payment_status")

  // Solo si paymentStatus = pending_cash
  clientPaysWith Decimal? @map("client_pays_with") @db.Decimal(10, 2)
  changeToGive   Decimal? @map("change_to_give") @db.Decimal(10, 2)

  // Método real usado al entregar
  paymentStatusReal PaymentStatus? @map("payment_status_real")
  yapeConfirmed     Boolean        @default(false) @map("yape_confirmed")
  receiptProofUrl   String?        @map("receipt_proof_url")

  // Tiempos de preparación
  prepTimeOption   PrepTimeOption @map("prep_time_option")
  prepTimeMinutes  Int            @map("prep_time_minutes")     // 10, 20 o 30
  estimatedReadyAt DateTime       @map("estimated_ready_at")
  appearsInQueueAt DateTime       @map("appears_in_queue_at")  // NUEVO

  // Prórroga y adelantar — ambos son únicos por pedido
  extensionUsed    Boolean @default(false) @map("extension_used")
  extensionMinutes Int?    @map("extension_minutes")
  readyEarlyUsed   Boolean @default(false) @map("ready_early_used")

  // Estado actual
  status OrderStatus @default(waiting_driver)

  // Timestamps de cada transición
  acceptedAt  DateTime? @map("accepted_at")
  headingAt   DateTime? @map("heading_at")
  waitingAt   DateTime? @map("waiting_at")
  pickedUpAt  DateTime? @map("picked_up_at")
  deliveredAt DateTime? @map("delivered_at")
  cancelledAt DateTime? @map("cancelled_at")
  cancelledBy String?   @map("cancelled_by")
  cancelReason String?  @map("cancel_reason")

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  restaurant      Restaurant           @relation(fields: [restaurantId], references: [id])
  driver          Driver?              @relation(fields: [driverId], references: [id])
  cancelledByUser User?                @relation("CancelledBy", fields: [cancelledBy], references: [id])
  statusHistory   OrderStatusHistory[]

  @@index([restaurantId])
  @@index([driverId])
  @@index([status])
  @@index([shortId])
  @@index([clientPhone])
  @@index([appearsInQueueAt])
  @@index([createdAt(sort: Desc)])
  @@map("orders")
}

// ─────────────────────────────────────────────
// ORDER STATUS HISTORY — auditoría inmutable
// ─────────────────────────────────────────────

model OrderStatusHistory {
  id        String      @id @default(uuid())
  orderId   String      @map("order_id")
  status    OrderStatus
  changedBy String?     @map("changed_by")
  notes     String?
  changedAt DateTime    @default(now()) @map("changed_at")

  order         Order @relation(fields: [orderId], references: [id], onDelete: Cascade)
  changedByUser User? @relation(fields: [changedBy], references: [id])

  @@index([orderId])
  @@index([changedAt(sort: Desc)])
  @@map("order_status_history")
}

// ─────────────────────────────────────────────
// CASH SETTLEMENTS — cierre diario de efectivo
// ─────────────────────────────────────────────

model CashSettlement {
  id             String               @id @default(uuid())
  restaurantId   String               @map("restaurant_id")
  driverId       String               @map("driver_id")
  settlementDate DateTime             @map("settlement_date") @db.Date

  totalCash  Decimal              @default(0.00) @map("total_cash") @db.Decimal(10, 2)
  orderCount Int                  @default(0) @map("order_count")
  status     CashSettlementStatus @default(pending)

  // Cuando el driver entrega
  deliveredAmount Decimal?  @map("delivered_amount") @db.Decimal(10, 2)
  deliveredAt     DateTime? @map("delivered_at_ts")

  // Cuando el restaurante confirma
  confirmedAmount Decimal?  @map("confirmed_amount") @db.Decimal(10, 2)
  confirmedAt     DateTime? @map("confirmed_at")
  confirmedBy     String?   @map("confirmed_by")

  // Si hay diferencia
  reportedAmount Decimal?  @map("reported_amount") @db.Decimal(10, 2)
  disputeNote    String?   @map("dispute_note")
  disputedAt     DateTime? @map("disputed_at")

  // Cuando el admin resuelve
  resolvedAmount  Decimal?  @map("resolved_amount") @db.Decimal(10, 2)
  resolvedAt      DateTime? @map("resolved_at")
  resolvedBy      String?   @map("resolved_by")
  resolutionNote  String?   @map("resolution_note")

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  restaurant      Restaurant @relation(fields: [restaurantId], references: [id])
  driver          Driver     @relation(fields: [driverId], references: [id])
  confirmedByUser User?      @relation("ConfirmedBy", fields: [confirmedBy], references: [id])
  resolvedByUser  User?      @relation("ResolvedBy", fields: [resolvedBy], references: [id])

  @@unique([restaurantId, driverId, settlementDate])
  @@index([status])
  @@index([settlementDate(sort: Desc)])
  @@map("cash_settlements")
}

// ─────────────────────────────────────────────
// SETTLEMENTS — liquidaciones semanales de comisiones
// ─────────────────────────────────────────────

model Settlement {
  id           String           @id @default(uuid())
  restaurantId String           @map("restaurant_id")
  periodStart  DateTime         @map("period_start") @db.Date
  periodEnd    DateTime         @map("period_end") @db.Date
  orderCount   Int              @default(0) @map("order_count")
  totalAmount  Decimal          @default(0.00) @map("total_amount") @db.Decimal(10, 2)
  status       SettlementStatus @default(pending)
  dueDate      DateTime         @map("due_date") @db.Date
  paidAt       DateTime?        @map("paid_at")
  paymentMethod String?         @map("payment_method")
  paymentNote   String?         @map("payment_note")
  createdAt    DateTime         @default(now()) @map("created_at")
  updatedAt    DateTime         @updatedAt @map("updated_at")

  restaurant Restaurant @relation(fields: [restaurantId], references: [id])

  @@unique([restaurantId, periodStart, periodEnd])
  @@index([status])
  @@map("settlements")
}
```

---

## 4. Sincronización con `auth.users` de Supabase

Los usuarios reales viven en la tabla `auth.users` de Supabase (gestionada por ellos). Nuestra tabla `users` de Prisma es una **extensión** que guarda rol y flags de aplicación.

Para mantenerlas sincronizadas usamos un **trigger de Postgres** que se dispara cuando Supabase Auth crea un nuevo usuario:

```sql
-- Se ejecuta al crear el usuario en auth.users (vía Supabase Auth API)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, role, is_active)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'role', 'restaurant')::user_role,
    true
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

De esta forma, cuando el admin crea un restaurante o driver usando la API de Supabase Auth (pasando `role` en `user_metadata`), automáticamente se crea la fila en `public.users`.

---

## 5. Row Level Security (RLS)

**Cada tabla tiene RLS activado.** Las policies se aplican en la base de datos antes de que cualquier query retorne datos. Esto es una capa de seguridad adicional a la validación en endpoints.

### 5.1 · Activar RLS en todas las tablas

```sql
alter table public.users enable row level security;
alter table public.restaurants enable row level security;
alter table public.drivers enable row level security;
alter table public.driver_availability enable row level security;
alter table public.orders enable row level security;
alter table public.order_status_history enable row level security;
alter table public.cash_settlements enable row level security;
alter table public.settlements enable row level security;
alter table public.push_subscriptions enable row level security;
```

### 5.2 · Helpers SQL reutilizables

```sql
-- Retorna el rol del usuario actual
create or replace function public.current_user_role()
returns text as $$
  select role from public.users where id = auth.uid();
$$ language sql stable security definer;

-- Retorna el restaurantId del usuario actual (si es restaurante)
create or replace function public.current_restaurant_id()
returns uuid as $$
  select id from public.restaurants where user_id = auth.uid();
$$ language sql stable security definer;

-- Retorna el driverId del usuario actual (si es driver)
create or replace function public.current_driver_id()
returns uuid as $$
  select id from public.drivers where user_id = auth.uid();
$$ language sql stable security definer;
```

### 5.3 · Policies de `orders`

```sql
-- Admin ve todo
create policy "orders_admin_all"
  on public.orders for all
  using (public.current_user_role() = 'admin');

-- Restaurantes ven solo sus pedidos
create policy "orders_restaurant_read"
  on public.orders for select
  using (
    public.current_user_role() = 'restaurant'
    and restaurant_id = public.current_restaurant_id()
  );

-- Restaurantes crean pedidos solo a su nombre
create policy "orders_restaurant_insert"
  on public.orders for insert
  with check (
    public.current_user_role() = 'restaurant'
    and restaurant_id = public.current_restaurant_id()
  );

-- Restaurantes pueden modificar solo estados limitados de sus pedidos
-- (la lógica detallada va en el service; esto es la red de seguridad)
create policy "orders_restaurant_update"
  on public.orders for update
  using (
    public.current_user_role() = 'restaurant'
    and restaurant_id = public.current_restaurant_id()
  );

-- Drivers ven pedidos disponibles (en ventana) o suyos
create policy "orders_driver_read"
  on public.orders for select
  using (
    public.current_user_role() = 'driver'
    and (
      driver_id = public.current_driver_id()
      or (status = 'waiting_driver' and appears_in_queue_at <= now())
    )
  );

-- Drivers actualizan solo sus pedidos
create policy "orders_driver_update"
  on public.orders for update
  using (
    public.current_user_role() = 'driver'
    and driver_id = public.current_driver_id()
  );

-- Lectura pública por shortId (tracking del cliente)
-- NO hay policy de SELECT pública con filter — el acceso público
-- va por endpoint /api/tracking/:shortId con lógica controlada.
```

### 5.4 · Policies de `restaurants`

```sql
-- Admin gestiona todo
create policy "restaurants_admin_all"
  on public.restaurants for all
  using (public.current_user_role() = 'admin');

-- El restaurante lee su propio perfil
create policy "restaurants_self_read"
  on public.restaurants for select
  using (user_id = auth.uid());

-- El restaurante puede actualizar su perfil (limitado por el endpoint)
create policy "restaurants_self_update"
  on public.restaurants for update
  using (user_id = auth.uid());

-- Los drivers pueden leer datos limitados del restaurante de sus pedidos
-- (para mostrar nombre, dirección, yapeNumber al entregar)
create policy "restaurants_driver_read"
  on public.restaurants for select
  using (
    public.current_user_role() = 'driver'
    and id in (
      select restaurant_id from public.orders
      where driver_id = public.current_driver_id()
    )
  );
```

### 5.5 · Policies de `drivers`

```sql
-- Admin gestiona todo
create policy "drivers_admin_all"
  on public.drivers for all
  using (public.current_user_role() = 'admin');

-- El driver lee su propio perfil
create policy "drivers_self_read"
  on public.drivers for select
  using (user_id = auth.uid());

-- El driver actualiza datos limitados
create policy "drivers_self_update"
  on public.drivers for update
  using (user_id = auth.uid());

-- Los restaurantes pueden leer datos públicos del driver asignado
-- (solo fullName y phone)
-- La restricción de campos se maneja en el SELECT del endpoint, no en RLS
create policy "drivers_restaurant_read"
  on public.drivers for select
  using (
    public.current_user_role() = 'restaurant'
    and id in (
      select driver_id from public.orders
      where restaurant_id = public.current_restaurant_id()
        and driver_id is not null
    )
  );
```

### 5.6 · Policies de `push_subscriptions`

```sql
-- Cada usuario gestiona sus propias suscripciones
create policy "push_subs_self"
  on public.push_subscriptions for all
  using (user_id = auth.uid());

-- El admin puede leer todas (para verificar si un driver tiene push)
create policy "push_subs_admin_read"
  on public.push_subscriptions for select
  using (public.current_user_role() = 'admin');
```

### 5.7 · Policies de `cash_settlements`

```sql
-- Admin ve y gestiona todo
create policy "cash_admin_all"
  on public.cash_settlements for all
  using (public.current_user_role() = 'admin');

-- Restaurantes ven y actualizan los suyos
create policy "cash_restaurant"
  on public.cash_settlements for all
  using (
    public.current_user_role() = 'restaurant'
    and restaurant_id = public.current_restaurant_id()
  );

-- Drivers ven y actualizan los suyos
create policy "cash_driver"
  on public.cash_settlements for all
  using (
    public.current_user_role() = 'driver'
    and driver_id = public.current_driver_id()
  );
```

### 5.8 · Policies de `settlements`

```sql
create policy "settlements_admin_all"
  on public.settlements for all
  using (public.current_user_role() = 'admin');

create policy "settlements_restaurant_read"
  on public.settlements for select
  using (
    public.current_user_role() = 'restaurant'
    and restaurant_id = public.current_restaurant_id()
  );
```

### 5.9 · Policies de `users`

```sql
-- Usuarios ven su propio registro
create policy "users_self_read"
  on public.users for select
  using (id = auth.uid());

-- Admin ve todos
create policy "users_admin_read"
  on public.users for select
  using (public.current_user_role() = 'admin');
```

### 5.10 · Bypass de RLS desde el servidor

Cuando el backend necesita hacer queries administrativas (crear un pedido desde un endpoint, actualizar balanceDue, etc.), debe usar el `SUPABASE_SERVICE_ROLE_KEY` que bypassa RLS. **Esto es seguro porque vive solo en el servidor.**

Prisma, al usar `DATABASE_URL`, se conecta con el usuario `postgres` que **bypassa RLS por defecto**. Esto significa que **Prisma no aplica RLS** — las policies solo actúan cuando el cliente se conecta directamente a Supabase (realtime subscriptions, uploads a storage, queries desde el browser con anon key).

**Consecuencia importante:** la validación en endpoints sigue siendo necesaria. RLS es la red de seguridad secundaria para las conexiones directas desde el cliente (realtime, storage), no para los endpoints del backend.

---

## 6. Habilitar Realtime en tablas

Supabase Realtime emite cambios automáticamente de las tablas que uno **publica**. Esto se configura con:

```sql
-- Habilitar realtime en las tablas que necesitan emitir cambios
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.cash_settlements;
alter publication supabase_realtime add table public.settlements;
alter publication supabase_realtime add table public.driver_availability;
```

No se habilita en `push_subscriptions` ni en `order_status_history` porque no es necesario para UI.

---

## 7. Migraciones Prisma

```bash
# Crear migración en desarrollo
npx prisma migrate dev --name init

# Aplicar migraciones en producción (Supabase)
npx prisma migrate deploy

# Regenerar cliente
npx prisma generate

# Ver estado
npx prisma migrate status

# Abrir Prisma Studio
npx prisma studio
```

**Importante:** `prisma migrate` usa `DIRECT_URL` (conexión directa sin pooler), no `DATABASE_URL`. Esto está configurado en el datasource.

---

## 8. Cliente Prisma — instancia global

```typescript
// lib/db.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
```

---

## 9. Cálculo de `appearsInQueueAt`

Se calcula al crear el pedido, no en runtime:

```typescript
// modules/orders/orders.service.ts
const PREP_TIME_MAP: Record<PrepTimeOption, number> = {
  fast: 10,
  normal: 20,
  slow: 30,
}

async function createOrder(data: CreateOrderInput) {
  const prepMinutes = PREP_TIME_MAP[data.prepTimeOption]
  const estimatedReadyAt = addMinutes(new Date(), prepMinutes)
  const appearsInQueueAt = addMinutes(estimatedReadyAt, -10) // 10 min antes

  // Para pedidos "fast" (10 min), appearsInQueueAt = createdAt (inmediato)
  // Para "normal" (20 min), appearsInQueueAt = createdAt + 10 min
  // Para "slow" (30 min), appearsInQueueAt = createdAt + 20 min

  return db.order.create({
    data: {
      ...data,
      prepTimeMinutes: prepMinutes,
      estimatedReadyAt,
      appearsInQueueAt,
      shortId: await generateUniqueShortId(),
      statusHistory: { create: { status: 'waiting_driver' } },
    },
  })
}
```

### Cuándo se recalcula

- **"Adelantar":** `appearsInQueueAt = now()` (el pedido entra inmediatamente a la bandeja)
- **Prórroga:** `estimatedReadyAt += extensionMinutes`, y si `status = waiting_driver`, `appearsInQueueAt = estimatedReadyAt - 10 min`

---

## 10. Función para generar shortId único

```typescript
// lib/short-id.ts
export async function generateUniqueShortId(): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

  for (let attempt = 0; attempt < 5; attempt++) {
    const shortId = Array.from({ length: 8 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('')

    const existing = await db.order.findUnique({
      where: { shortId },
      select: { id: true },
    })

    if (!existing) return shortId
  }

  throw new Error('No se pudo generar shortId único tras 5 intentos')
}
```

Con 36^8 = 2.8 billones de combinaciones, la colisión es despreciable para el volumen esperado.

---

## 11. Transiciones de estado válidas

```typescript
// modules/orders/orders.types.ts
export const VALID_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  waiting_driver:        ['heading_to_restaurant', 'cancelled'],
  heading_to_restaurant: ['waiting_at_restaurant', 'picked_up', 'cancelled'],
  waiting_at_restaurant: ['picked_up', 'cancelled'],
  picked_up:             ['delivered', 'cancelled'],
  delivered:             [],
  cancelled:             [],
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return VALID_STATUS_TRANSITIONS[from].includes(to)
}
```

**Admin bypass:** el admin puede cancelar desde cualquier estado. Esta regla vive en el service:

```typescript
if (from === 'delivered') {
  if (actorRole !== 'admin') throw new Error('No se puede modificar un pedido entregado')
}
```

---

## 12. Queries de métricas con Prisma

```typescript
// Pedidos por hora del día (últimos 30 días)
const result = await db.$queryRaw<{ hora: number; pedidos: number }[]>`
  SELECT
    EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Lima')::int AS hora,
    COUNT(*)::int AS pedidos
  FROM orders
  WHERE status = 'delivered'
    AND created_at > NOW() - INTERVAL '30 days'
  GROUP BY hora
  ORDER BY hora
`

// Tiempo promedio real vs estimado por prep_time_option
const result = await db.$queryRaw`
  SELECT
    prep_time_option,
    ROUND(AVG(EXTRACT(EPOCH FROM (picked_up_at - created_at)) / 60))::int AS minutos_reales,
    AVG(prep_time_minutes)::int AS minutos_estimados,
    COUNT(*)::int AS total
  FROM orders
  WHERE picked_up_at IS NOT NULL
  GROUP BY prep_time_option
`

// Tiempo de espera del driver por restaurante
const result = await db.$queryRaw`
  SELECT
    r.name AS restaurante,
    ROUND(AVG(EXTRACT(EPOCH FROM (o.picked_up_at - o.waiting_at)) / 60))::int AS espera_promedio_min,
    COUNT(*)::int AS total_pedidos
  FROM orders o
  JOIN restaurants r ON r.id = o.restaurant_id
  WHERE o.waiting_at IS NOT NULL AND o.picked_up_at IS NOT NULL
  GROUP BY r.name
  ORDER BY espera_promedio_min DESC
`

// Uso de prórroga por restaurante
const result = await db.$queryRaw`
  SELECT
    r.name,
    COUNT(*) FILTER (WHERE o.extension_used) AS con_prorroga,
    COUNT(*) AS total,
    ROUND(100.0 * COUNT(*) FILTER (WHERE o.extension_used) / COUNT(*), 1) AS porcentaje
  FROM orders o
  JOIN restaurants r ON r.id = o.restaurant_id
  WHERE o.status = 'delivered'
  GROUP BY r.name
`

// Deuda acumulada por restaurante
const restaurants = await db.restaurant.findMany({
  where: { isActive: true },
  select: { name: true, balanceDue: true, isBlocked: true },
  orderBy: { balanceDue: 'desc' },
})
```

---

## 13. Buckets de Storage

```sql
-- Crear buckets desde el panel Supabase o via SQL
insert into storage.buckets (id, name, public)
values
  ('restaurant-qrs', 'restaurant-qrs', true),
  ('payment-proofs', 'payment-proofs', false),
  ('logos', 'logos', true);
```

### Policies de Storage

```sql
-- Admin puede hacer todo
create policy "Admin all on restaurant-qrs"
  on storage.objects for all
  using (bucket_id = 'restaurant-qrs' and public.current_user_role() = 'admin');

-- Cualquiera puede leer QRs (son públicos)
create policy "Public read restaurant-qrs"
  on storage.objects for select
  using (bucket_id = 'restaurant-qrs');

-- Drivers pueden subir comprobantes de pago de sus pedidos
create policy "Drivers upload payment proofs"
  on storage.objects for insert
  with check (
    bucket_id = 'payment-proofs'
    and public.current_user_role() = 'driver'
    and (storage.foldername(name))[1] in (
      select id::text from public.orders
      where driver_id = public.current_driver_id()
    )
  );

-- Restaurantes leen sus propios comprobantes
create policy "Restaurants read own payment proofs"
  on storage.objects for select
  using (
    bucket_id = 'payment-proofs'
    and public.current_user_role() = 'restaurant'
    and (storage.foldername(name))[1] in (
      select id::text from public.orders
      where restaurant_id = public.current_restaurant_id()
    )
  );
```

---

## 14. Seed inicial

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const db = new PrismaClient()
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function main() {
  // 1. Crear usuario en Supabase Auth
  const { data: authUser, error } = await supabaseAdmin.auth.admin.createUser({
    email: process.env.ADMIN_SEED_EMAIL!,
    password: process.env.ADMIN_SEED_PASSWORD!,
    email_confirm: true,
    user_metadata: {
      role: 'admin',
    },
  })

  if (error) throw error

  // 2. El trigger on_auth_user_created debería haber creado la fila en public.users
  // Verificamos
  const user = await db.user.findUnique({
    where: { id: authUser.user.id },
  })

  if (!user) {
    // Fallback: crear manualmente si el trigger no existe aún
    await db.user.create({
      data: {
        id: authUser.user.id,
        email: authUser.user.email!,
        role: 'admin',
        isActive: true,
      },
    })
  }

  console.log('✅ Admin creado:', authUser.user.email)
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
```

```bash
npx prisma db seed
```

```json
// package.json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

---

## 15. Backups y recuperación

**Supabase hace backups automáticos diarios** incluidos en todos los planes:

- **Free:** backups diarios con 7 días de retención
- **Pro:** backups diarios con 7 días de retención + PITR (point-in-time recovery) hasta 7 días

Para restaurar desde un backup, se hace desde el panel de Supabase sin scripts manuales.

### Backups adicionales (manual, recomendado)

Para seguridad extra, especialmente durante el piloto:

```bash
# Desde tu máquina
pg_dump "$DIRECT_URL" > tindivo_$(date +%Y%m%d).sql

# Almacenar en S3, Drive, o donde prefieras
```

---

## 16. Resumen · qué cambió respecto a v2

### Tablas modificadas
- **`User`:** `id` ahora coincide con `auth.users.id` de Supabase. Se elimina `passwordHash` (Supabase lo maneja). Se eliminan `createdAt`/`updatedAt` ambiguos.
- **`Driver`:** se elimina `expoPushToken`. Se reemplaza por la tabla `PushSubscription`.
- **`Order`:** se agrega `appearsInQueueAt` (explícito, no calculado), `extensionUsed`, `extensionMinutes`, `readyEarlyUsed`, `cancelReason`.
- **`Restaurant`:** se agrega `blockReason`.
- **`CashSettlement`:** más campos para rastrear el flujo completo (delivered → confirmed/disputed → resolved).
- **`Settlement`:** se agrega `paymentMethod` y `paymentNote`.

### Tablas nuevas
- **`PushSubscription`:** suscripciones Web Push multi-dispositivo por usuario.

### Nuevo
- **Row Level Security** activado en todas las tablas con policies por rol.
- **Publicación de tablas para Realtime** (`supabase_realtime`).
- **Trigger de sincronización** entre `auth.users` y `public.users`.
- **Buckets de Storage** definidos con sus policies.

### Eliminado
- Configuración de Contabo VPS, PgBouncer self-hosted.
- Campo `Driver.expoPushToken`.
- Cualquier referencia a Ably o Firebase Storage.

---

**Este schema está alineado con la arquitectura v3 y el API v3. Cualquier endpoint o historia de usuario en los documentos de producto (restaurante, driver PWA, admin) puede implementarse con este esquema.**
