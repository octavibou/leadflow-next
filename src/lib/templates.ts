import type { FunnelStep, FunnelType, QuestionOption, ContactField } from "@/types/funnel";

const genId = () => crypto.randomUUID();

function makeOption(qId: string, emoji: string, label: string, qualifies: boolean, score: number): QuestionOption {
  return { id: genId(), question_id: qId, label, emoji, value: label.toLowerCase().replace(/[^a-z0-9]+/g, "-"), qualifies, score };
}

function makeField(stepId: string, fieldType: "text" | "email" | "tel", label: string, placeholder: string): ContactField {
  return { id: genId(), step_id: stepId, fieldType, label, placeholder, required: true };
}

function makeQuestionStep(funnelId: string, order: number, text: string, layout: "opts-col" | "opts-2", options: Array<[string, string, boolean, number]>): FunnelStep {
  const stepId = genId();
  const qId = genId();
  return {
    id: stepId, funnel_id: funnelId, order, type: "question",
    question: {
      id: qId, step_id: stepId, text, layout,
      options: options.map(([emoji, label, q, s]) => makeOption(qId, emoji, label, q, s)),
    },
  };
}

function makeContactStep(funnelId: string, order: number, cta: string): FunnelStep {
  const stepId = genId();
  return {
    id: stepId, funnel_id: funnelId, order, type: "contact",
    contactFields: [
      makeField(stepId, "text", "Nombre", "Tu nombre"),
      makeField(stepId, "text", "Apellidos", "Tus apellidos"),
      makeField(stepId, "email", "Email", "tu@email.com"),
      makeField(stepId, "tel", "Teléfono", "+34 600 000 000"),
    ],
    contactCta: cta,
    contactConsent: "He leído y acepto los Términos de Uso y la Política de Privacidad.",
  };
}

export function createTemplateSteps(funnelId: string, type: FunnelType): FunnelStep[] {
  switch (type) {
    case "blank": return createBlankSteps(funnelId);
    case "appointment": return createAppointmentSteps(funnelId);
    case "strategy_call": return createStrategyCallSteps(funnelId);
    case "vsl": return createVslSteps(funnelId);
    case "lead_magnet": return createLeadMagnetSteps(funnelId);
    case "recruiting": return createRecruitingSteps(funnelId);
    case "ai_secretary": return createAiSecretarySteps(funnelId);
  }
}

/** Intro mínima + una pregunta esqueleto; el editor permite añadir más pasos. */
function createBlankSteps(fId: string): FunnelStep[] {
  return [
    {
      id: genId(),
      funnel_id: fId,
      order: 0,
      type: "intro",
      introConfig: {
        headline: "Título",
        description: "Descripción",
        cta: "Empezar",
        showVideo: false,
      },
    },
    makeQuestionStep(fId, 1, "Nueva pregunta", "opts-col", [
      ["👍", "Opción 1", true, 0],
      ["👎", "Opción 2", false, 0],
    ]),
  ];
}

