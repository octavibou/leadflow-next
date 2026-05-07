/** Tipo de panel secundario junto al menú Constructor (mismo ancho que la lista). */
export type ConstructorFlyoutKind =
  | "basic_blocks"
  | "hero"
  | "product"
  | "cta"
  | "about"
  | "quiz"
  | "team"
  | "testimonials"
  | "trust"
  | null;

/** Identificadores de bloques/secciones del constructor de landing (UI). */
export type LandingBuilderComponentId =
  | "basic_blocks"
  /** Bloques básicos — Core */
  | "core_text"
  | "core_button"
  | "core_image"
  | "core_list"
  | "core_divider"
  | "core_logo_bar"
  | "core_reviews"
  /** Bloques básicos — Media */
  | "media_video"
  | "media_testimonial"
  | "media_slider"
  | "media_graphic"
  /** Bloques básicos — Embed */
  | "embed_kununu"
  | "embed_trustpilot"
  | "embed_proven_expert"
  | "embed_google_maps"
  | "embed_html"
  /** Plantillas Hero (hover en “Hero” en el constructor) */
  | "hero_tpl_center_logos"
  | "hero_tpl_split_media"
  | "hero_tpl_split_lead"
  | "hero_tpl_lead_image"
  | "hero_tpl_split_corporate"
  | "hero_tpl_promo_tint"
  | "hero_tpl_center_media_below"
  | "hero_tpl_center_social"
  /** Plantillas Producto / servicios (hover en “Producto” en el constructor) */
  | "product_tpl_split_checklist"
  | "product_tpl_split_support_image"
  | "product_tpl_split_analyses"
  | "product_tpl_three_columns"
  | "product_tpl_cta_two_col_grid"
  | "product_tpl_center_feature_grid"
  | "product_tpl_split_list_dashboard"
  | "product_tpl_split_logos_support"
  /** Plantillas CTA (hover en “Llamada a la acción” en el constructor) */
  | "cta_tpl_split_form"
  | "cta_tpl_split_proof_faq"
  | "cta_tpl_center_minimal"
  | "cta_tpl_center_dark_social"
  | "cta_tpl_center_light_social"
  | "cta_tpl_center_gradient_logos"
  | "cta_tpl_split_trial_social"
  | "cta_tpl_split_trial_copy"
  | "cta_tpl_center_narrow"
  /** Plantillas Sobre nosotros (hover en la sección en el constructor) */
  | "about_tpl_center_logos"
  | "about_tpl_split_columns"
  | "about_tpl_three_pillars"
  | "about_tpl_contact_map"
  | "about_tpl_split_image_cta"
  | "about_tpl_split_features"
  | "about_tpl_split_accordion"
  /** Plantillas Quiz — embed de la 1.ª pregunta del funnel (hover en “Quiz”) */
  | "quiz_tpl_split_benefits"
  | "quiz_tpl_center_grid_bordered"
  | "quiz_tpl_center_grid_solid"
  | "quiz_tpl_row_image_cards"
  | "quiz_tpl_center_dual_image"
  | "quiz_tpl_split_info_sidebar"
  /** Plantillas Equipo (hover en “Equipo”) */
  | "team_tpl_center_grid_six"
  | "team_tpl_center_photo_overlay"
  | "team_tpl_center_photo_stacked"
  | "team_tpl_split_spotlight_text"
  | "team_tpl_split_spotlight_icons"
  /** Plantillas Testimonios (hover en “Testimonios”) */
  | "testimonials_tpl_center_three_cards"
  | "testimonials_tpl_center_three_photo"
  | "testimonials_tpl_center_three_rich"
  | "testimonials_tpl_split_featured"
  | "testimonials_tpl_center_single"
  | "testimonials_tpl_center_single_immersive"
  /** Plantillas Confianza / logos (hover en “Confianza”) */
  | "trust_tpl_center_mission_cta"
  | "trust_tpl_center_band_muted"
  | "trust_tpl_center_band_open"
  | "trust_tpl_split_copy_grid";

/** Campos editables genéricos por bloque (luego se persistirán en la variación). */
export interface LandingBuilderBlockDraft {
  title: string;
  subtitle: string;
  body: string;
  ctaLabel: string;
}

export const emptyDraft = (): LandingBuilderBlockDraft => ({
  title: "",
  subtitle: "",
  body: "",
  ctaLabel: "",
});

