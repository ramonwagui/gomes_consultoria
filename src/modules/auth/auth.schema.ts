import { UserRole } from "@prisma/client";
import { z } from "zod";

export const registerSchema = z.object({
  nome: z.string().min(2).max(120),
  email: z.string().email().max(180),
  senha: z.string().min(6).max(100),
  role: z.nativeEnum(UserRole).default(UserRole.CONSULTA)
});

export const loginSchema = z.object({
  email: z.string().email().max(180),
  senha: z.string().min(6).max(100)
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