function createAppointmentSteps(fId: string): FunnelStep[] {
  return [
    { id: genId(), funnel_id: fId, order: 0, type: "intro", introConfig: { headline: "Descubre si podemos ayudarte a hacer crecer tu negocio", description: "Responde 6 preguntas rápidas y comprueba si calificas para una llamada estratégica gratuita.", cta: "Empezar ahora →", showVideo: false } },
    makeQuestionStep(fId, 1, "¿Qué describe mejor tu negocio?", "opts-2", [["🏢", "Agencia o consultoría", true, 3], ["🛍️", "E-commerce", true, 2], ["🏥", "Salud y bienestar", true, 2], ["💼", "Servicios profesionales", true, 3], ["🏗️", "Oficios y servicios locales", true, 2], ["🎓", "Coaching y educación", true, 3]]),
    makeQuestionStep(fId, 2, "¿Cuántos leads recibes al mes?", "opts-2", [["📭", "Menos de 10", false, 0], ["📬", "10 – 30", true, 1], ["📮", "30 – 100", true, 2], ["📥", "Más de 100", true, 3]]),
    makeQuestionStep(fId, 3, "¿Cuál es tu facturación mensual media?", "opts-2", [["🌱", "Menos de 1.000 €", false, 0], ["📈", "1.000 € – 5.000 €", true, 1], ["💼", "5.000 € – 20.000 €", true, 3], ["🏆", "Más de 20.000 €", true, 4]]),
    makeQuestionStep(fId, 4, "¿Cuál es tu objetivo principal ahora mismo?", "opts-col", [["🚀", "Conseguir más clientes", true, 3], ["⚙️", "Automatizar mis procesos", true, 2], ["📣", "Aumentar visibilidad de marca", true, 1], ["👀", "Solo estoy explorando", false, 0]]),
    makeQuestionStep(fId, 5, "¿Cuándo quieres empezar?", "opts-col", [["🔥", "Lo antes posible", true, 4], ["📅", "En los próximos 30 días", true, 3], ["🗓️", "En 2–3 meses", true, 1], ["👀", "Solo estoy mirando", false, 0]]),
    makeQuestionStep(fId, 6, "¿Eres tú quien toma las decisiones?", "opts-col", [["👑", "Sí, yo decido", true, 4], ["🤝", "Soy parte de la decisión", true, 2], ["🔄", "Otra persona decide", false, 0]]),
    makeContactStep(fId, 7, "Obtener mi resultado →"),
    { id: genId(), funnel_id: fId, order: 8, type: "results", resultsConfig: { qualifiedHeadline: "¡Buenas noticias — calificas!", qualifiedSubheadline: "Según tus respuestas, creemos que podemos ayudarte. Reserva tu llamada gratuita a continuación.", qualifiedCta: "Reservar mi llamada gratuita", disqualifiedHeadline: "Gracias por completar el quiz", disqualifiedSubheadline: "Puede que no sea el momento adecuado, pero nos encantaría mantenernos en contacto.", disqualifiedCta: "Obtener más información", qualifiedRoute: 9, disqualifiedRoute: 10 } },
    { id: genId(), funnel_id: fId, order: 9, type: "booking", bookingConfig: { bookingUrl: "" } },
    { id: genId(), funnel_id: fId, order: 10, type: "thankyou", thankYouConfig: { headline: "¡Todo listo!", subtitle: "Nos pondremos en contacto en las próximas 24 horas para confirmar tu llamada.", nextSteps: [{ number: 1, title: "Revisa tu email", description: "Recibirás una confirmación con todos los detalles." }, { number: 2, title: "Prepara tus preguntas", description: "Piensa en tus mayores desafíos para que podamos ayudarte." }, { number: 3, title: "Únete a la llamada", description: "Te explicaremos exactamente cómo podemos ayudar a tu negocio." }] } },
  ];
}

function createStrategyCallSteps(fId: string): FunnelStep[] {
  return [
    { id: genId(), funnel_id: fId, order: 0, type: "intro", introConfig: { headline: "Descubramos si una sesión estratégica tiene sentido para ti", description: "Responde 6 preguntas para que podamos preparar una sesión adaptada a tu situación.", cta: "Empezar ahora →", showVideo: false } },
    makeQuestionStep(fId, 1, "¿Cuál es tu mayor desafío ahora mismo?", "opts-col", [["😰", "No tengo suficientes leads", true, 3], ["💸", "Los leads no se convierten en clientes", true, 4], ["⚙️", "Las operaciones son caóticas", true, 2], ["📣", "Poca visibilidad de marca", true, 2], ["👀", "No estoy seguro/a", false, 0]]),
    makeQuestionStep(fId, 2, "¿Cuánto tiempo llevas en el negocio?", "opts-2", [["🌱", "Menos de 1 año", false, 0], ["📈", "1 – 3 años", true, 2], ["💼", "3 – 7 años", true, 3], ["🏆", "Más de 7 años", true, 4]]),
    makeQuestionStep(fId, 3, "¿Cuál es tu facturación mensual media?", "opts-2", [["🌱", "Menos de 1.000 €", false, 0], ["📈", "1.000 € – 5.000 €", true, 1], ["💼", "5.000 € – 20.000 €", true, 3], ["🏆", "Más de 20.000 €", true, 4]]),
    makeQuestionStep(fId, 4, "¿Has trabajado con un consultor o agencia antes?", "opts-col", [["✅", "Sí, y funcionó bien", true, 3], ["😐", "Sí, pero los resultados fueron mixtos", true, 2], ["❌", "No, nunca", true, 1], ["🤔", "Estoy abierto/a a probarlo", true, 2]]),
    makeQuestionStep(fId, 5, "¿Qué resultado haría que esta sesión fuera un éxito?", "opts-col", [["🗺️", "Un plan de acción claro", true, 3], ["🔍", "Identificar mis puntos ciegos", true, 3], ["💡", "Nuevas ideas y estrategias", true, 2], ["👀", "Solo quiero explorar", false, 0]]),
    makeQuestionStep(fId, 6, "¿Estás listo/a para invertir en resolver esto?", "opts-col", [["💪", "Sí, si el ROI es claro", true, 4], ["⚖️", "Depende del coste", true, 2], ["🚫", "Ahora mismo no", false, 0]]),
    makeContactStep(fId, 7, "Reservar mi sesión estratégica →"),
    { id: genId(), funnel_id: fId, order: 8, type: "results", resultsConfig: { qualifiedHeadline: "¡Buenas noticias — calificas!", qualifiedSubheadline: "Según tus respuestas, una sesión estratégica podría ser perfecta para ti.", qualifiedCta: "Reservar mi sesión estratégica", disqualifiedHeadline: "Gracias por completar el quiz", disqualifiedSubheadline: "Puede que no sea el momento adecuado, pero nos encantaría mantenernos en contacto.", disqualifiedCta: "Obtener más información", qualifiedRoute: 9, disqualifiedRoute: 10 } },
    { id: genId(), funnel_id: fId, order: 9, type: "booking", bookingConfig: { bookingUrl: "" } },
    { id: genId(), funnel_id: fId, order: 10, type: "thankyou", thankYouConfig: { headline: "¡Todo listo!", subtitle: "Nos pondremos en contacto en las próximas 24 horas para confirmar tu sesión.", nextSteps: [] } },
  ];
}

