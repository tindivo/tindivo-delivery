# Graph Report - .  (2026-07-10)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 3187 nodes · 8370 edges · 162 communities (142 shown, 20 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.86)
- Token cost: 6,966 input · 7,984 output

## Graph Freshness
- Built from commit: `ccf9d971`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- index.ts
- tab-operations.tsx
- requireAuth
- problemCode
- container.ts
- order.ts
- index.ts
- DomainError
- driver-form.tsx
- OrderRepository
- order.mapper.ts
- Button
- dto.ts
- Result
- Order
- auto-accept-expired-transfer-requests.use-case.test.ts
- Icon
- active-order-detail.tsx
- EventPublisher
- Driver PWA Requirements
- driver-profile.tsx
- dependencies
- biome.json
- dependencies
- index.ts
- business-dashboard.tsx
- order-preview.tsx
- dependencies
- login-register-sheet.tsx
- exports
- Money
- index.ts
- item-form-sheet.tsx
- platform-schedule.policy.ts
- validate.ts
- dto.ts
- dependencies
- compilerOptions
- parseJson
- cash-settlements-list.tsx
- admin.ts
- ServerClient
- home-tabs.tsx
- useRealtimeChannel
- package.json
- use-agenda.ts
- restaurant-history.tsx
- ApiClient
- package.json
- admin-dashboard.tsx
- available-orders-list.tsx
- Row Level Security (RLS)
- restaurantCatalogMoved
- platform-schedule-form.tsx
- tracking-sent-list.tsx
- register-payment-sheet.tsx
- client.ts
- middleware.ts
- index.ts
- dto.ts
- route.ts
- ApiError
- restaurant-order-detail.tsx
- index.ts
- common.ts
- Coordinates
- .pen
- types.gen.ts
- use-realtime-channel.ts
- order-detail.tsx
- dto.ts
- OrderStatus
- tracking-view.tsx
- team-orders-list.tsx
- use-push-subscription.ts
- scripts
- package.json
- disputes-list.tsx
- use-geolocated-navigation.ts
- package.json
- compilerOptions
- dto.ts
- customer.ts
- compilerOptions
- SupabaseCustomerAddressRepository
- SupabaseTransferRequestsRepository
- tasks
- orders-history-list.tsx
- dto.ts
- businesses-list.tsx
- layout.tsx
- deuda-view.tsx
- request-order-sheet.tsx
- request-order-transfer.use-case.test.ts
- ShortId
- mark-delivered-sheet.tsx
- frequent-customer-detail-drawer.tsx
- devDependencies
- dto.ts
- tsconfig.json
- layout.tsx
- received-requests-banner.tsx
- package.json
- compilerOptions
- middleware.ts
- tsconfig.json
- support-phone-form.tsx
- customer-info-card.tsx
- tsconfig.json
- tsconfig.json
- UuidSchema
- SupabaseCustomerProfileRepository
- AggregateRoot
- tsconfig.json
- tsconfig.json
- route.ts
- install-prompt-banner.tsx
- tracking-pending-list.tsx
- driver-history.tsx
- change-payment-method-modal.tsx
- install-prompt-banner.tsx
- API App (Next.js)
- allowedVersions
- tsconfig.json
- restaurant-profile.tsx
- confirm-pickup-modal.tsx
- upcoming-orders-section.tsx
- errors.ts
- base.json
- server.ts
- next.config.mjs
- next.config.mjs
- sw.ts
- CheckPlatformScheduleUseCase
- generate-pwa-icons.mjs
- deno.json
- layout.tsx
- middleware.ts
- sw.ts
- build
- dev
- next.config.mjs
- Idempotency (Stripe Pattern)
- preset.ts
- Failure
- Success
- Turborepo Monorepo
- UI Package (Design System)
- Tindivo Project
- Location Permission

## God Nodes (most connected - your core abstractions)
1. `problemCode()` - 225 edges
2. `requireAuth()` - 206 edges
3. `Icon()` - 112 edges
4. `parseJson()` - 80 edges
5. `DomainError` - 78 edges
6. `createAdminClient()` - 76 edges
7. `Order` - 74 edges
8. `Result` - 74 edges
9. `ServerClient` - 68 edges
10. `OrderRepository` - 62 edges

## Surprising Connections (you probably didn't know these)
- `buildTransferOrderToDriverUseCase()` --calls--> `createAdminClient()`  [EXTRACTED]
  apps/api/lib/core/container.ts → packages/supabase/src/admin.ts
- `getDriverRepository()` --calls--> `createAdminClient()`  [EXTRACTED]
  apps/api/lib/core/container.ts → packages/supabase/src/admin.ts
- `TrackingPage()` --calls--> `createAdminClient()`  [EXTRACTED]
  apps/customer/src/app/pedidos/[shortId]/page.tsx → packages/supabase/src/admin.ts
