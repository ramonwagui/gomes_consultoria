import { UserRole } from "@prisma/client";
import { z } from "zod";

export const userIdParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

export const createUserSchema = z.object({
  nome: z.string().min(2).max(120),
  email: z.string().email().max(180),
  senha: z.string().min(6).max(100),
  role: z.nativeEnum(UserRole),
  proponente_ids: z.array(z.coerce.number().int().positive()).optional().default([])
});

export const updateUserSchema = z
  .object({
    nome: z.string().min(2).max(120).optional(),
    email: z.string().email().max(180).optional(),
    senha: z.string().min(6).max(100).optional(),
    role: z.nativeEnum(UserRole).optional(),
    proponente_ids: z.array(z.coerce.number().int().positive()).optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Informe ao menos um campo para atualizar."
  });

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
