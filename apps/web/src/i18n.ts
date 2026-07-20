// Player UI chrome label sets, keyed by course locale — separate from
// content translation (Dashboard "🌐 Translate", which uses DeepL and covers
// whatever languages DeepL supports). These are hand-maintained strings for
// the fixed set of UI controls (Continue, Submit quiz, etc.), so only a
// seed set of locales is covered; anything else falls back to English.

export const LANGUAGE_OPTIONS: { code: string; label: string; deeplTarget: string }[] = [
  { code: "es", label: "Spanish", deeplTarget: "ES" },
  { code: "fr", label: "French", deeplTarget: "FR" },
  { code: "de", label: "German", deeplTarget: "DE" },
  { code: "pt", label: "Portuguese", deeplTarget: "PT-BR" },
  { code: "it", label: "Italian", deeplTarget: "IT" },
  { code: "nl", label: "Dutch", deeplTarget: "NL" },
  { code: "ja", label: "Japanese", deeplTarget: "JA" },
  { code: "zh", label: "Chinese (simplified)", deeplTarget: "ZH" },
  { code: "ar", label: "Arabic", deeplTarget: "AR" },
  { code: "he", label: "Hebrew", deeplTarget: "EN-US" }, // DeepL has no Hebrew target as of writing; label set + RTL still apply
];

export const RTL_LOCALES = new Set(["ar", "he", "fa", "ur"]);

export function isRtl(locale: string | undefined): boolean {
  return !!locale && RTL_LOCALES.has(locale);
}

export interface UiLabels {
  continue: string;
  completeAndContinue: string;
  completeAndFinish: string;
  finish: string;
  previous: string;
  startCourse: string;
  courseComplete: string;
  reviewLessons: string;
  submitQuiz: string;
  retryQuiz: string;
  continueAnyway: string;
  passed: string;
  notPassed: string;
  passMark: string;
  percentComplete: string;
  exitPreview: string;
}

const EN: UiLabels = {
  continue: "Continue →",
  completeAndContinue: "Complete & continue →",
  completeAndFinish: "Complete & finish",
  finish: "Finish",
  previous: "← Previous",
  startCourse: "Start course →",
  courseComplete: "🎉 Course complete",
  reviewLessons: "Review lessons",
  submitQuiz: "Submit quiz",
  retryQuiz: "Retry quiz",
  continueAnyway: "Continue anyway →",
  passed: "✓ Passed",
  notPassed: "✗ Not passed",
  passMark: "pass mark",
  percentComplete: "complete",
  exitPreview: "← Exit preview",
};

const UI_LABELS: Record<string, UiLabels> = {
  en: EN,
  es: {
    continue: "Continuar →",
    completeAndContinue: "Completar y continuar →",
    completeAndFinish: "Completar y finalizar",
    finish: "Finalizar",
    previous: "← Anterior",
    startCourse: "Comenzar curso →",
    courseComplete: "🎉 Curso completado",
    reviewLessons: "Repasar lecciones",
    submitQuiz: "Enviar cuestionario",
    retryQuiz: "Reintentar cuestionario",
    continueAnyway: "Continuar de todos modos →",
    passed: "✓ Aprobado",
    notPassed: "✗ No aprobado",
    passMark: "puntuación mínima",
    percentComplete: "completado",
    exitPreview: "← Salir de la vista previa",
  },
  fr: {
    continue: "Continuer →",
    completeAndContinue: "Terminer et continuer →",
    completeAndFinish: "Terminer",
    finish: "Terminer",
    previous: "← Précédent",
    startCourse: "Commencer le cours →",
    courseComplete: "🎉 Cours terminé",
    reviewLessons: "Revoir les leçons",
    submitQuiz: "Envoyer le quiz",
    retryQuiz: "Réessayer le quiz",
    continueAnyway: "Continuer quand même →",
    passed: "✓ Réussi",
    notPassed: "✗ Non réussi",
    passMark: "score minimum",
    percentComplete: "terminé",
    exitPreview: "← Quitter l'aperçu",
  },
};

export function getLabels(locale: string | undefined): UiLabels {
  return (locale && UI_LABELS[locale]) || EN;
}