- `TabButton()` --calls--> `cn()`  [EXTRACTED]
  apps/web/src/features/motorizado/home/components/home-tabs.tsx → packages/ui/src/lib/cn.ts
- `POST()` --calls--> `createAdminClient()`  [EXTRACTED]
  apps/api/app/api/v1/admin/cash-settlements/[id]/resolve/route.ts → packages/supabase/src/admin.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Tindivo System** — claude_apps_api, claude_apps_web, claude_apps_customer, claude_package_core, claude_package_supabase, claude_package_contracts, claude_package_ui [INFERRED 1.00]
- **Core Domain Modules** — claude_module_orders, claude_module_restaurants, claude_module_drivers, claude_module_notifications [EXTRACTED 1.00]
- **Event-Driven Flow** — claude_concept_event_driven, claude_database_table_domain_events, docs_arquitectura_v3_supabase_realtime, supabase_ready_edge_functions, claude_cron_jobs [INFERRED 0.85]
- **Tindivo Platform Apps** — admin_panel, driver_pwa, restaurant_app [EXTRACTED 1.00]
- **Tindivo Operational Roles** — admin_user, driver_user, cashier_user [INFERRED 0.90]

## Communities (162 total, 20 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.04
Nodes (68): DriversBreakdown(), money(), VEHICLE_ICON, money(), RestaurantsBreakdown(), Props, RestaurantsList(), useAdminRestaurants() (+60 more)

### Community 1 - "tab-operations.tsx"
Cohesion: 0.06
Nodes (65): ChartCard(), DeltaPill(), GlassTooltip(), Cell, DOW_LABELS, Heatmap(), Sparkline(), isTabId() (+57 more)

### Community 2 - "requireAuth"
Cohesion: 0.05
Nodes (56): GET(), GET(), GET(), PATCH(), avgSeconds(), defaultRangeSanJacinto(), GET(), MetricsResponse (+48 more)

### Community 3 - "problemCode"
Cohesion: 0.09
Nodes (43): PATCH(), DELETE(), PATCH(), POST(), DELETE(), PATCH(), POST(), DELETE() (+35 more)

### Community 4 - "container.ts"
Cohesion: 0.07
Nodes (50): POST(), POST(), GET(), GET(), PATCH(), serialize(), UpdateProfileSchema, POST() (+42 more)

### Community 5 - "order.ts"
Cohesion: 0.06
Nodes (36): computeCashOwed(), CreateOrderInput, DeliveryPaymentInput, OrderProps, OrderSource, CustomerDataSaved, DriverArrived, OrderAccepted (+28 more)

### Community 6 - "index.ts"
Cohesion: 0.03
Nodes (54): Clock, SystemClock, AcceptOrderByRestaurantCommand, AcceptOrderByRestaurantResult, AcceptOrderCommand, AcceptOrderResult, AcceptTransferRequestCommand, AcceptTransferRequestResult (+46 more)

### Community 7 - "DomainError"
Cohesion: 0.14
Nodes (25): CustomerDataMissing, DriverCapacityExceeded, DriverNotAssigned, DriverNotAuthorizedForRestaurant, InvalidPaymentChange, InvalidTransfer, NoPrepTimeToReduce, OrderAlreadyAccepted (+17 more)

### Community 8 - "driver-form.tsx"
Cohesion: 0.05
Nodes (38): AdminEditDriverPage(), Props, AdminEditRestaurantPage(), Props, DayCode, DAYS, DriverForm(), Props (+30 more)

### Community 9 - "OrderRepository"
Cohesion: 0.08
Nodes (22): AssignmentRulesRepository, OrderRepository, AcceptOrderUseCase, ExpiredReason, AutoAssignOrderUseCase, startOfLimaDay(), NOW, RepoWithMock (+14 more)

### Community 10 - "order.mapper.ts"
Cohesion: 0.08
Nodes (19): NOW, Props, BANDS, DeliveryDistanceBand, DeliveryDistanceBandValue, Props, Props, OccupancySlots (+11 more)

### Community 11 - "Button"
Cohesion: 0.09
Nodes (30): CheckoutSheet(), Props, CustomerApp(), MaintenancePopup(), ProductSheet(), Props, Props, RestaurantMarketplace() (+22 more)

### Community 12 - "dto.ts"
Cohesion: 0.04
Nodes (45): AcceptOrderResponse, AcceptTransferRequestResponse, AdminOrderFiltersRequest, BLACKLISTED_PHONES, CancelOrderRequest, ChangePaymentMethodRequest, ChangePaymentMethodResponse, ClaimUrgentOrderResponse (+37 more)

### Community 13 - "Result"
Cohesion: 0.14
Nodes (3): AutoAcceptExpiredTransferRequestsUseCase, DriverId, Result

