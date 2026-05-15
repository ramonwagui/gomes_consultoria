import { z } from "zod";

export const sismobQuerySchema = z.object({
  uf: z.string().length(2).transform((v) => v.toUpperCase()),
  municipio: z.string().min(1),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20)
});

export type SismobQueryInput = z.infer<typeof sismobQuerySchema>;

export type SismobObra = {
  id: string;
  codigo: string;
  municipio: string;
  uf: string;
  objeto: string;
  situacao: string;
  valor_total: number;
  valor_pago: number;
  percentual_execucao: number;
  ultima_atualizacao: string | null;
};