/**
 * IDs solo de la paleta “Bloques básicos” (Core / Media / Embed).
 * Debe coincidir con los miembros `core_*` · `media_*` · `embed_*` de {@link LandingBuilderComponentId}.
 */
export type LandingBasicBlockId = Extract<
  LandingBuilderComponentId,
  `core_${string}` | `media_${string}` | `embed_${string}`
>;

/**
 * Tipo primitivo del “registry” de componentes de landing (UI runtime / export).
 * No confundir con `LandingBuilderComponentId` (bloque en el constructor + plantillas).
 * Mapeo 1:1: botón del constructor → `button`, texto → `text`, vídeo → `video`, etc.
 */
export type LandingBuildPrimitiveKind =
  | "text"
  | "button"
  | "image"
  | "list"
  | "divider"
  | "logo_bar"
  | "reviews"
  | "video"
  | "testimonial"
  | "slider"
  | "graphic"
  | "embed_kununu"
  | "embed_trustpilot"
  | "embed_proven_expert"
  | "embed_google_maps"
  | "embed_html";

/** Bloque básico del selector → pieza de la plataforma de build (un solo sitio de verdad). */
export const LANDING_BASIC_BLOCK_TO_BUILD_KIND = {
  core_text: "text",
  core_button: "button",
  core_image: "image",
  core_list: "list",
  core_divider: "divider",
  core_logo_bar: "logo_bar",
  core_reviews: "reviews",
  media_video: "video",
  media_testimonial: "testimonial",
  media_slider: "slider",
  media_graphic: "graphic",
  embed_kununu: "embed_kununu",
  embed_trustpilot: "embed_trustpilot",
  embed_proven_expert: "embed_proven_expert",
  embed_google_maps: "embed_google_maps",
  embed_html: "embed_html",
} as const satisfies Record<LandingBasicBlockId, LandingBuildPrimitiveKind>;

/** Inverso: al crear un componente por tipo de build, saber qué id de bloque usa el constructor. */
export const LANDING_BUILD_KIND_TO_BASIC_BLOCK: Record<LandingBuildPrimitiveKind, LandingBasicBlockId> = {
  text: "core_text",
  button: "core_button",
  image: "core_image",
  list: "core_list",
  divider: "core_divider",
  logo_bar: "core_logo_bar",
  reviews: "core_reviews",
  video: "media_video",
  testimonial: "media_testimonial",
  slider: "media_slider",
  graphic: "media_graphic",
  embed_kununu: "embed_kununu",
  embed_trustpilot: "embed_trustpilot",
  embed_proven_expert: "embed_proven_expert",
  embed_google_maps: "embed_google_maps",
  embed_html: "embed_html",
};

export function getLandingBasicBlockId(kind: LandingBuildPrimitiveKind): LandingBasicBlockId {
  return LANDING_BUILD_KIND_TO_BASIC_BLOCK[kind];
}

/** Resuelve el tipo de build a partir del id de bloque; plantillas y `basic_blocks` → null. */
export function getLandingBlockBuildKind(
  id: LandingBuilderComponentId | null,
): LandingBuildPrimitiveKind | null {
  if (!id || !isLandingBasicBlockId(id)) return null;
  return LANDING_BASIC_BLOCK_TO_BUILD_KIND[id];
}

export function isLandingBuildPrimitiveKind(s: string): s is LandingBuildPrimitiveKind {
  return Object.prototype.hasOwnProperty.call(LANDING_BUILD_KIND_TO_BASIC_BLOCK, s);
}

export const LANDING_COMPONENT_META: Record<
  LandingBuilderComponentId,
  { title: string; description: string }