### Community 14 - "Order"
Cohesion: 0.06
Nodes (12): useDeliverCash(), Order, InvalidStateTransition, OrderNotEditable, PaymentChangeNotAllowed, CANCEL_BY_ADMIN, CANCEL_BY_RESTAURANT, CancellationPolicy (+4 more)

### Community 15 - "auto-accept-expired-transfer-requests.use-case.test.ts"
Cohesion: 0.09
Nodes (22): DriverRepository, EligiblePeer, EligiblePeerQuery, SinglePeerQuery, CreatePendingInput, TransferRequestsRepository, TransferRequestStatus, AcceptTransferRequestUseCase (+14 more)

### Community 16 - "Icon"
Cohesion: 0.08
Nodes (27): RestauranteHome(), ComingSoon(), Props, Props, AddressSuggestionPopup(), AddressSuggestionPopupProps, getRelativeTimeString(), BLACKLISTED_PHONES (+19 more)

### Community 17 - "active-order-detail.tsx"
Cohesion: 0.07
Nodes (34): useEditAddress(), ActiveOrderDetail(), buildRestaurantDestination(), CurrentPhase, currentPhaseForStatus(), formatElapsedSince(), hasDeliveryCoords(), PaymentBreakdown() (+26 more)

### Community 18 - "EventPublisher"
Cohesion: 0.07
Nodes (15): EventPublisher, AssignmentCandidateQuery, RejectionsRepository, AcceptOrderByRestaurantUseCase, NOW, EditOrderByRestaurantUseCase, NOW, RepoWithMock (+7 more)

### Community 19 - "Driver PWA Requirements"
Cohesion: 0.07
Nodes (42): Admin Interventions, Admin Panel, Admin User, Advance Notice (Early Ready), Alert System, Backend Database, Order Cancellation, Cash Liquidation (+34 more)

### Community 20 - "driver-profile.tsx"
Cohesion: 0.08
Nodes (21): MotorizadoLayout(), navItems, AdminShell(), items, LoginForm(), fullSignOut(), EfectivoList(), money() (+13 more)

### Community 21 - "dependencies"
Cohesion: 0.05
Nodes (41): dependencies, class-variance-authority, clsx, leaflet, motion, next, @radix-ui/react-dialog, @radix-ui/react-label (+33 more)

### Community 22 - "biome.json"
Cohesion: 0.05
Nodes (40): noForEach, noUnusedImports, noUnusedVariables, files, ignore, ignoreUnknown, formatter, arrowParentheses (+32 more)

### Community 23 - "dependencies"
Cohesion: 0.05
Nodes (39): dependencies, @hookform/resolvers, motion, next, react, react-dom, react-hook-form, recharts (+31 more)

### Community 24 - "index.ts"
Cohesion: 0.14
Nodes (13): CustomerOrderDetailWithItems, CustomerOrderHistoryItem, CustomerProfileRepository, GetMyProfileCommand, GetMyProfileUseCase, ListMyOrdersCommand, ListMyOrdersUseCase, ReorderMyOrderCommand (+5 more)

### Community 25 - "business-dashboard.tsx"
Cohesion: 0.10
Nodes (28): AddGroupForm(), AddOptionForm(), BusinessDashboard(), groupLimitsLabel(), GroupMode, MenuData, MenuGroup, MenuItem (+20 more)

### Community 26 - "order-preview.tsx"
Cohesion: 0.10
Nodes (27): OrderPreview(), paymentLabel(), Props, useOrderPreview(), computeUrgencyTier(), elapsedLabel(), formatElapsed(), formatRemaining() (+19 more)

### Community 27 - "dependencies"
Cohesion: 0.06
Nodes (34): dependencies, motion, next, react, react-dom, serwist, @serwist/next, @supabase/ssr (+26 more)

### Community 28 - "login-register-sheet.tsx"
Cohesion: 0.09
Nodes (15): AccountView(), HistoryView(), LoginButton(), LoginRegisterSheet(), Mode, Props, WelcomeToast(), CustomerRole (+7 more)

### Community 29 - "exports"
Cohesion: 0.06
Nodes (32): dependencies, @supabase/supabase-js, @tindivo/supabase, devDependencies, @tindivo/config, @types/node, typescript, vitest (+24 more)

### Community 30 - "Money"
Cohesion: 0.09
Nodes (6): Money, PaymentIntent, addPen(), fromMinorUnits(), subPen(), toMinorUnits()

### Community 31 - "index.ts"
Cohesion: 0.17
Nodes (19): GET(), GET(), GET(), GET(), GET(), GET(), round2(), GET() (+11 more)

### Community 32 - "item-form-sheet.tsx"
Cohesion: 0.14
Nodes (22): CategoryFormSheet(), Props, ItemFormSheet(), ModifiersEditor(), Props, MenuEditor(), QK, useCreateCategory() (+14 more)

