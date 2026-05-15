import { z } from "zod";

export const assistentePerguntaBodySchema = z.object({
  pergunta: z.string().trim().min(3).max(500),
  session_id: z.string().trim().min(8).max(100).optional(),
  historico: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        text: z.string().trim().min(1).max(1000)
      })
    )
    .max(20)
    .optional()
});

export type AssistentePerguntaInput = z.infer<typeof assistentePerguntaBodySchema>;
