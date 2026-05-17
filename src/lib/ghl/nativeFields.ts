import type { LeadflowField } from "./types";

/** Leadflow slugs mapped to GHL contact standard fields (not custom fields). */
export const GHL_NATIVE_CONTACT_SLUGS = new Set([
  "firstName",
  "lastName",
  "email",
  "phone",
  "first_name",
  "last_name",
]);

export function isGhlNativeContactField(field: Pick<LeadflowField, "slug" | "category">): boolean {
  return field.category === "contact" && GHL_NATIVE_CONTACT_SLUGS.has(field.slug);
}

export function isGhlStandardFieldConflictError(message: string): boolean {
  return (
    message.includes("same name as an existing Standard Field") ||
    message.includes("Standard Field")
  );
}
