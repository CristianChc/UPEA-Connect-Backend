import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { chatMessageSchema } from "@/lib/validation";
import { errorResponse, ok, ApiError } from "@/lib/api-response";
import type { NextRequest } from "next/server";

// Modelo gratuito, sin fecha de baja anunciada (a diferencia de gemini-2.5-flash,
// que se apaga el 16 de octubre de 2026). Si en el futuro sale un modelo más
// nuevo de la familia "flash", solo hay que cambiar este string.
const GEMINI_MODEL = "gemini-3.5-flash";
// Cuántos mensajes anteriores de la conversación se le mandan a Gemini como contexto.
const HISTORY_LIMIT = 10;
const geminiUrl = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

// Tiempo máximo de la función en Vercel (los reintentos pueden tardar unos segundos).
export const maxDuration = 30;

// Gemini (sobre todo en el plan gratuito) a veces responde 503 "high demand".
// Se reintenta hasta 3 veces con espera creciente (1 s, 2 s). Si define la variable
// de entorno GEMINI_FALLBACK_MODEL, se prueba también ese modelo de respaldo.
const RETRYABLE_STATUS = new Set([500, 503, 504]);
const MAX_ATTEMPTS = 3;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchGemini(body: string, apiKey: string): Promise<Response> {
  const models = [GEMINI_MODEL, process.env.GEMINI_FALLBACK_MODEL].filter(
    (m): m is string => Boolean(m),
  );
  let last: Response | null = null;

  for (const model of models) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      if (attempt > 1) await sleep((attempt - 1) * 1000);

      const res = await fetch(`${geminiUrl(model)}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      if (res.ok) return res;
      last = res;
      console.error(`Gemini ${model} falló (intento ${attempt}/${MAX_ATTEMPTS}): ${res.status}`);

      // 429 = cuota agotada: reintentar el mismo modelo no sirve, pasa al siguiente.
      if (res.status === 429 || !RETRYABLE_STATUS.has(res.status)) break;
    }
  }

  return last!;
}

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

Si el mensaje del usuario depende de lo dicho antes en la conversación (por ejemplo "y para el martes?"),
usa el historial para entenderlo.

Si es el primer mensaje de la conversación, devuelve también "chatTitle": un título corto
(máximo 5 palabras, sin comillas ni punto final) que resuma de qué trata.

No respondas temas fuera de lo académico o de la app. Sé breve: máximo 3-4 oraciones en "reply".`;
}
// Esquema de salida forzado: Gemini SIEMPRE responde en este formato JSON.
// Esto es lo que le permite a la app mostrar la tarjetita de "crear evento/nota".
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string", description: "Respuesta conversacional para mostrar al usuario" },
    chatTitle: {
      type: "string",
      description: "Título corto (máx. 5 palabras) de la conversación. Solo relevante en el primer mensaje.",
    },
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
  required: ["reply", "actionType", "noteContent"],
};

interface GeminiResponse {
  reply: string;
  chatTitle?: string;
  actionType: "ninguna" | "crear_evento" | "crear_nota";
  eventTitle?: string;
  eventDate?: string;
  eventType?: string;
  noteTitle?: string;
  noteCourse?: string;
  noteContent?: string;
}

// Título de la conversación: el que sugiere Gemini; si viene vacío, el inicio del mensaje.
function buildTitle(suggested: string | undefined, message: string): string {
  const clean = (suggested ?? "").replace(/["“”.]/g, "").trim();
  const base = clean.length > 0 ? clean : message.trim();
  return base.length > 60 ? `${base.slice(0, 57)}...` : base;
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth(request);
    const { message, conversationId } = chatMessageSchema.parse(await request.json());

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new ApiError("CONFIG_ERROR", "GEMINI_API_KEY no configurada en el servidor", 500);
    }

    // Historial: si la conversación ya existe, se cargan los últimos mensajes
    // (y se verifica que pertenezca al usuario).
    let history: { role: "user" | "model"; parts: { text: string }[] }[] = [];
    if (conversationId) {
      const owned = await prisma.chatConversation.findFirst({
        where: { id: conversationId, userId },
        select: { id: true },
      });
      if (!owned) {
        throw new ApiError("NOT_FOUND", "Conversación no encontrada", 404);
      }

      const previous = await prisma.chatMessage.findMany({
        where: { conversationId },
        orderBy: { createdAt: "desc" },
        take: HISTORY_LIMIT,
        select: { role: true, text: true },
      });

      history = previous.reverse().map((m) => ({
        role: m.role === "USER" ? "user" : "model",
        parts: [{ text: m.text }],
      }));
      // Gemini espera que el contexto empiece con un turno del usuario.
      while (history.length > 0 && history[0].role === "model") history.shift();
    }

    const geminiRes = await fetchGemini(
      JSON.stringify({
        systemInstruction: { parts: [{ text: buildSystemPrompt() }] },
        contents: [...history, { role: "user", parts: [{ text: message }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          // Sin este límite, Gemini puede cortar la respuesta a la mitad de
          // "noteContent" (que ahora puede ser largo) y el JSON queda
          // incompleto -> JSON.parse() explota con "Unterminated string".
          maxOutputTokens: 2048,
        },
      }),
      apiKey,
    );

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

    // Se guardan ambos mensajes solo si Gemini respondió bien, así el historial
    // siempre queda alternando usuario/asistente. Fechas con 1 ms de diferencia
    // para que el orden sea estable.
    const now = Date.now();
    const messagesData = [
      { role: "USER" as const, text: message, createdAt: new Date(now) },
      {
        role: "ASSISTANT" as const,
        text: parsed.reply,
        createdAt: new Date(now + 1),
        ...(action ? { action, actionStatus: "PENDING" as const } : {}),
      },
    ];

    const lastTwo = {
      orderBy: { createdAt: "desc" },
      take: 2,
      select: { id: true, role: true },
    } as const;

    const conversation = conversationId
      ? await prisma.chatConversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date(), messages: { create: messagesData } },
          select: { id: true, title: true, messages: lastTwo },
        })
      : await prisma.chatConversation.create({
          data: {
            userId,
            title: buildTitle(parsed.chatTitle, message),
            messages: { create: messagesData },
          },
          select: { id: true, title: true, messages: lastTwo },
        });

    return ok({
      reply: parsed.reply,
      action,
      conversationId: conversation.id,
      title: conversation.title,
      userMessageId: conversation.messages.find((m) => m.role === "USER")?.id ?? null,
      assistantMessageId: conversation.messages.find((m) => m.role === "ASSISTANT")?.id ?? null,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
