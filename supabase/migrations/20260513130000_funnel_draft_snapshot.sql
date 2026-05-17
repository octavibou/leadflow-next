-- Borrador servidor opcional: autosave del editor persiste en `steps`/`settings`/`saved_at`.
-- Esta columna queda reservada para futuras estrategias de merge o snapshots sin publicar.
alter table public.funnels add column if not exists draft_snapshot jsonb;

comment on column public.funnels.draft_snapshot is 'Reservado para borrador explícito; el autosave actual escribe la fila principal (steps, settings, saved_at).';