### Community 33 - "platform-schedule.policy.ts"
Cohesion: 0.13
Nodes (13): PlatformSettingsRepository, CheckPlatformScheduleResult, addDaysLima(), ALL_WEEKDAYS, computeNextOpenAt(), DEFAULT_PLATFORM_SCHEDULE, limaParts(), parseLimaDate() (+5 more)

### Community 34 - "validate.ts"
Cohesion: 0.13
Nodes (21): POST(), GET(), PATCH(), GET(), POST(), GET(), peruDayStartUtc(), shiftYmd() (+13 more)

### Community 35 - "dto.ts"
Cohesion: 0.09
Nodes (21): CashSettlementResponse, ConfirmCashRequest, DeliverCashRequest, DisputeCashRequest, ResolveCashRequest, MoneyPenSchema, TimestampSchema, CancellationReason (+13 more)

### Community 36 - "dependencies"
Cohesion: 0.07
Nodes (26): dependencies, next, react, react-dom, @supabase/ssr, @supabase/supabase-js, @tindivo/contracts, @tindivo/core (+18 more)

### Community 37 - "compilerOptions"
Cohesion: 0.07
Nodes (26): compilerOptions, allowJs, allowSyntheticDefaultImports, checkJs, declaration, declarationMap, esModuleInterop, forceConsistentCasingInFileNames (+18 more)

### Community 38 - "parseJson"
Cohesion: 0.13
Nodes (17): POST(), POST(), PUT(), GET(), POST(), GET(), mapRestaurant(), PATCH() (+9 more)

### Community 39 - "cash-settlements-list.tsx"
Cohesion: 0.15
Nodes (20): buildHeaderCopy(), CashSettlementsList(), colorForStatus(), formatDate(), formatTime(), SettlementCard(), STATUS_ORDER, StatusPill() (+12 more)

### Community 40 - "admin.ts"
Cohesion: 0.08
Nodes (24): AdminBusinessRow, AdminCancellationReasonsResponse, AdminDailySummary, AdminDailySummaryDriverRow, AdminDailySummaryRestaurantRow, AdminDemandHeatmapResponse, AdminDriversPerformanceResponse, AdminMetricsResponse (+16 more)

### Community 41 - "ServerClient"
Cohesion: 0.13
Nodes (7): OrderMapper, isPositiveInt(), parseRules(), SupabaseAssignmentRulesRepository, SupabaseOrderRepository, SupabaseRejectionsRepository, ServerClient

### Community 42 - "home-tabs.tsx"
Cohesion: 0.16
Nodes (15): ActiveOrder, MyActiveOrdersList(), paymentLabel(), STATUS_ORDER, useCurrentUserId(), useDriverActiveOrders(), useDriverActiveOrdersRealtime(), useDriverCapacity() (+7 more)

### Community 43 - "useRealtimeChannel"
Cohesion: 0.14
Nodes (17): useTrackingPending(), useMyRestaurantId(), useRestaurantOrders(), PendingAcceptanceList(), QK, useMyRestaurantId(), usePendingAcceptanceOrders(), supabase (+9 more)

### Community 44 - "package.json"
Cohesion: 0.08
Nodes (24): dependencies, @supabase/ssr, @supabase/supabase-js, devDependencies, next, @tindivo/config, @types/node, typescript (+16 more)

### Community 45 - "use-agenda.ts"
Cohesion: 0.18
Nodes (17): AgendaTabs(), EventosCapturaView(), formatDateTime(), formatRelativeDate(), PorCurarView(), formatRelativeDate(), TodosRegistrosView(), BLACKLIST_PHONES (+9 more)

### Community 46 - "restaurant-history.tsx"
Cohesion: 0.14
Nodes (18): bandLabel(), formatYmd(), paymentLabel(), peruToday(), Preset, presetRange(), PRESETS, rangeLabel() (+10 more)

### Community 47 - "ApiClient"
Cohesion: 0.17
Nodes (12): adminApi(), ApiClient, ApiClientConfig, RequestOptions, customerApi(), CashSummaryItem, CashSummaryOrderItem, driverApi() (+4 more)

### Community 48 - "package.json"
Cohesion: 0.08
Nodes (23): dependencies, zod, devDependencies, @tindivo/config, typescript, exports, ./cash-settlements, ./drivers (+15 more)

### Community 49 - "admin-dashboard.tsx"
Cohesion: 0.15
Nodes (14): AdminOrdersListPage(), AdminDashboard(), computeMetrics(), fmtDur(), paymentLabel(), DayKpis(), fmtMin(), money() (+6 more)

### Community 50 - "available-orders-list.tsx"
Cohesion: 0.16
Nodes (15): AvailableOrdersList(), OrderItem, paymentLabel(), OverdueBanner(), Props, ActiveOrders(), OrderItem, paymentLabel() (+7 more)

### Community 51 - "Row Level Security (RLS)"
Cohesion: 0.09
Nodes (23): Event-Driven Architecture (Outbox), Reactive Driver Assignment, pg_cron Jobs, Domain Events Outbox Table, Drivers Module (Domain), Notifications Module, Orders Module (Domain), Restaurants Module (Domain) (+15 more)

