export type Language = "es" | "en" | "de" | "fr" | "pt";

export const LANGUAGE_LABELS: Record<Language, string> = {
  es: "Español",
  en: "English",
  de: "Deutsch",
  fr: "Français",
  pt: "Português",
};

// Funnel-facing translations (used in exported HTML and canvas preview)
const funnelStrings: Record<Language, Record<string, string>> = {
  es: {
    "contact.title": "Tus datos",
    "contact.consent.default": "He leído y acepto los Términos de Uso y la Política de Privacidad.",
    "contact.consent.alert": "Por favor acepta los términos.",
    "contact.email.invalid": "Por favor introduce un email válido.",
    "booking.title": "Reserva tu llamada",
    "booking.subtitle": "Elige un horario que te convenga.",
    "booking.placeholder": "El calendario aparecerá aquí cuando se configure una URL de reserva.",
    "video.placeholder": "El video aparecerá aquí",
    "back": "← Atrás",
    "start": "Empezar",
    "submit": "Enviar",
    "download": "Descargar",
  },
  en: {
    "contact.title": "Your details",
    "contact.consent.default": "I have read and agree to the Terms of Use and Privacy Policy.",
    "contact.consent.alert": "Please accept the terms.",
    "contact.email.invalid": "Please enter a valid email.",
    "booking.title": "Book your call",
    "booking.subtitle": "Pick a time that works for you.",
    "booking.placeholder": "Calendar will appear here when a booking URL is configured.",
    "video.placeholder": "Video will appear here",
    "back": "← Back",
    "start": "Start",
    "submit": "Submit",
    "download": "Download",
  },
  de: {
    "contact.title": "Deine Daten",
    "contact.consent.default": "Ich habe die Nutzungsbedingungen und Datenschutzrichtlinie gelesen und akzeptiere diese.",
    "contact.consent.alert": "Bitte akzeptiere die Bedingungen.",
    "contact.email.invalid": "Bitte gib eine gültige E-Mail ein.",
    "booking.title": "Buche deinen Termin",
    "booking.subtitle": "Wähle einen Termin, der dir passt.",
    "booking.placeholder": "Der Kalender erscheint hier, sobald eine Buchungs-URL konfiguriert ist.",
    "video.placeholder": "Video erscheint hier",
    "back": "← Zurück",
    "start": "Starten",
    "submit": "Absenden",
    "download": "Herunterladen",
  },
  fr: {
    "contact.title": "Vos informations",
    "contact.consent.default": "J'ai lu et j'accepte les Conditions d'utilisation et la Politique de confidentialité.",
    "contact.consent.alert": "Veuillez accepter les conditions.",
    "contact.email.invalid": "Veuillez entrer un email valide.",
    "booking.title": "Réservez votre appel",
    "booking.subtitle": "Choisissez un créneau qui vous convient.",
    "booking.placeholder": "Le calendrier apparaîtra ici lorsqu'une URL de réservation sera configurée.",
    "video.placeholder": "La vidéo apparaîtra ici",
    "back": "← Retour",
    "start": "Commencer",
    "submit": "Envoyer",
    "download": "Télécharger",
  },
  pt: {
    "contact.title": "Seus dados",
    "contact.consent.default": "Li e aceito os Termos de Uso e a Política de Privacidade.",
    "contact.consent.alert": "Por favor aceite os termos.",
    "contact.email.invalid": "Por favor insira um email válido.",
    "booking.title": "Agende sua chamada",
    "booking.subtitle": "Escolha um horário que funcione para você.",
    "booking.placeholder": "O calendário aparecerá aqui quando uma URL de reserva for configurada.",
    "video.placeholder": "O vídeo aparecerá aqui",
    "back": "← Voltar",
    "start": "Começar",
    "submit": "Enviar",
    "download": "Baixar",
  },
};

export function t(lang: Language, key: string): string {
  return funnelStrings[lang]?.[key] || funnelStrings["es"][key] || key;
}
