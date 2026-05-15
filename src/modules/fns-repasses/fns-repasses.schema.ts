import { z } from "zod";

const optionalText = z.preprocess((value) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "string") {
    return value;
  }
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}, z.string().optional());

const optionalCnpjCpf = z.preprocess((value) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "string") {
    return value;
  }
  const digits = value.replace(/\D/g, "");
  return digits === "" ? undefined : digits;
}, z.string().min(11).max(14).optional());

const optionalAno = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  return value;
}, z.coerce.number().int().min(2000).max(2100).optional());

const optionalUfCodigo = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  return value;
}, z.coerce.number().int().min(11).max(53).optional());

export const fnsMunicipiosQuerySchema = z.object({
  uf_id: optionalUfCodigo
});

export const fnsEntidadesQuerySchema = z.object({
  co_ibge_municipio: z.coerce.number().int().min(100000).max(9999999)
});

export const fnsRepassesQuerySchema = z.object({
  ano: optionalAno,
  cnpj: optionalCnpjCpf,
  cpf_cnpj: optionalCnpjCpf
});

export const fnsRepassesDetalheQuerySchema = z.object({
  ano: optionalAno,
  cnpj: optionalCnpjCpf,
  cpf_cnpj: optionalCnpjCpf,
  codigo_bloco: optionalText,
  codigoBloco: optionalText
});

export const fnsSaldosTiposContaQuerySchema = z.object({
  cnpj: optionalCnpjCpf,
  cpf_cnpj: optionalCnpjCpf
});

export const fnsSyncBodySchema = z.object({
  ano: optionalAno,
  cnpjs: z.array(z.string().regex(/^\d{11,14}$/)).min(1).max(50).default([]),
  incluir_ufs: z.boolean().optional().default(true)
});

export type FnsMunicipiosQueryInput = z.infer<typeof fnsMunicipiosQuerySchema>;
export type FnsEntidadesQueryInput = z.infer<typeof fnsEntidadesQuerySchema>;
export type FnsRepassesQueryInput = z.infer<typeof fnsRepassesQuerySchema>;
export type FnsRepassesDetalheQueryInput = z.infer<typeof fnsRepassesDetalheQuerySchema>;
export type FnsSaldosTiposContaQueryInput = z.infer<typeof fnsSaldosTiposContaQuerySchema>;
export type FnsSyncBodyInput = z.infer<typeof fnsSyncBodySchema>;