### Community 52 - "restaurantCatalogMoved"
Cohesion: 0.18
Nodes (13): restaurantCatalogMoved(), DELETE(), PATCH(), POST(), DELETE(), PATCH(), POST(), DELETE() (+5 more)

### Community 53 - "platform-schedule-form.tsx"
Cohesion: 0.16
Nodes (12): AssignmentRulesForm(), DAYS, PlatformScheduleForm(), QK, useAssignmentRulesAdmin(), useUpdateAssignmentRules(), QK, usePlatformScheduleAdmin() (+4 more)

### Community 54 - "tracking-sent-list.tsx"
Cohesion: 0.14
Nodes (15): SendTrackingButton(), buildTrackingMessage(), fmtDateTime(), SAN_JACINTO_DT, TrackingRow(), TrackingSentList(), useTrackingSent(), formatPePhone() (+7 more)

### Community 55 - "register-payment-sheet.tsx"
Cohesion: 0.16
Nodes (13): DebtSummaryList(), SelectedRestaurant, formatDate(), METHOD_LABEL, PaymentsHistoryList(), PaymentsView(), METHODS, PaymentMethod (+5 more)

### Community 56 - "client.ts"
Cohesion: 0.20
Nodes (4): useDriverSupportPhone(), driver, orders, Orders

### Community 57 - "middleware.ts"
Cohesion: 0.17
Nodes (19): base64UrlDecode(), decodeJwtClaims(), getClaimsFromSession(), getRoles(), homePathForRole(), homePathForRoles(), Role, TindivoClaims (+11 more)

### Community 58 - "index.ts"
Cohesion: 0.11
Nodes (14): RFC-8030, ExistingAlert, StuckOrder, CashSettlementContext, EventContext, EventRow, fmtPEN(), GroupKey (+6 more)

### Community 59 - "dto.ts"
Cohesion: 0.10
Nodes (19): ActiveOrderRef, ActiveOrdersBlockerError, CommissionPerOrder, CommissionPerOrderSchema, CreateRestaurantRequest, FarDistanceSurcharge, FarDistanceSurchargeSchema, FrequentCustomerDetailQuery (+11 more)

### Community 60 - "route.ts"
Cohesion: 0.18
Nodes (16): POST(), buildOrderNotes(), CartLine, createCustomerOrder(), POST(), priceCart(), roundMoney(), AcceptSchema (+8 more)

### Community 61 - "ApiError"
Cohesion: 0.14
Nodes (14): EditOrderSheet(), parseMoney(), Payment, paymentOptions, Props, useEditRestaurantOrder(), AcceptOrderSheet(), PREP_PRESETS (+6 more)

### Community 62 - "restaurant-order-detail.tsx"
Cohesion: 0.19
Nodes (12): formatChangeAt(), formatDeliveryDate(), formatDeliveryTime(), paymentLabel(), Props, RestaurantOrderDetail(), vehicleIcon(), vehicleLabel() (+4 more)

### Community 63 - "index.ts"
Cohesion: 0.19
Nodes (16): PendingOrderCard(), Props, AcceptOrderByRestaurantResponse, CustomerOrderItemDetail, CustomerOrderItemsResponse, MenuItemRow, MenuModifierGroupRow, MenuModifierOptionRow (+8 more)

### Community 64 - "common.ts"
Cohesion: 0.13
Nodes (14): AccentColor, AccentColorSchema, Coordinates, CoordinatesSchema, MoneyPen, Pagination, PaginationSchema, PhonePe (+6 more)

### Community 65 - "Coordinates"
Cohesion: 0.15
Nodes (3): CustomerAddressRepository, buildMapsUrl(), Coordinates

### Community 66 - ".pen"
Cohesion: 0.33
Nodes (8): buildCustomerPwaOrder(), buildRestaurantPwaOrder(), buildOrder(), buildOrder(), buildOrder(), buildOrder(), buildOrder(), pickedUpOrder()

### Community 67 - "types.gen.ts"
Cohesion: 0.14
Nodes (13): createBrowserClient(), signOutLocal(), CookieToSet, CookieStore, CompositeTypes, Constants, Database, DatabaseWithoutInternals (+5 more)

### Community 68 - "use-realtime-channel.ts"
Cohesion: 0.16
Nodes (13): ALLOWED, Result, Setter, supabase, Listener, Options, PostgresChangesConfig, PostgresChangesEvent (+5 more)

### Community 69 - "order-detail.tsx"
Cohesion: 0.21
Nodes (13): Props, diffSeconds(), fmtCountdown(), fmtDateTime(), fmtDuration(), fmtTime(), LIMA_DATETIME, LIMA_TIME (+5 more)

