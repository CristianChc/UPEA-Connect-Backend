import { prisma } from "@/lib/prisma";

type ConocimientoDoc = {
  id: string;
  titulo: string;
  categoria: string;
  contenido: string;
};

// Caché en memoria: documentos + marca de tiempo.
let cache: { docs: ConocimientoDoc[]; ts: number } | null = null;
const CACHE_TTL_MS = 60_000; // 60 segundos

// Palabras vacías en español (ignoradas al buscar coincidencias).
const STOP_WORDS = new Set([
  "a", "al", "alguno", "algunos", "ante", "antes", "como", "con", "contra",
  "cual", "cuando", "de", "del", "desde", "donde", "e", "el", "ella", "ellas",
  "ellos", "en", "entre", "era", "es", "ese", "esa", "eso", "está", "están",
  "estuve", "estuvo", "estamos", "estáis", "estén", "estaré", "estaría",
  "esto", "estos", "esta", "estas", "estoy", "etc", "ha", "había", "hasta",
  "hay", "hizo", "le", "les", "lo", "los", "más", "me", "mi", "mis", "mía",
  "mías", "mío", "míos", "mucho", "muchos", "muy", "más", "mía", "mías",
  "nada", "ni", "no", "nos", "nosotras", "nosotros", "nuestra", "nuestras",
  "nuestro", "nuestros", "o", "para", "pero", "por", "porque", "que", "quien",
  "quienes", "se", "sea", "sean", "seamos", "será", "sería", "si", "sí",
  "sin", "sobre", "soy", "su", "sus", "tiene", "tienen", "tú", "un", "una",
  "uno", "unos", "unas", "usa", "uso", "y", "ya", "tú", "usted", "ustedes",
  "vos", "vosotros", "vosotras", "vuestro", "vuestros", "vuestra", "vuestras",
]);

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function palabrasClave(texto: string): string[] {
  return normalizar(texto)
    .split(" ")
    .filter((p) => p.length > 0 && !STOP_WORDS.has(p));
}

/**
 * Devuelve los documentos de conocimiento activos.
 * Usa caché en memoria de 60 s. Si la consulta falla o la tabla no existe,
 * devuelve [] y registra el error (nunca lanza).
 */
export async function obtenerConocimiento(): Promise<ConocimientoDoc[]> {
  try {
    const ahora = Date.now();
    if (cache && ahora - cache.ts < CACHE_TTL_MS) {
      return cache.docs;
    }

    const promesa = prisma.conocimiento.findMany({
      where: { activo: true },
      select: { id: true, titulo: true, categoria: true, contenido: true },
    });

    const docs = await Promise.race([promesa, timeoutPromise(2000)]);

    if (!docs) {
      console.error("[conocimiento] consulta superó el tiempo de espera (2 s)");
      return [];
    }

    cache = { docs: docs as ConocimientoDoc[], ts: ahora };
    return docs as ConocimientoDoc[];
  } catch (err) {
    console.error("[conocimiento] error al leer documentos:", err);
    return [];
  }
}

/**
 * Elige los documentos más relevantes para el mensaje por coincidencia de
 * palabras clave. Devuelve un texto de contexto con máximo ~6000 caracteres.
 * Si hay pocos documentos, los incluye todos. Nunca lanza excepción.
 */
export async function seleccionarContexto(mensaje: string): Promise<string> {
  try {
    const docs = await obtenerConocimiento();
    if (docs.length === 0) return "";

    const clave = palabrasClave(mensaje);
    if (clave.length === 0) {
      // Sin palabras clave útiles: incluir todos si son pocos.
      return construirContexto(docs);
    }

    const scored = docs.map((doc) => {
      const texto = normalizar(`${doc.titulo} ${doc.contenido}`);
      const coincidencias = clave.filter((p) => texto.includes(p)).length;
      return { doc, score: coincidencias };
    });

    // Ordenar por score descendente.
    scored.sort((a, b) => b.score - a.score);

    const seleccionados = scored
      .filter((s) => s.score > 0)
      .slice(0, 5)
      .map((s) => s.doc);

    // Si nada coincide, incluir los primeros documentos hasta cubrir ~6000 chars.
    const docsParaContexto =
      seleccionados.length > 0 ? seleccionados : docs.slice(0, 3);

    return construirContexto(docsParaContexto);
  } catch (err) {
    console.error("[conocimiento] error al seleccionar contexto:", err);
    return "";
  }
}

function construirContexto(docs: ConocimientoDoc[]): string {
  const partes: string[] = [];
  let total = 0;
  const LIMITE = 6000;

  for (const doc of docs) {
    const bloque = `### ${doc.titulo} (${doc.categoria})\n${doc.contenido}\n`;
    if (total + bloque.length > LIMITE && partes.length > 0) break;
    partes.push(bloque);
    total += bloque.length;
  }

  return partes.join("\n---\n");
}

function timeoutPromise(ms: number): Promise<never> {
  return new Promise((_resolve, reject) => {
    setTimeout(() => reject(new Error("timeout")), ms);
  });
}