> = {
  basic_blocks: {
    title: "Bloques básicos",
    description:
      "Texto, imágenes y estructura simple. Define cómo se verá el contenido estático en la landing.",
  },
  core_text: {
    title: "Texto",
    description: "Párrafo o titular con estilos de texto configurables.",
  },
  core_button: {
    title: "Botón",
    description: "Botón de acción con enlace o acción asociada.",
  },
  core_image: {
    title: "Imagen",
    description: "Imagen o foto con recorte y texto alternativo.",
  },
  core_list: {
    title: "Lista",
    description: "Lista con viñetas o numerada y elementos arrastrables.",
  },
  core_divider: {
    title: "Divisor",
    description: "Separador visual entre secciones del contenido.",
  },
  core_logo_bar: {
    title: "Barra de logos",
    description: "Carrusel o fila de logotipos de clientes o partners.",
  },
  core_reviews: {
    title: "Reseñas",
    description: "Bloque de reseñas con estrellas y citas.",
  },
  media_video: {
    title: "Vídeo",
    description: "Reproductor embebido (YouTube, Vimeo, etc.).",
  },
  media_testimonial: {
    title: "Testimonio",
    description: "Cita destacada con foto o avatar.",
  },
  media_slider: {
    title: "Carrusel",
    description: "Slider de imágenes o tarjetas con paginación.",
  },
  media_graphic: {
    title: "Gráfico",
    description: "Elementos visuales e iconos ilustrados.",
  },
  embed_kununu: {
    title: "Kununu",
    description: "Incrusta valoraciones Kununu en la landing.",
  },
  embed_trustpilot: {
    title: "Trustpilot",
    description: "Widget de reseñas Trustpilot.",
  },
  embed_proven_expert: {
    title: "Proven Expert",
    description: "Sello o widget de ProvenExpert.",
  },
  embed_google_maps: {
    title: "Google Maps",
    description: "Mapa incrustado con tu ubicación.",
  },
  embed_html: {
    title: "HTML",
    description: "Fragmento HTML o script personalizado (usar con precaución).",
  },
  hero_tpl_center_logos: {
    title: "Hero · Centrado y marcas",
    description: "Titular, texto, CTA y barra de logotipos centrada.",
  },
  hero_tpl_split_media: {
    title: "Hero · Texto + imagen",
    description: "Dos columnas: contenido a la izquierda e imagen destacada.",
  },
  hero_tpl_split_lead: {
    title: "Hero · Texto + formulario",
    description: "Mensaje y captación de leads en paralelo.",
  },
  hero_tpl_lead_image: {
    title: "Hero · Formulario + imagen",
    description: "Formulario a un lado e imagen de apoyo al otro.",
  },
  hero_tpl_split_corporate: {
    title: "Hero · Corporativo",
    description: "Propuesta de valor con imagen de equipo u oficina.",
  },
  hero_tpl_promo_tint: {
    title: "Hero · Promoción",
    description: "Bloque con fondo resaltado y oferta u objetivo claro.",
  },
  hero_tpl_center_media_below: {
    title: "Hero · Imagen inferior",
    description: "Texto y CTA arriba; imagen o vídeo protagonista abajo.",
  },
  hero_tpl_center_social: {
    title: "Hero · Reseñas",
    description: "Prueba social (estrellas, avatares) con imagen o medio.",
  },
  product_tpl_split_checklist: {
    title: "Producto · Texto + tarjeta",
    description: "Texto y reseñas a la izquierda; tarjeta con lista de beneficios a la derecha.",
  },
  product_tpl_split_support_image: {
    title: "Producto · Soporte + imagen",
    description: "Argumentario y prueba social frente a una imagen grande.",
  },
  product_tpl_split_analyses: {
    title: "Producto · Imagen + listado",
    description: "Imagen a un lado y bloque de características al otro.",
  },
  product_tpl_three_columns: {
    title: "Producto · Tres columnas",
    description: "Etiqueta, titular y tres columnas con imagen y texto.",
  },
  product_tpl_cta_two_col_grid: {
    title: "Producto · CTA + columnas e iconos",
    description: "Encabezado, botón, dos columnas principales y rejilla de beneficios.",
  },
  product_tpl_center_feature_grid: {
    title: "Producto · Rejilla centrada",
    description: "Titular, CTA y cuadrícula de ventajas con iconos.",
  },
  product_tpl_split_list_dashboard: {
    title: "Producto · Lista + dashboard",
    description: "Servicios con lista de puntos y foto o app a la derecha.",
  },
  product_tpl_split_logos_support: {
    title: "Producto · Logos + imagen",
    description: "Texto, logos de clientes, CTA e imagen de soporte.",
  },
  cta_tpl_split_form: {
    title: "CTA · Titular + formulario",
    description: "Dos columnas: mensaje a la izquierda y formulario de captación a la derecha.",
  },
  cta_tpl_split_proof_faq: {
    title: "CTA · Prueba social y FAQ",
    description: "Mensaje y reseñas frente a botón y preguntas en acordeón.",
  },
  cta_tpl_center_minimal: {
    title: "CTA · Centrado minimal",
    description: "Titular, texto y botón centrados sobre fondo claro discreto.",
  },
  cta_tpl_center_dark_social: {
    title: "CTA · Bloque oscuro",
    description: "Fondo oscuro con prueba social arriba y copy centrado.",
  },
  cta_tpl_center_light_social: {
    title: "CTA · Prueba social arriba",
    description: "Avatares y estrellas sobre el titular, todo centrado en caja clara.",
  },
  cta_tpl_center_gradient_logos: {
    title: "CTA · Gradiente y marcas",
    description: "CTA centrado con gradiente suave y franja de logos de confianza.",
  },
  cta_tpl_split_trial_social: {
    title: "CTA · Formulario con prueba social",
    description: "Titular y reseñas a un lado; formulario con subtítulo a la derecha.",
  },
  cta_tpl_split_trial_copy: {
    title: "CTA · Formulario con texto",
    description: "Argumentario largo a la izquierda y formulario de registro a la derecha.",
  },
  cta_tpl_center_narrow: {
    title: "CTA · Oferta centrada",
    description: "Mensaje breve y botón central menos ancho, máxima claridad.",
  },
  about_tpl_center_logos: {
    title: "Sobre nosotros · Centrado + marcas",
    description: "Titular, párrafo centrados y franja de logos de confianza.",
  },
  about_tpl_split_columns: {
    title: "Sobre nosotros · Dos columnas texto",
    description: "Titular e intro a la izquierda; texto detallado a la derecha.",
  },
  about_tpl_three_pillars: {
    title: "Sobre nosotros · Tres pilares",
    description: "Encabezado centrado y tres columnas con imagen, título y texto.",
  },
  about_tpl_contact_map: {
    title: "Sobre nosotros · Contacto y mapa",
    description: "Texto y datos de contacto arriba; mapa a ancho completo abajo.",
  },
  about_tpl_split_image_cta: {
    title: "Sobre nosotros · Imagen + CTA",
    description: "Copy, botón y prueba social frente a una imagen destacada.",
  },
  about_tpl_split_features: {
    title: "Sobre nosotros · Lista con iconos",
    description: "Imagen a un lado y lista de puntos con iconos al otro.",
  },
  about_tpl_split_accordion: {
    title: "Sobre nosotros · Acordeón",
    description: "Texto y preguntas desplegables junto a una imagen vertical.",
  },
  quiz_tpl_split_benefits: {
    title: "Quiz · Pregunta + beneficios",
    description: "Primera pregunta a la izquierda; panel de ventajas o bullets a la derecha.",
  },
  quiz_tpl_center_grid_bordered: {
    title: "Quiz · Rejilla con borde",
    description: "Cabecera centrada y opciones en cuadrícula 2×2 con tarjetas enmarcadas.",
  },
  quiz_tpl_center_grid_solid: {
    title: "Quiz · Rejilla rellena",
    description: "Misma estructura con opciones como botones sólidos de marca.",
  },
  quiz_tpl_row_image_cards: {
    title: "Quiz · Tarjetas imagen en fila",
    description: "Cuatro opciones en fila horizontal con foto y botón inferior.",
  },
  quiz_tpl_center_dual_image: {
    title: "Quiz · Dos imágenes grandes",
    description: "Pregunta centrada y dos opciones visuales amplias en paralelo.",
  },
  quiz_tpl_split_info_sidebar: {
    title: "Quiz · Rejilla + lateral informativo",
    description: "Cuadrícula de opciones con imagen y texto; caja informativa al lado.",
  },
  team_tpl_center_grid_six: {
    title: "Equipo · Rejilla 3×2",
    description: "Encabezado centrado y seis tarjetas con avatar, nombre y texto breve.",
  },
  team_tpl_center_photo_overlay: {
    title: "Equipo · Fotos con overlay",
    description: "Tres columnas a ancho completo; nombre y cargo sobre la imagen.",
  },
  team_tpl_center_photo_stacked: {
    title: "Equipo · Tarjetas verticales",
    description: "Tres columnas con foto arriba y nombre y bio debajo.",
  },
  team_tpl_split_spotlight_text: {
    title: "Equipo · Ficha imagen + texto",
    description: "Un miembro: foto a la izquierda y bloque de texto a la derecha.",
  },
  team_tpl_split_spotlight_icons: {
    title: "Equipo · Ficha con iconos",
    description: "Texto y lista con iconos a la izquierda; retrato amplio a la derecha.",
  },
  testimonials_tpl_center_three_cards: {
    title: "Testimonios · Tres tarjetas",
    description: "Cabecera centrada y tres bloques con estrellas, cita y autor con avatar.",
  },
  testimonials_tpl_center_three_photo: {
    title: "Testimonios · Fotos con overlay",
    description: "Tres columnas a imagen completa; cita y firma sobre degradado inferior.",
  },
  testimonials_tpl_center_three_rich: {
    title: "Testimonios · Tres columnas texto",
    description: "Estrellas, titular de cita, párrafo de apoyo y nombre en cada columna.",
  },
  testimonials_tpl_split_featured: {
    title: "Testimonios · Destacado dividido",
    description: "Un testimonio protagonista: logo, cita grande e imagen a la derecha.",
  },
  testimonials_tpl_center_single: {
    title: "Testimonios · Uno centrado claro",
    description: "Una sola cita grande, avatar y datos sobre fondo blanco.",
  },
  testimonials_tpl_center_single_immersive: {
    title: "Testimonios · Uno sobre imagen",
    description: "La misma estructura sobre foto de fondo con velo oscuro.",
  },
  trust_tpl_center_mission_cta: {
    title: "Confianza · Misión + CTA",
    description: "Titular, texto, franja de marcas (tipo carrusel) y botón centrado.",
  },
  trust_tpl_center_band_muted: {
    title: "Confianza · Bloque gris",
    description: "Cabecera y logos en fila dentro de un contenedor claro redondeado.",
  },
  trust_tpl_center_band_open: {
    title: "Confianza · Franja abierta",
    description: "Mismo mensaje y fila de logos sobre fondo blanco, sin caja interior.",
  },
  trust_tpl_split_copy_grid: {
    title: "Confianza · Texto + rejilla",
    description: "Copy alineado a la izquierda y tarjeta con cuadrícula de logos a la derecha.",
  },
};