### Community 70 - "dto.ts"
Cohesion: 0.12
Nodes (14): CancellationReasonRow, CancellationReasonsResponse, DemandHeatmapResponse, DriverPerformanceRow, DriversPerformanceResponse, HeatmapCell, MetricsRangeEnvelope, MetricsRangeQuery (+6 more)

### Community 72 - "tracking-view.tsx"
Cohesion: 0.16
Nodes (12): Props, TrackingPage(), formatTime(), HERO_ICON_BY_STATUS, HERO_VARIANT_BY_STATUS, InteractiveMap, Props, STATUS_LABELS (+4 more)

### Community 73 - "team-orders-list.tsx"
Cohesion: 0.18
Nodes (12): paymentLabel(), statusLabel(), TeamOrder, TeamOrdersList(), useTeamOrders(), fadeIn, fadeInUp, listItem (+4 more)

### Community 74 - "use-push-subscription.ts"
Cohesion: 0.25
Nodes (11): AutoHealPush(), forgetSentEndpoint(), hasActiveSession(), recallSentEndpoint(), rememberSentEndpoint(), Status, SubscribeFailReason, SubscribeResult (+3 more)

### Community 75 - "scripts"
Cohesion: 0.13
Nodes (15): scripts, build, check, clean, db:push, db:reset, db:start, db:stop (+7 more)

### Community 76 - "package.json"
Cohesion: 0.13
Nodes (14): dependencies, @tindivo/contracts, devDependencies, @tindivo/config, typescript, exports, main, name (+6 more)

### Community 77 - "disputes-list.tsx"
Cohesion: 0.23
Nodes (9): DisputeCard(), DisputesList(), formatDate(), money(), StatusFilter, useAdminCashSettlements(), useResolveCashSettlement(), AdminCashSettlementRow (+1 more)

### Community 78 - "use-geolocated-navigation.ts"
Cohesion: 0.21
Nodes (9): buildAddressUrl(), Destination, isIOSLike(), openExternalMapsUrl(), useGeolocatedNavigation(), buildGoogleMapsDirectionsUrl(), buildWaMeUrl(), Coordinates (+1 more)

### Community 79 - "package.json"
Cohesion: 0.14
Nodes (13): dependencies, tailwindcss, exports, ./tailwind/preset, ./tailwind/theme.css, ./tsconfig/base.json, ./tsconfig/library.json, ./tsconfig/nextjs.json (+5 more)

### Community 80 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, allowJs, incremental, jsx, lib, module, moduleResolution, noEmit (+5 more)

### Community 81 - "dto.ts"
Cohesion: 0.14
Nodes (12): CreateCustomerOrderRequest, CreateCustomerOrderResponse, CustomerCartItem, CustomerCartModifier, CustomerPaymentStatus, MenuCategory, MenuItem, MenuModifierGroup (+4 more)

### Community 82 - "customer.ts"
Cohesion: 0.15
Nodes (12): BusinessMenuTree, BusinessProfileDto, CustomerOrderHistoryDto, CustomerProfileDto, CustomerReorderDto, MenuCategoryRow, MenuItemRow, MenuModifierGroupRow (+4 more)

### Community 83 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, composite, declaration, lib, module, moduleResolution, outDir, rootDir (+4 more)

### Community 84 - "SupabaseCustomerAddressRepository"
Cohesion: 0.33
Nodes (3): AddressCaptureEvent, CustomerAddress, SupabaseCustomerAddressRepository

### Community 85 - "SupabaseTransferRequestsRepository"
Cohesion: 0.26
Nodes (3): TransferRequest, SupabaseTransferRequestsRepository, toDomain()

### Community 86 - "tasks"
Cohesion: 0.15
Nodes (13): cache, dependsOn, tasks, clean, lint, test, test:e2e, type-check (+5 more)

### Community 87 - "orders-history-list.tsx"
Cohesion: 0.23
Nodes (7): fmtDateTime(), OrdersHistoryList(), SAN_JACINTO_DT, StatusFilter, OrderLike, OrdersListResponse, useAdminOrdersHistory()

### Community 88 - "dto.ts"
Cohesion: 0.17
Nodes (10): AdminUpdateBusiness, CreateCategory, CreateGroup, CreateItem, CreateOption, UpdateBusinessProfile, UpdateCategory, UpdateGroup (+2 more)

### Community 89 - "businesses-list.tsx"
Cohesion: 0.27
Nodes (6): BusinessesList(), BusinessRow(), BusinessRowProps, EnableDeliveryModalProps, useAdminBusinesses(), useUpdateAdminBusiness()

### Community 90 - "layout.tsx"
Cohesion: 0.24
Nodes (6): metadata, viewport, Providers(), RealtimeAuthBridge(), RegisterPWA(), Window

### Community 91 - "deuda-view.tsx"
Cohesion: 0.27
Nodes (7): DeudaView(), FALLBACK_METHOD, formatDateTime(), METHOD_CONFIG, MethodCfg, money(), useMyPayments()

