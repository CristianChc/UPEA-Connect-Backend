// Modelos de IA que el usuario puede elegir en la app.
//
// Se configuran con variables de entorno en Vercel (no hace falta tocar el código):
//   GEMINI_MODELS = "id|Nombre visible|Descripción corta,otro-id|Otro nombre|Otra descripción"
//   GROQ_MODELS   = mismo formato, para modelos de Groq (solo se muestran si existe GROQ_API_KEY)
//   (la descripción es opcional y no debe llevar comas)
// El primero es el modelo principal; "Automático" en la app los prueba en ese orden
// (primero los de Gemini y después los de Groq).
//
// Si GEMINI_MODELS no existe, se usa GEMINI_MODEL (o el valor por defecto de abajo)
// y, si existe, GEMINI_FALLBACK_MODEL como segundo modelo.
const DEFAULT_MODEL = "gemini-3.6-flash";
const DEFAULT_GROQ_MODELS = "openai/gpt-oss-120b|GPT OSS 120B (Groq)|Rápido y potente,openai/gpt-oss-20b|GPT OSS 20B (Groq)|Más ligero";

export type AiProvider = "gemini" | "groq";

export interface AiModelOption {
  id: string;
  label: string;
  description?: string;
  provider: AiProvider;
}

function parseModels(raw: string, provider: AiProvider): AiModelOption[] {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [id, label, description] = item.split("|").map((part) => part.trim());
      return { id, label: label || id, provider, ...(description ? { description } : {}) };
    })
    .filter((m) => m.id.length > 0);
}

export function getAiModels(): AiModelOption[] {
  let gemini = parseModels(process.env.GEMINI_MODELS ?? "", "gemini");

  if (gemini.length === 0) {
    const main = process.env.GEMINI_MODEL || DEFAULT_MODEL;
    gemini = [{ id: main, label: main, provider: "gemini" }];

    const fallback = process.env.GEMINI_FALLBACK_MODEL;
    if (fallback && fallback !== main) gemini.push({ id: fallback, label: fallback, provider: "gemini" });
  }

  // Groq solo aparece si hay API key configurada.
  const groq = process.env.GROQ_API_KEY
    ? parseModels(process.env.GROQ_MODELS || DEFAULT_GROQ_MODELS, "groq")
    : [];

  return [...gemini, ...groq];
}
