/** Payload de drag & drop desde “Bloques básicos” hacia el canvas de landing. */

export const LANDING_BASIC_BLOCK_DRAG_TYPE = "application/x-leadflow-landing-basic-block";

export interface LandingBasicBlockDragPayload {
  /** Ej. `"core_text"` — id del constructor tipo {@link LandingBuilderComponentId}. */
  builderBlockId: string;
}

/** Drag interno para reordenar filas debajo del hero. */
export const LANDING_BODY_ROW_REORDER_TYPE = "application/x-leadflow-body-row-reorder";

/** Segundo argumento de reordenación: mover la fila al final del listado. */
export const LANDING_BODY_REORDER_APPEND = "__landing_body_append__";

export interface LandingBodyRowReorderPayload {
  rowId: string;
}