### Community 92 - "request-order-sheet.tsx"
Cohesion: 0.33
Nodes (7): useClaimUrgentOrder(), Props, RequestOrderSheet(), useRequestTransfer(), generateUUID(), storageKey(), useIdempotencyKey()

### Community 93 - "request-order-transfer.use-case.test.ts"
Cohesion: 0.29
Nodes (9): RequestOrderTransferUseCase, buildDriversRepo(), buildOrdersRepo(), buildPublisher(), buildRulesRepo(), buildTransferRepo(), buildUseCase(), fixedClock() (+1 more)

### Community 94 - "ShortId"
Cohesion: 0.20
Nodes (3): ShortId, generateShortId(), isValidShortId()

### Community 95 - "mark-delivered-sheet.tsx"
Cohesion: 0.27
Nodes (8): Kind, MarkDeliveredSheet(), Method, METHOD_OPTIONS, methodLabel(), parseMoney(), Props, useMarkDelivered()

### Community 96 - "frequent-customer-detail-drawer.tsx"
Cohesion: 0.36
Nodes (8): formatAvgDaysBetween(), formatDateTime(), FrequentCustomerDetailDrawer(), getCategoryMeta(), Props, translateDayOfWeek(), translateTimeRange(), useRestaurantFrequentCustomerDetail()

### Community 97 - "devDependencies"
Cohesion: 0.20
Nodes (9): devDependencies, @biomejs/biome, dotenv-cli, sharp, turbo, typescript, globalDependencies, globalEnv (+1 more)

### Community 98 - "dto.ts"
Cohesion: 0.20
Nodes (8): PhonePeSchema, CreateDriverRequest, DriverResponse, SetDriverActiveRequest, SetDriverRestaurantsRequest, ToggleAvailabilityRequest, UpdateDriverRequest, VehicleType

