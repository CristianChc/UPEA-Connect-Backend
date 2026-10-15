// Modelos de IA que el usuario puede elegir en la app.
//
// Se configuran con variables de entorno en Vercel (no hace falta tocar el código):
//   GEMINI_MODELS = "id|Nombre visible|Descripción corta,otro-id|Otro nombre|Otra descripción"
//   (la descripción es opcional y no debe llevar comas)
// El primero es el modelo principal; "Automático" en la app los prueba en ese orden.
//
// Si GEMINI_MODELS no existe, se usa GEMINI_MODEL (o el valor por defecto de abajo)
// y, si existe, GEMINI_FALLBACK_MODEL como segundo modelo.
const DEFAULT_MODEL = "gemini-3.6-flash";

export interface AiModelOption {
  id: string;
  label: string;
  description?: string;
}

export function getAiModels(): AiModelOption[] {
  const raw = process.env.GEMINI_MODELS ?? "";

  const parsed = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const [id, label, description] = item.split("|").map((part) => part.trim());
      return { id, label: label || id, ...(description ? { description } : {}) };
    })
    .filter((m) => m.id.length > 0);

  if (parsed.length > 0) return parsed;

  const main = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const list: AiModelOption[] = [{ id: main, label: main }];

  const fallback = process.env.GEMINI_FALLBACK_MODEL;
  if (fallback && fallback !== main) list.push({ id: fallback, label: fallback });

  return list;
}