function createVslSteps(fId: string): FunnelStep[] {
  return [
    { id: genId(), funnel_id: fId, order: 0, type: "intro", introConfig: { headline: "Descubre cómo ayudamos a negocios como el tuyo a crecer más rápido", description: "Responde 3 preguntas rápidas para acceder al video completo.", cta: "Mostrarme el video →", showVideo: false } },
    makeQuestionStep(fId, 1, "¿Qué te describe mejor?", "opts-2", [["🏢", "Dueño de negocio", true, 3], ["👨‍💼", "Director de marketing", true, 2], ["🎓", "Coach o consultor", true, 3], ["👀", "Solo tengo curiosidad", false, 0]]),
    makeQuestionStep(fId, 2, "¿Cuál es tu facturación mensual?", "opts-2", [["🌱", "Menos de 1.000 €", false, 0], ["📈", "1.000 € – 5.000 €", true, 1], ["💼", "5.000 € – 20.000 €", true, 3], ["🏆", "Más de 20.000 €", true, 4]]),
    makeQuestionStep(fId, 3, "¿Cuál es tu mayor objetivo ahora mismo?", "opts-col", [["🚀", "Hacer crecer mi base de clientes", true, 3], ["⚙️", "Escalar mis operaciones", true, 2], ["💸", "Aumentar mis ingresos", true, 3], ["👀", "Solo estoy explorando opciones", false, 0]]),
    makeContactStep(fId, 4, "Ver el video →"),
    { id: genId(), funnel_id: fId, order: 5, type: "results", resultsConfig: { qualifiedHeadline: "¡Estás dentro — mira el video a continuación!", qualifiedSubheadline: "Este video explica exactamente cómo ayudamos a negocios como el tuyo.", qualifiedCta: "Ver ahora", disqualifiedHeadline: "Gracias por tu interés", disqualifiedSubheadline: "Puede que no sea el momento adecuado ahora.", disqualifiedCta: "Saber más", qualifiedRoute: 6, disqualifiedRoute: 7 } },
    { id: genId(), funnel_id: fId, order: 6, type: "vsl", vslConfig: { videoUrl: "", ctaLabel: "Reservar una llamada", ctaUrl: "" } },
    { id: genId(), funnel_id: fId, order: 7, type: "thankyou", thankYouConfig: { headline: "¡Gracias por ver el video!", subtitle: "Si tienes preguntas, contáctanos en cualquier momento.", nextSteps: [] } },
  ];
}