/** Core / Media / Embed — bloques del selector “Bloques básicos”. */
export function isLandingBasicBlockId(id: LandingBuilderComponentId | null): boolean {
  if (!id) return false;
  return id.startsWith("core_") || id.startsWith("media_") || id.startsWith("embed_");
}

/** Plantillas de la familia Hero (constructor + zona hero en vista previa). */
export function isLandingHeroTemplateId(id: LandingBuilderComponentId | null): boolean {
  if (!id) return false;
  return id.startsWith("hero_tpl_");
}

/** Plantillas Producto / servicios. */
export function isLandingProductTemplateId(id: LandingBuilderComponentId | null): boolean {
  if (!id) return false;
  return id.startsWith("product_tpl_");
}

/** Plantillas de llamada a la acción. */
export function isLandingCTATemplateId(id: LandingBuilderComponentId | null): boolean {
  if (!id) return false;
  return id.startsWith("cta_tpl_");
}

/** Plantillas Sobre nosotros. */
export function isLandingAboutTemplateId(id: LandingBuilderComponentId | null): boolean {
  if (!id) return false;
  return id.startsWith("about_tpl_");
}

/** Plantillas Quiz (primera pregunta del funnel embebida). */
export function isLandingQuizTemplateId(id: LandingBuilderComponentId | null): boolean {
  if (!id) return false;
  return id.startsWith("quiz_tpl_");
}

/** Plantillas Equipo. */
export function isLandingTeamTemplateId(id: LandingBuilderComponentId | null): boolean {
  if (!id) return false;
  return id.startsWith("team_tpl_");
}

/** Plantillas Testimonios. */
export function isLandingTestimonialsTemplateId(id: LandingBuilderComponentId | null): boolean {
  if (!id) return false;
  return id.startsWith("testimonials_tpl_");
}

/** Plantillas Confianza / marcas. */
export function isLandingTrustTemplateId(id: LandingBuilderComponentId | null): boolean {
  if (!id) return false;
  return id.startsWith("trust_tpl_");
}

/** Zonas clicables de la intro que escriben en `introConfig` (título, texto, botón, vídeo). */
export function isIntroLandingPickComponentId(id: LandingBuilderComponentId | null): boolean {
  if (!id) return false;
  if (isLandingHeroTemplateId(id)) return true;
  return id === "core_text" || id === "core_button" || id === "media_video";
}
