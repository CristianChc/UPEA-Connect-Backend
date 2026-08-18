import { requireAuth } from "@/lib/auth";
import { chatMessageSchema } from "@/lib/validation";
import { errorResponse, ok, ApiError } from "@/lib/api-response";
import type { NextRequest } from "next/server";

// Modelo gratuito, sin fecha de baja anunciada (a diferencia de gemini-2.5-flash,
// que se apaga el 16 de octubre de 2026). Si en el futuro sale un modelo más
// nuevo de la familia "flash", solo hay que cambiar este string.
const GEMINI_MODEL = "gemini-3.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function buildSystemPrompt(): string {
  const hoy = new Date().toISOString().split("T")[0]; // ej: 2026-08-16

  return `Eres el asistente de UPEA-Connect, una app universitaria de la UPEA (Bolivia).
Ayudas a estudiantes con dudas académicas de forma breve y clara, en español.

La fecha de hoy es ${hoy}. Usa este dato como referencia para calcular cualquier
fecha relativa que mencione el usuario ("el próximo lunes", "mañana", "el 20 de agosto", etc.).
Nunca asumas un año distinto al que corresponde según la fecha de hoy, salvo que el
usuario lo diga explícitamente.

Si el usuario te pide crear un EVENTO (examen, tarea, clase, recordatorio) en su calendario,
extrae los datos que mencione y regrésalos en el campo correspondiente.
Si falta algún dato importante (como la fecha de un evento), pregúntalo en tu respuesta de texto
en vez de inventarlo, y deja actionType en "ninguna".

Si el usuario te pide crear un APUNTE/NOTA sobre un tema, además del título y la materia,
genera en "noteContent" un resumen inicial breve y útil sobre ese tema (2 a 4 párrafos,
en texto plano, con la información académica más relevante para empezar a estudiar).
No dejes "noteContent" vacío cuando actionType sea "crear_nota".

No respondas temas fuera de lo académico o de la app. Sé breve: máximo 3-4 oraciones en "reply".`;
}
// Esquema de salida forzado: Gemini SIEMPRE responde en este formato JSON.
// Esto es lo que le permite a la app mostrar la tarjetita de "crear evento/nota".
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string", description: "Respuesta conversacional para mostrar al usuario" },
    actionType: {
      type: "string",
      enum: ["ninguna", "crear_evento", "crear_nota"],
    },
    eventTitle: { type: "string" },
    eventDate: { type: "string", description: "Fecha y hora en formato ISO 8601, ej: 2026-08-20T10:00:00" },
    eventType: { type: "string", enum: ["EXAM", "ASSIGNMENT", "CLASS", "REMINDER", "OTHER"] },
    noteTitle: { type: "string" },
    noteCourse: { type: "string" },
    noteContent: {
      type: "string",
      description: "Resumen inicial del tema, en texto plano, para el cuerpo de la nota. Obligatorio si actionType es crear_nota.",
    },
  },
  required: ["reply", "actionType"],
};

interface GeminiResponse {
  reply: string;
  actionType: "ninguna" | "crear_evento" | "crear_nota";
  eventTitle?: string;
  eventDate?: string;
  eventType?: string;
  noteTitle?: string;
  noteCourse?: string;
  noteContent?: string;
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request); // solo confirma que el usuario tiene sesión válida
    const { message } = chatMessageSchema.parse(await request.json());

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new ApiError("CONFIG_ERROR", "GEMINI_API_KEY no configurada en el servidor", 500);
    }

    const geminiRes = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: buildSystemPrompt() }] },
        contents: [{ role: "user", parts: [{ text: message }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error:", errText);
      throw new ApiError("AI_ERROR", "El asistente no pudo responder. Intenta de nuevo", 502);
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new ApiError("AI_ERROR", "El asistente no pudo responder. Intenta de nuevo", 502);
    }

    const parsed: GeminiResponse = JSON.parse(rawText);

    // Traduce la respuesta de Gemini al formato que ya espera Flutter
    // (el mismo formato que usaba el mock: { reply, action: { type, data } })
    let action: { type: string; data: Record<string, string> } | null = null;

    if (parsed.actionType === "crear_evento" && parsed.eventTitle && parsed.eventDate) {
      action = {
        type: "crear_evento",
        data: {
          titulo: parsed.eventTitle,
          fecha: parsed.eventDate,
          tipo: parsed.eventType ?? "OTHER",
        },
      };
    } else if (parsed.actionType === "crear_nota" && parsed.noteTitle && parsed.noteContent) {
      action = {
        type: "crear_nota",
        data: {
          titulo: parsed.noteTitle,
          materia: parsed.noteCourse ?? "General",
          contenido: parsed.noteContent,
        },
      };
    }

    return ok({ reply: parsed.reply, action });
  } catch (error) {
    return errorResponse(error);
  }
}
