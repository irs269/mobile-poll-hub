export interface QuestionTypeConfig {
  value: string;
  label: string;
  category: string;
  needsOptions: boolean;
  needsMatrixRows?: boolean;
  icon: string;
}

export const questionTypeCategories = [
  { key: "basic", label: "📋 Questions de base" },
  { key: "advanced", label: "📊 Questions avancées" },
  { key: "input", label: "📁 Saisie enrichie" },
  { key: "location_time", label: "📍 Localisation & temps" },
  { key: "multimedia", label: "🖼️ Multimédia" },
  { key: "ux", label: "🧩 UX modernes" },
  { key: "feedback", label: "💬 Feedback" },
];

export const questionTypes: QuestionTypeConfig[] = [
  // Basic
  { value: "single_choice", label: "Choix unique", category: "basic", needsOptions: true, icon: "⭕" },
  { value: "multiple_choice", label: "Choix multiples", category: "basic", needsOptions: true, icon: "☑️" },
  { value: "text_short", label: "Texte court", category: "basic", needsOptions: false, icon: "📝" },
  { value: "text_long", label: "Texte long", category: "basic", needsOptions: false, icon: "📄" },
  { value: "numeric", label: "Numérique", category: "basic", needsOptions: false, icon: "🔢" },
  { value: "date", label: "Date", category: "basic", needsOptions: false, icon: "📅" },

  // Advanced
  { value: "likert", label: "Échelle Likert", category: "advanced", needsOptions: false, icon: "📊" },
  { value: "ranking", label: "Classement (Ranking)", category: "advanced", needsOptions: true, icon: "🏆" },
  { value: "matrix_single", label: "Matrice (choix unique)", category: "advanced", needsOptions: true, needsMatrixRows: true, icon: "📋" },
  { value: "matrix_multiple", label: "Matrice (choix multiples)", category: "advanced", needsOptions: true, needsMatrixRows: true, icon: "📊" },
  { value: "numeric_scale", label: "Échelle numérique", category: "advanced", needsOptions: false, icon: "🔟" },
  { value: "nps", label: "NPS (Net Promoter Score)", category: "advanced", needsOptions: false, icon: "📈" },
  { value: "slider", label: "Slider (curseur)", category: "advanced", needsOptions: false, icon: "🎚️" },

  // Input
  { value: "email", label: "Email", category: "input", needsOptions: false, icon: "📧" },
  { value: "phone", label: "Numéro de téléphone", category: "input", needsOptions: false, icon: "📱" },
  { value: "url", label: "URL / site web", category: "input", needsOptions: false, icon: "🔗" },
  { value: "file_upload", label: "Upload de fichier", category: "input", needsOptions: false, icon: "📎" },
  { value: "signature", label: "Signature électronique", category: "input", needsOptions: false, icon: "✍️" },

  // Location & Time
  { value: "time", label: "Heure", category: "location_time", needsOptions: false, icon: "🕐" },
  { value: "datetime", label: "Date & heure", category: "location_time", needsOptions: false, icon: "📅" },
  { value: "location", label: "Localisation (GPS)", category: "location_time", needsOptions: false, icon: "📍" },

  // Multimedia
  { value: "image_choice", label: "Choix avec images", category: "multimedia", needsOptions: true, icon: "🖼️" },

  // UX
  { value: "buttons", label: "Boutons (choix stylé)", category: "ux", needsOptions: true, icon: "🔘" },
  { value: "dropdown", label: "Liste déroulante", category: "ux", needsOptions: true, icon: "📃" },
  { value: "autocomplete", label: "Autocomplete", category: "ux", needsOptions: true, icon: "🔍" },
  { value: "tag_input", label: "Tag input (saisie libre)", category: "ux", needsOptions: false, icon: "🏷️" },

  // Feedback
  { value: "emoji_rating", label: "Emoji rating", category: "feedback", needsOptions: false, icon: "😊" },
  { value: "star_rating", label: "Évaluation par étoiles", category: "feedback", needsOptions: false, icon: "⭐" },
];

export function getQuestionTypeConfig(type: string): QuestionTypeConfig | undefined {
  return questionTypes.find(qt => qt.value === type);
}

export function typeNeedsOptions(type: string): boolean {
  return questionTypes.find(qt => qt.value === type)?.needsOptions ?? false;
}

export function typeNeedsMatrixRows(type: string): boolean {
  return questionTypes.find(qt => qt.value === type)?.needsMatrixRows ?? false;
}
