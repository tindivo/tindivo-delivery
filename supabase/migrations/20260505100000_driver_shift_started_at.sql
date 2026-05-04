-- Tracking de inicio de turno por motorizado.
--
-- Sirve como tiebreak honesto en la regla R4 (rotación por carga). El
-- simulador documentado usa `joinedAt` (instante en que el driver entró al
-- turno) para desempatar a dos drivers con el mismo totalAssignedDay. En
-- producción esto se traduce a "cuándo el driver pasó a is_available=true
-- en su turno actual": el primero que entró tiene preferencia.
--
-- Antes: el desempate era driverId.localeCompare (alfabético por UUID),
-- determinístico pero arbitrario — un driver con UUID 'aaaa-...' siempre
-- ganaba aunque entrara al turno mucho después que 'zzzz-...'.

alter table public.driver_availability
  add column if not exists shift_started_at timestamptz;

comment on column public.driver_availability.shift_started_at is
  'Sello de cuándo el driver pasó por última vez a is_available=true. Tiebreak de R4 en auto-asignación: drivers que entraron antes al turno ganan empates.';

-- Trigger BEFORE UPDATE: cuando is_available transiciona a true desde
-- cualquier valor distinto (NULL o false), sellar shift_started_at = now().
-- Cuando pasa a false, NO limpiamos: el driver no es candidato igualmente
-- (filtrado en findAssignmentCandidates por is_available) y conservar el
-- valor previo facilita auditoría operativa.
create or replace function public.fn_driver_availability_shift_start()
returns trigger
language plpgsql
as $$
begin
  if new.is_available = true and (old.is_available is distinct from true) then
    new.shift_started_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_driver_availability_shift_start on public.driver_availability;
create trigger trg_driver_availability_shift_start
  before update on public.driver_availability
  for each row execute function public.fn_driver_availability_shift_start();

-- Trigger BEFORE INSERT: si la fila se inserta directamente con
-- is_available=true (caso seed o creación de driver con disponibilidad
-- inicial), también sellar shift_started_at.
create or replace function public.fn_driver_availability_shift_start_insert()
returns trigger
language plpgsql
as $$
begin
  if new.is_available = true and new.shift_started_at is null then
    new.shift_started_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_driver_availability_shift_start_insert on public.driver_availability;
create trigger trg_driver_availability_shift_start_insert
  before insert on public.driver_availability
  for each row execute function public.fn_driver_availability_shift_start_insert();

-- Bootstrap: drivers ya disponibles al momento de la migración. Sellamos
-- shift_started_at = now() para que no aparezcan con NULL (lo que
-- ordenarían como "infinitamente antiguos" en el tiebreak ASC NULLS FIRST).
update public.driver_availability
  set shift_started_at = now()
  where is_available = true and shift_started_at is null;