### Community 99 - "tsconfig.json"
Cohesion: 0.22
Nodes (8): compilerOptions, baseUrl, paths, exclude, extends, include, @/*, @/lib/*

### Community 100 - "layout.tsx"
Cohesion: 0.28
Nodes (5): metadata, viewport, Providers(), RegisterPWA(), Window

### Community 101 - "received-requests-banner.tsx"
Cohesion: 0.33
Nodes (6): Props, ReceivedRequestsBanner(), RequestCard(), RequestItem, useAcceptTransferRequest(), useRejectTransferRequest()

### Community 102 - "package.json"
Cohesion: 0.22
Nodes (8): description, engines, node, pnpm, name, packageManager, private, version

### Community 103 - "compilerOptions"
Cohesion: 0.22
Nodes (8): compilerOptions, jsx, lib, noEmit, rootDir, exclude, extends, include

### Community 104 - "middleware.ts"
Cohesion: 0.36
Nodes (7): allowedOrigins(), applyCors(), config, CORS_HEADERS, FALLBACK_ORIGINS, middleware(), pickOrigin()

### Community 105 - "tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, baseUrl, paths, exclude, extends, include, @/*

### Community 106 - "support-phone-form.tsx"
Cohesion: 0.43
Nodes (5): formatSavedAt(), SupportPhoneForm(), QK, useSupportPhoneAdmin(), useUpdateSupportPhone()

### Community 107 - "customer-info-card.tsx"
Cohesion: 0.29
Nodes (6): CardProps, CustomerIdentityHeader(), CustomerInfoCard(), DataRowProps, formatPhoneGrouping(), IdentityProps

### Community 108 - "tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, baseUrl, paths, exclude, extends, include, @/*

### Community 109 - "tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, lib, noEmit, rootDir, exclude, extends, include

### Community 110 - "UuidSchema"
Cohesion: 0.25
Nodes (6): UuidSchema, PushOwnershipResponse, PushSubscriptionResponse, SubscribePushRequest, UnsubscribePushRequest, VapidKeyResponse

### Community 113 - "tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, lib, noEmit, rootDir, exclude, extends, include

### Community 114 - "tsconfig.json"
Cohesion: 0.25
Nodes (7): compilerOptions, lib, noEmit, rootDir, exclude, extends, include

### Community 115 - "route.ts"
Cohesion: 0.38
Nodes (6): DailySummary, defaultRangeLima(), DriverRow, GET(), RestaurantRow, round2()

### Community 116 - "install-prompt-banner.tsx"
Cohesion: 0.43
Nodes (5): InstallPromptBanner(), isIOS(), BeforeInstallPromptEvent, State, useInstallPrompt()

### Community 117 - "tracking-pending-list.tsx"
Cohesion: 0.43
Nodes (4): elapsedMinutes(), TrackingCard(), TrackingPendingList(), urgencyFor()

### Community 118 - "driver-history.tsx"
Cohesion: 0.48
Nodes (3): DriverHistory(), paymentLabel(), useDriverHistory()

### Community 119 - "change-payment-method-modal.tsx"
Cohesion: 0.38
Nodes (6): ChangePaymentMethodModal(), Method, METHOD_OPTIONS, parseMoney(), Props, useChangePaymentMethod()

### Community 120 - "install-prompt-banner.tsx"
Cohesion: 0.43
Nodes (5): InstallPromptBanner(), isIOS(), BeforeInstallPromptEvent, State, useInstallPrompt()

### Community 121 - "API App (Next.js)"
Cohesion: 0.38
Nodes (7): API App (Next.js), Customer PWA, Web App (Admin/Staff), Contracts Package (Zod), Core Package (Hexagonal Domain), Supabase Package (Client + Types), GET /api/tracking/:shortId

### Community 122 - "allowedVersions"
Cohesion: 0.29
Nodes (7): @react-leaflet/core>react, @react-leaflet/core>react-dom, react-leaflet>react, react-leaflet>react-dom, allowedVersions, pnpm, peerDependencyRules

### Community 123 - "tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, noEmit, rootDir, exclude, extends, include

### Community 125 - "confirm-pickup-modal.tsx"
Cohesion: 0.33
Nodes (4): ConfirmPickupModal(), DistanceBand, DistanceButtonProps, Props

### Community 126 - "upcoming-orders-section.tsx"
Cohesion: 0.47
Nodes (5): minutesFromNow(), paymentLabel(), Props, UpcomingOrder, UpcomingOrdersSection()

### Community 127 - "errors.ts"
Cohesion: 0.33
Nodes (4): RFC-9457, ErrorCode, ErrorCodes, ProblemDetails

### Community 128 - "base.json"
Cohesion: 0.33
Nodes (5): compilerOptions, composite, emitDeclarationOnly, extends, $schema

### Community 129 - "server.ts"
Cohesion: 0.70
Nodes (3): POST(), createSupabaseServerClient(), createServerClient()

### Community 132 - "sw.ts"
Cohesion: 0.50
Nodes (3): PushPayload, runtimeCaching, serwist

### Community 136 - "deno.json"
Cohesion: 0.50
Nodes (3): imports, tasks, start

### Community 140 - "build"
Cohesion: 0.67
Nodes (3): dependsOn, outputs, build

### Community 141 - "dev"
Cohesion: 0.67
Nodes (3): cache, persistent, dev

## Knowledge Gaps
- **885 isolated node(s):** `RestaurantRow`, `DriverRow`, `DailySummary`, `MetricsResponse`, `UpdateSchema` (+880 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Icon()` connect `Icon` to `index.ts`, `tab-operations.tsx`, `driver-form.tsx`, `Button`, `active-order-detail.tsx`, `driver-profile.tsx`, `business-dashboard.tsx`, `order-preview.tsx`, `login-register-sheet.tsx`, `item-form-sheet.tsx`, `cash-settlements-list.tsx`, `home-tabs.tsx`, `use-agenda.ts`, `restaurant-history.tsx`, `admin-dashboard.tsx`, `available-orders-list.tsx`, `platform-schedule-form.tsx`, `tracking-sent-list.tsx`, `register-payment-sheet.tsx`, `ApiError`, `restaurant-order-detail.tsx`, `index.ts`, `order-detail.tsx`, `tracking-view.tsx`, `team-orders-list.tsx`, `use-push-subscription.ts`, `disputes-list.tsx`, `orders-history-list.tsx`, `businesses-list.tsx`, `deuda-view.tsx`, `request-order-sheet.tsx`, `mark-delivered-sheet.tsx`, `frequent-customer-detail-drawer.tsx`, `received-requests-banner.tsx`, `support-phone-form.tsx`, `customer-info-card.tsx`, `install-prompt-banner.tsx`, `tracking-pending-list.tsx`, `change-payment-method-modal.tsx`, `install-prompt-banner.tsx`, `restaurant-profile.tsx`, `confirm-pickup-modal.tsx`, `upcoming-orders-section.tsx`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `DomainError` connect `DomainError` to `requireAuth`, `OrderRepository`, `Result`, `Order`, `auto-accept-expired-transfer-requests.use-case.test.ts`, `EventPublisher`, `index.ts`, `request-order-transfer.use-case.test.ts`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `problemCode()` connect `problemCode` to `requireAuth`, `validate.ts`, `container.ts`, `parseJson`, `route.ts`, `restaurantCatalogMoved`, `route.ts`, `index.ts`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `RestaurantRow`, `DriverRow`, `DailySummary` to the rest of the system?**
  _886 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.04040404040404041 - nodes in this community are weakly interconnected._
- **Should `tab-operations.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05526315789473684 - nodes in this community are weakly interconnected._
- **Should `requireAuth` be split into smaller, more focused modules?**
  _Cohesion score 0.04730052556139513 - nodes in this community are weakly interconnected._