function createLeadMagnetSteps(fId: string): FunnelStep[] {
  return [
    { id: genId(), funnel_id: fId, order: 0, type: "intro", introConfig: { headline: "Consigue la guía gratuita — [Nombre del recurso]", description: "Responde 3 preguntas rápidas y te la enviaremos directamente.", cta: "Obtener la guía →", showVideo: false } },
    makeQuestionStep(fId, 1, "¿Cuál es tu mayor desafío ahora mismo?", "opts-col", [["😰", "Conseguir leads consistentes", true, 3], ["💸", "Convertir leads en clientes", true, 3], ["⚙️", "Gestionar mi tiempo y equipo", true, 2], ["👀", "Solo estoy mirando", false, 0]]),
    makeQuestionStep(fId, 2, "¿Cómo describirías tu situación actual?", "opts-col", [["🚀", "Creciendo rápido, necesito sistemas", true, 3], ["📈", "Estable, quiero escalar", true, 3], ["😐", "Atascado/a, necesito un avance", true, 2], ["🌱", "Recién empezando", true, 1]]),
    makeQuestionStep(fId, 3, "¿Cómo prefieres aprender?", "opts-2", [["📖", "Leyendo guías y frameworks", true, 2], ["🎥", "Viendo videos", true, 2], ["🧪", "Probando cosas", true, 2], ["🤝", "Trabajando con alguien", true, 3]]),
    makeContactStep(fId, 4, "Enviarme la guía →"),
    { id: genId(), funnel_id: fId, order: 5, type: "results", resultsConfig: { qualifiedHeadline: "¡Tu guía está lista!", qualifiedSubheadline: "Haz clic abajo para descargarla al instante.", qualifiedCta: "Descargar ahora", disqualifiedHeadline: "¡Gracias por tu interés!", disqualifiedSubheadline: "Este recurso puede que no sea el más adecuado, pero echa un vistazo a nuestro blog.", disqualifiedCta: "Visitar nuestro blog", qualifiedRoute: 6, disqualifiedRoute: 7 } },
    { id: genId(), funnel_id: fId, order: 6, type: "delivery", deliveryConfig: { resourceTitle: "[Nombre del recurso]", resourceDescription: "Tu guía gratuita está lista para descargar.", downloadButtonLabel: "Descargar la guía", downloadUrl: "" } },
    { id: genId(), funnel_id: fId, order: 7, type: "thankyou", thankYouConfig: { headline: "¡Gracias por descargar!", subtitle: "Revisa tu bandeja de entrada — también te enviamos una copia por email.", nextSteps: [] } },
  ];
}

function createRecruitingSteps(fId: string): FunnelStep[] {
  return [
    { id: genId(), funnel_id: fId, order: 0, type: "intro", introConfig: { headline: "Aplica para unirte a nuestro equipo", description: "Responde unas preguntas para que podamos conocerte mejor.", cta: "Empezar mi aplicación →", showVideo: false } },
    makeQuestionStep(fId, 1, "¿A qué puesto te postulas?", "opts-col", [["📣", "Media buyer / publicidad pagada", true, 3], ["✍️", "Copywriter", true, 3], ["📊", "Account manager", true, 2], ["⚙️", "Operaciones / automatización", true, 2], ["💻", "Desarrollador web", true, 2], ["🤔", "No estoy seguro/a aún", false, 0]]),
    makeQuestionStep(fId, 2, "¿Cuántos años de experiencia tienes?", "opts-2", [["🌱", "Menos de 1 año", false, 0], ["📈", "1 – 2 años", true, 1], ["💼", "3 – 5 años", true, 3], ["🏆", "Más de 5 años", true, 4]]),
    makeQuestionStep(fId, 3, "¿Qué tipo de entorno de trabajo prefieres?", "opts-col", [["🏠", "Totalmente remoto", true, 3], ["🏢", "Híbrido", true, 2], ["🏙️", "Presencial", true, 1], ["⚡", "Flexible / asíncrono", true, 3]]),
    makeQuestionStep(fId, 4, "¿Puedes empezar en los próximos 30 días?", "opts-col", [["✅", "Sí, inmediatamente", true, 4], ["📅", "En 30 días", true, 3], ["🗓️", "En 1–2 meses", true, 1], ["❌", "No por ahora", false, 0]]),
    makeContactStep(fId, 5, "Enviar mi aplicación →"),
    { id: genId(), funnel_id: fId, order: 6, type: "results", resultsConfig: { qualifiedHeadline: "¡Tu aplicación se ve genial!", qualifiedSubheadline: "Revisaremos todo y te responderemos en 48 horas.", qualifiedCta: "Reservar una llamada introductoria", disqualifiedHeadline: "Gracias por aplicar", disqualifiedSubheadline: "No tenemos una vacante compatible ahora, pero guardaremos tu perfil.", disqualifiedCta: "Síguenos para futuras vacantes", qualifiedRoute: 7, disqualifiedRoute: 8 } },
    { id: genId(), funnel_id: fId, order: 7, type: "booking", bookingConfig: { bookingUrl: "" } },
    { id: genId(), funnel_id: fId, order: 8, type: "thankyou", thankYouConfig: { headline: "¡Aplicación recibida!", subtitle: "Nos pondremos en contacto en 48 horas.", nextSteps: [] } },
  ];
}

