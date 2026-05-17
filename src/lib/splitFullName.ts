/**
 * Parte un nombre completo en nombre + apellido (última palabra = apellido).
 * Ej.: "María Pérez" → { firstName: "María", lastName: "Pérez" }
 * Ej.: "María José García" → { firstName: "María José", lastName: "García" }
 */
export function splitFullNameToFirstLast(full: string): { firstName: string; lastName: string } {
  const t = full.trim();
  if (!t) return { firstName: "", lastName: "" };
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return { firstName: t, lastName: "" };
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1] ?? "",
  };
}
