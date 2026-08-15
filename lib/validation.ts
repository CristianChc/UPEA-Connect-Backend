import { z } from "zod";

export const registerSchema = z.object({
  nombre: z.string().min(2, "El nombre es obligatorio"),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  carrera: z.string().min(2, "La carrera es obligatoria"),
  semestre: z.string().min(1, "El semestre es obligatorio"),
});

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export const updateProfileSchema = z.object({
  nombre: z.string().min(2).optional(),
  carrera: z.string().min(2).optional(),
  semestre: z.string().min(1).optional(),
  fotoUrl: z.string().url("fotoUrl debe ser una URL válida").nullable().optional(),
});

export const floatingElementSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("TEXT"),
    positionX: z.number(),
    positionY: z.number(),
    width: z.number(),
    height: z.number(),
    text: z.string().min(1, "text es requerido para elementos TEXT"),
    imageUrl: z.string().url("imageUrl debe ser una URL válida").optional(),
  }),
  z.object({
    type: z.literal("IMAGE"),
    positionX: z.number(),
    positionY: z.number(),
    width: z.number(),
    height: z.number(),
    imageUrl: z.string().url("imageUrl debe ser una URL válida"),
    text: z.string().optional(),
  }),
]);

export const notePageSchema = z.object({
  pageIndex: z.number().int().min(0, "pageIndex debe ser un entero >= 0"),
  textContent: z.string().optional(),
  floatingElements: z.array(floatingElementSchema).default([]),
});

export const createNoteSchema = z.object({
  title: z.string().min(1, "El título es obligatorio"),
  content: z.string().min(1, "El contenido es obligatorio"),
  courseName: z.string().optional(),
  pages: z.array(notePageSchema).default([]),
});

export const listNotesQuerySchema = z.object({
  search: z.string().optional(),
  courseName: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const eventTypeSchema = z.enum(["EXAM", "ASSIGNMENT", "CLASS", "REMINDER", "OTHER"]);

export const createEventSchema = z.object({
  title: z.string().min(1, "El título es obligatorio"),
  description: z.string().optional(),
  date: z.coerce.date("date debe ser una fecha válida"),
  type: eventTypeSchema,
});

export const updateEventSchema = createEventSchema.partial();

export const completeEventSchema = z.object({
  isCompleted: z.boolean("isCompleted debe ser un booleano"),
});

export const listEventsQuerySchema = z.object({
  start: z.coerce.date().optional(),
  end: z.coerce.date().optional(),
  type: eventTypeSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type ListNotesQuery = z.infer<typeof listNotesQuerySchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type ListEventsQuery = z.infer<typeof listEventsQuerySchema>;