function createAiSecretarySteps(fId: string): FunnelStep[] {
  return [
    { id: genId(), funnel_id: fId, order: 0, type: "intro", introConfig: { headline: "Descubre si una Secretaria de IA puede transformar tu negocio", description: "Responde 10 preguntas rápidas y comprueba si calificas para una demo gratuita.", cta: "Empezar ahora →", showVideo: false } },
    makeQuestionStep(fId, 1, "¿Cuántas llamadas recibe tu negocio al día?", "opts-2", [["📞", "Menos de 5", false, 1], ["📲", "5 – 15", true, 2], ["📱", "15 – 30", true, 3], ["🔥", "Más de 30", true, 4]]),
    makeQuestionStep(fId, 2, "¿Cuántas llamadas estás perdiendo actualmente?", "opts-col", [["😌", "Casi ninguna", false, 0], ["😟", "Algunas cada día", true, 2], ["😰", "Muchas cada día", true, 4], ["🤷", "No lo sé, pero estoy perdiendo oportunidades", true, 2]]),
    makeQuestionStep(fId, 3, "¿Quién gestiona actualmente las llamadas en tu negocio?", "opts-col", [["🙋", "Nadie / yo mismo", true, 3], ["👩‍💼", "Secretaria / recepcionista", true, 2], ["👥", "Equipo comercial", true, 2]]),
    makeQuestionStep(fId, 4, "¿Cuál es el principal motivo por el que quieres implementar una Secretaria de IA?", "opts-col", [["⚡", "Reducir carga de trabajo", true, 2], ["🌙", "No perder llamadas fuera de horario", true, 3], ["✅", "Ambas", true, 4], ["👀", "Solo estoy explorando", false, 0]]),
    makeQuestionStep(fId, 5, "¿Cuál es la facturación media mensual de tu negocio?", "opts-2", [["🌱", "Menos de 1.000€", false, 0], ["📈", "1.000€ – 5.000€", true, 1], ["💼", "5.000€ – 20.000€", true, 3], ["🏆", "Más de 20.000€", true, 4]]),
    makeQuestionStep(fId, 6, "¿Utilizas actualmente algún sistema de citas o CRM?", "opts-col", [["✅", "Sí, tengo uno", true, 2], ["❌", "No", true, 1], ["🤔", "No estoy seguro", true, 1]]),
    makeQuestionStep(fId, 7, "¿En qué plazo te gustaría implementar esta solución?", "opts-col", [["🚀", "Lo antes posible", true, 4], ["📅", "En 30 días", true, 3], ["🗓️", "En 2–3 meses", true, 1], ["👀", "Solo estoy mirando", false, 0]]),
    makeQuestionStep(fId, 8, "¿Eres la persona que tomaría la decisión de implementar esto?", "opts-col", [["👑", "Sí, soy yo quien decide", true, 4], ["🤝", "Participo en la decisión", true, 2], ["🔄", "No, hay otra persona", false, 0]]),
    makeQuestionStep(fId, 9, "Si ves claro el retorno, ¿estarías dispuesto a invertir en esta solución?", "opts-col", [["💪", "Sí, si tiene sentido económico", true, 4], ["⚖️", "Depende del precio", true, 2], ["🚫", "No por ahora", false, 0]]),
    makeQuestionStep(fId, 10, "¿Cuánto crees que estás perdiendo al mes por llamadas no atendidas?", "opts-2", [["💧", "Menos de 500€", true, 1], ["💸", "500€ – 2.000€", true, 3], ["🚨", "Más de 2.000€", true, 4], ["❓", "No lo sé", true, 1]]),
    makeContactStep(fId, 11, "Obtener mi resultado →"),
    { id: genId(), funnel_id: fId, order: 12, type: "results", resultsConfig: { qualifiedHeadline: "¡Buenas noticias — calificas!", qualifiedSubheadline: "Según tus respuestas, una Secretaria de IA podría ser perfecta para tu negocio. Reserva tu demo gratuita.", qualifiedCta: "Reservar mi demo gratuita", disqualifiedHeadline: "Gracias por completar el quiz", disqualifiedSubheadline: "Puede que no sea el momento adecuado, pero nos encantaría mantenernos en contacto.", disqualifiedCta: "Obtener más información", qualifiedRoute: 13, disqualifiedRoute: 14 } },
    { id: genId(), funnel_id: fId, order: 13, type: "booking", bookingConfig: { bookingUrl: "" } },
    { id: genId(), funnel_id: fId, order: 14, type: "thankyou", thankYouConfig: { headline: "¡Todo listo!", subtitle: "Nos pondremos en contacto en las próximas 24 horas para confirmar tu demo.", nextSteps: [{ number: 1, title: "Revisa tu email", description: "Recibirás una confirmación con todos los detalles." }, { number: 2, title: "Prepara tus preguntas", description: "Piensa en cómo una Secretaria de IA puede ayudar a tu negocio." }, { number: 3, title: "Únete a la demo", description: "Te mostraremos exactamente cómo funciona." }] } },
  ];
}
