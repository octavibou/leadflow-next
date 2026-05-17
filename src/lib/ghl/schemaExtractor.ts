import type { Funnel, FunnelStep, ContactField } from "@/types/funnel";
import type { LeadflowField } from "./types";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 50);
}

function getContactFieldSlug(field: ContactField): string {
  const labelLower = field.label.toLowerCase();
  
  if (field.fieldType === "email") return "email";
  if (field.fieldType === "tel") return "phone";
  
  if (labelLower.includes("nombre") && labelLower.includes("apellido")) {
    return "full_name";
  }
  if (labelLower.includes("apellido") || labelLower.includes("last")) {
    return "lastName";
  }
  if (labelLower.includes("nombre") || labelLower.includes("first") || labelLower.includes("name")) {
    return "firstName";
  }
  
  return slugify(field.label);
}

function getContactFieldType(field: ContactField): LeadflowField["type"] {
  switch (field.fieldType) {
    case "email":
      return "email";
    case "tel":
      return "phone";
    default:
      return "text";
  }
}

export function extractFunnelSchema(funnel: Funnel): LeadflowField[] {
  const fields: LeadflowField[] = [];
  const usedSlugs = new Set<string>();

  function ensureUniqueSlug(baseSlug: string): string {
    let slug = baseSlug;
    let counter = 1;
    while (usedSlugs.has(slug)) {
      slug = `${baseSlug}_${counter}`;
      counter++;
    }
    usedSlugs.add(slug);
    return slug;
  }

  const coreContactFields: LeadflowField[] = [
    { slug: "firstName", label: "Nombre", type: "text", category: "contact" },
    { slug: "lastName", label: "Apellido", type: "text", category: "contact" },
    { slug: "email", label: "Email", type: "email", category: "contact" },
    { slug: "phone", label: "Teléfono", type: "phone", category: "contact" },
  ];

  for (const cf of coreContactFields) {
    usedSlugs.add(cf.slug);
    fields.push(cf);
  }

  fields.push({
    slug: "qualified",
    label: "Calificado",
    type: "boolean",
    category: "qualification",
  });
  usedSlugs.add("qualified");

  fields.push({
    slug: "lf_summary",
    label: "Resumen de respuestas",
    type: "text",
    category: "qualification",
  });
  usedSlugs.add("lf_summary");

  fields.push({
    slug: "lf_score",
    label: "Puntuación Leadflow",
    type: "number",
    category: "qualification",
  });
  usedSlugs.add("lf_score");

  const sortedSteps = [...funnel.steps].sort((a, b) => a.order - b.order);

  for (const step of sortedSteps) {
    if (step.type === "question" && step.question) {
      const question = step.question;
      
      const baseSlug = question.variableName || `q_${step.order}_answer`;
      const slug = ensureUniqueSlug(baseSlug);

      const options = question.options?.map((opt) => opt.label) || [];

      fields.push({
        slug,
        label: question.text,
        type: options.length > 0 ? "single_select" : "text",
        options: options.length > 0 ? options : undefined,
        category: "question",
      });
    }

    if (step.type === "contact" && step.contactFields) {
      for (const contactField of step.contactFields) {
        const fieldSlug = getContactFieldSlug(contactField);
        
        if (usedSlugs.has(fieldSlug)) {
          continue;
        }

        fields.push({
          slug: ensureUniqueSlug(fieldSlug),
          label: contactField.label,
          type: getContactFieldType(contactField),
          category: "contact",
        });
      }
    }
  }

  const attributionFields: LeadflowField[] = [
    { slug: "lf_lead_id", label: "Leadflow Lead ID", type: "text", category: "attribution" },
    { slug: "lf_funnel_id", label: "Leadflow Funnel ID", type: "text", category: "attribution" },
    { slug: "lf_funnel_name", label: "Leadflow Funnel Name", type: "text", category: "attribution" },
    { slug: "lf_workspace_id", label: "Leadflow Workspace ID", type: "text", category: "attribution" },
    { slug: "lf_campaign_id", label: "Leadflow Campaign ID", type: "text", category: "attribution" },
    { slug: "lf_branch_id", label: "Leadflow Branch ID", type: "text", category: "attribution" },
    { slug: "lf_branch_slug", label: "Leadflow Branch Slug", type: "text", category: "attribution" },
    { slug: "lf_session_id", label: "Leadflow Session ID", type: "text", category: "attribution" },
    { slug: "lf_source", label: "Leadflow Source", type: "text", category: "attribution" },
    { slug: "lf_submitted_at", label: "Leadflow Submitted At", type: "text", category: "attribution" },
  ];

  for (const af of attributionFields) {
    if (!usedSlugs.has(af.slug)) {
      usedSlugs.add(af.slug);
      fields.push(af);
    }
  }

  return fields;
}

export function getFieldsByCategory(
  fields: LeadflowField[]
): Record<LeadflowField["category"], LeadflowField[]> {
  const grouped: Record<LeadflowField["category"], LeadflowField[]> = {
    contact: [],
    qualification: [],
    question: [],
    attribution: [],
  };

  for (const field of fields) {
    grouped[field.category].push(field);
  }

  return grouped;
}

export function extractAnswerValue(
  funnel: Funnel,
  stepId: string,
  answerValue: string
): { label: string; slug: string } | null {
  const step = funnel.steps.find((s) => s.id === stepId);
  if (!step?.question) return null;

  const option = step.question.options?.find(
    (opt) => opt.value === answerValue || opt.id === answerValue
  );

  return option
    ? {
        label: option.label,
        slug: step.question.variableName || `q_${step.order}_answer`,
      }
    : null;
}
