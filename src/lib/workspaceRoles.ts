import type { WorkspaceRole } from "@/store/workspaceStore";

/** Etiquetas en español (producto Dueño / Admin / colaboradores editor vs solo lectura). */
export const WORKSPACE_ROLE_LABELS_ES: Record<WorkspaceRole, string> = {
  owner: "Dueño",
  admin: "Administrador",
  editor: "Editor",
  viewer: "Solo lectura",
};

/** Texto agrupando colaboradores (sin rol de gestión del workspace). */
export const INVITE_COLLABORATOR_HELPER =
  "Colaboradores pueden editar o solo ver contenido según el rol; no gestionan ajustes del workspace.";

export function formatWorkspaceRoleEs(role: string): string {
  const r = role as WorkspaceRole;
  return WORKSPACE_ROLE_LABELS_ES[r] ?? role;
}

export function canAccessWorkspaceTeamSettings(role: WorkspaceRole | null): boolean {
  return role === "owner" || role === "admin";
}

export function canManageWorkspaceAppearanceAndDanger(role: WorkspaceRole | null): boolean {
  return role === "owner";
}
