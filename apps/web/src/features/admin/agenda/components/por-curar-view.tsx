"use client";
import {
  AddressCaptureModal,
  Badge,
  Button,
  EmptyState,
  Icon,
  Skeleton,
  cn,
} from "@tindivo/ui";
import { useEffect, useState } from "react";
import {
  useAgendaStats,
  useAgendaVista1,
  useCurateAddress,
} from "../hooks/use-agenda";

function formatRelativeDate(isoString: string | null | undefined): string {
  if (!isoString) return "-";
  const date = new Date(isoString);
  const diffMs = Date.now() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "hace unos segundos";
  if (diffMins < 60) return `hace ${diffMins} min`;
  if (diffHours < 24)
    return `hace ${diffHours} ${diffHours === 1 ? "hora" : "horas"}`;
  if (diffDays === 1) return "ayer";
  return `hace ${diffDays} días`;
}

export function PorCurarView() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [onlySinPin, setOnlySinPin] = useState(false);
  const [onlyRefCorta, setOnlyRefCorta] = useState(false);
  const [onlySinNombre, setOnlySinNombre] = useState(false);
  const [minTimesUsed, setMinTimesUsed] = useState(0);
  const [curationSession, setCurationSession] = useState<"solo" | "ernesto">(
    "solo",
  );

  // Estado del modal de curación activa
  const [curatingIndex, setCuratingIndex] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { data: stats, refetch: refetchStats } = useAgendaStats();
  const {
    data: listData,
    isLoading,
    refetch: refetchList,
  } = useAgendaVista1({
    page,
    search,
    onlySinPin,
    onlyRefCorta,
    onlySinNombre,
    minTimesUsed,
  });

  const curate = useCurateAddress();
  const items = listData?.items ?? [];
  const totalItems = listData?.total ?? 0;
  const totalPages = Math.ceil(totalItems / 30) || 1;

  const activeRecord = curatingIndex !== null ? items[curatingIndex] : null;

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toastMessage]);

  async function handleConfirmCuration(coords: {
    lat: number;
    lng: number;
    reference: string;
    customerName: string;
  }) {
    if (!activeRecord) return;

    try {
      await curate.mutateAsync({
        addressId: activeRecord.address_id,
        phone: activeRecord.phone,
        lat: coords.lat,
        lng: coords.lng,
        reference: coords.reference,
        customerName: coords.customerName,
        prevLat: activeRecord.lat,
        prevLng: activeRecord.lng,
        previousSource: activeRecord.source,
        previousTimesUsed: activeRecord.times_used,
        curationSession,
      });

      // Lógica de auto-avance
      const hasNextInPage =
        curatingIndex !== null && curatingIndex + 1 < items.length;

      if (curationSession === "ernesto" && hasNextInPage) {
        setCuratingIndex(curatingIndex + 1);
      } else {
        // Fin de la página actual o modo 'solo'
        setCuratingIndex(null);
        refetchStats();
        refetchList();

        if (curationSession === "ernesto") {
          if (page < totalPages) {
            setPage((p) => p + 1);
            setToastMessage(
              "¡Página completada! Cargando la siguiente página de registros por curar...",
            );
          } else {
            setToastMessage(
              "¡Felicidades! Has curado todos los registros pendientes de esta página.",
            );
          }
        } else {
          setToastMessage("Cliente curado exitosamente.");
        }
      }
    } catch (err) {
      console.error(err);
      alert("Error al guardar la curación. Por favor intenta de nuevo.");
    }
  }

  // Si cambiamos filtros, volvemos a la página 1
  // biome-ignore lint/correctness/useExhaustiveDependencies: run when filters change
  useEffect(() => {
    setPage(1);
  }, [search, onlySinPin, onlyRefCorta, onlySinNombre, minTimesUsed]);

  return (
    <div className="space-y-6">
      {/* Banner de progreso de curación */}
      {stats && (
        <div className="rounded-2xl p-5 md:p-6 bg-primary-container text-on-primary-container border border-outline-variant/15 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
          <div className="flex-1">
            <h2 className="text-xs font-bold tracking-wider uppercase opacity-80">
              Progreso de Agenda
            </h2>
            <p className="text-xl md:text-2xl font-black mt-1 text-primary">
              {stats.curated} de {stats.total} registros con curación completa (
              {stats.percentage}%)
            </p>
            <div className="w-full bg-surface-container-high/40 rounded-full h-2.5 mt-3 overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-500 rounded-full"
                style={{ width: `${stats.percentage}%` }}
              />
            </div>
          </div>
          <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
            <Icon name="fact_check" className="text-primary" size={28} />
          </div>
        </div>
      )}

      {/* Toast Message Banner */}
      {toastMessage && (
        <div className="rounded-xl bg-emerald-500 text-white px-4 py-3 flex items-center gap-2 text-sm font-bold shadow-md animate-fade-in">
          <Icon name="check_circle" size={20} filled />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Panel de filtros y sesión */}
      <div className="rounded-2xl bg-surface-container-lowest p-5 border border-outline-variant/15 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Buscador */}
          <div className="relative flex-1 max-w-md">
            <Icon
              name="search"
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/60"
            />
            <input
              type="text"
              placeholder="Buscar por teléfono o nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-container rounded-xl border border-outline-variant/30 text-sm font-semibold placeholder:text-on-surface-variant/50 focus:outline-hidden focus:border-primary"
            />
          </div>

          {/* Selector de Sesión */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
              Sesión de Ernesto:
            </span>
            <div className="flex bg-surface-container rounded-xl p-1 border border-outline-variant/15">
              <button
                type="button"
                onClick={() => setCurationSession("solo")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  curationSession === "solo"
                    ? "bg-surface-container-lowest text-primary shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface",
                )}
              >
                Solo
              </button>
              <button
                type="button"
                onClick={() => setCurationSession("ernesto")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                  curationSession === "ernesto"
                    ? "bg-surface-container-lowest text-primary shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface",
                )}
              >
                Ernesto (Activa autoavance)
              </button>
            </div>
          </div>
        </div>

        {/* Checkboxes de Filtro Rápido */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-2 border-t border-outline-variant/10 text-xs">
          <label className="flex items-center gap-2 font-semibold text-on-surface-variant cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlySinPin}
              onChange={(e) => setOnlySinPin(e.target.checked)}
              className="w-4 h-4 rounded-md border-outline-variant/50 accent-primary"
            />
            Solo sin pin GPS
          </label>
          <label className="flex items-center gap-2 font-semibold text-on-surface-variant cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyRefCorta}
              onChange={(e) => setOnlyRefCorta(e.target.checked)}
              className="w-4 h-4 rounded-md border-outline-variant/50 accent-primary"
            />
            Solo referencia corta (&lt;20c)
          </label>
          <label className="flex items-center gap-2 font-semibold text-on-surface-variant cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlySinNombre}
              onChange={(e) => setOnlySinNombre(e.target.checked)}
              className="w-4 h-4 rounded-md border-outline-variant/50 accent-primary"
            />
            Solo sin nombre de cliente
          </label>

          {/* Slider Pedidos Mínimos */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="font-semibold text-on-surface-variant">
              Pedidos mínimos:
            </span>
            <input
              type="range"
              min="0"
              max="20"
              value={minTimesUsed}
              onChange={(e) => setMinTimesUsed(Number(e.target.value))}
              className="w-24 accent-primary"
            />
            <span className="font-mono text-xs bg-surface-container px-2 py-0.5 rounded-sm font-bold text-primary">
              {minTimesUsed}
            </span>
          </div>
        </div>
      </div>

      {/* Listado Principal */}
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
          <Skeleton className="h-14" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon="check_circle"
          title="Todo curado"
          description="No se encontraron registros de clientes que cumplan los filtros para curación."
        />
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/15 overflow-x-auto">
            <table className="w-full text-sm min-w-[850px]">
              <thead className="bg-surface-container-low text-xs uppercase tracking-wider text-on-surface-variant">
                <tr>
                  <th className="text-left px-4 py-3">Teléfono</th>
                  <th className="text-left px-4 py-3">Nombre</th>
                  <th className="text-left px-4 py-3">Referencia</th>
                  <th className="text-left px-4 py-3">Pedidos</th>
                  <th className="text-left px-4 py-3">Último uso</th>
                  <th className="text-left px-4 py-3">Origen</th>
                  <th className="text-left px-4 py-3">Restaurante Principal</th>
                  <th className="text-right px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((row: any, idx: number) => (
                  <tr
                    key={row.address_id}
                    className="border-t border-outline-variant/10 hover:bg-surface-container-low/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono font-bold text-on-surface">
                      +51 {row.phone}
                    </td>
                    <td className="px-4 py-3">
                      {row.customer_name ? (
                        <span className="font-semibold">
                          {row.customer_name}
                        </span>
                      ) : (
                        <span className="italic text-on-surface-variant/50">
                          Sin nombre
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-[240px]">
                      <div className="flex flex-col gap-1">
                        <span className="truncate block" title={row.reference}>
                          {row.reference || (
                            <span className="italic text-on-surface-variant/40">
                              Sin dirección
                            </span>
                          )}
                        </span>
                        <div className="flex gap-1.5 flex-wrap">
                          {!row.has_pin && (
                            <Badge
                              variant="warning"
                              className="text-[9px] px-1 py-0 font-bold uppercase"
                            >
                              Sin pin
                            </Badge>
                          )}
                          {!row.has_valid_ref && (
                            <Badge
                              variant="warning"
                              className="text-[9px] px-1 py-0 font-bold uppercase"
                            >
                              Corta
                            </Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-bold text-on-surface-variant">
                      {row.times_used}
                    </td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant">
                      {formatRelativeDate(row.last_used_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border",
                          row.source === "admin_curated" &&
                            "bg-green-500/10 text-green-700 border-green-500/20",
                          row.source === "driver_verified" &&
                            "bg-blue-500/10 text-blue-700 border-blue-500/20",
                          row.source === "backfill" &&
                            "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
                        )}
                      >
                        {row.source === "admin_curated" && "curada"}
                        {row.source === "driver_verified" && "motorizado"}
                        {row.source === "backfill" && "backfill"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-on-surface-variant">
                      {row.favorite_restaurant || "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" onClick={() => setCuratingIndex(idx)}>
                        <Icon name="my_location" size={14} />
                        Curar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-surface-container-lowest px-4 py-3 rounded-2xl border border-outline-variant/15">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                Página {page} de {totalPages} ({totalItems} registros)
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Siguiente
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Modal de Curación */}
      {activeRecord && (
        <AddressCaptureModal
          open={curatingIndex !== null}
          variant="admin"
          initialLat={activeRecord.lat}
          initialLng={activeRecord.lng}
          initialReference={activeRecord.reference}
          initialCustomerName={activeRecord.customer_name}
          onSkip={() => {
            setCuratingIndex(null);
            refetchStats();
            refetchList();
          }}
          onConfirmAdmin={handleConfirmCuration}
          onConfirm={() => {}}
        />
      )}
    </div>
  );
}
