import { SismobObra, SismobQueryInput } from "./sismob-cidadao.schema";

const SISMOB_BASE_URL = "https://sismobcidadao.saude.gov.br";
const UF_IBGE_BY_SIGLA: Record<string, string> = {
  AC: "12",
  AL: "27",
  AP: "16",
  AM: "13",
  BA: "29",
  CE: "23",
  DF: "53",
  ES: "32",
  GO: "52",
  MA: "21",
  MT: "51",
  MS: "50",
  MG: "31",
  PA: "15",
  PB: "25",
  PR: "41",
  PE: "26",
  PI: "22",
  RJ: "33",
  RN: "24",
  RS: "43",
  RO: "11",
  RR: "14",
  SC: "42",
  SP: "35",
  SE: "28",
  TO: "17"
};

type SismobMunicipioApiItem = {
  nome?: string;
  ibge?: string;
};

type SismobObraApiItem = {
  propostaId?: number | string;
  numeroProposta?: string;
  situacaoObra?: string;
  municipio?: string;
  uf?: string;
  nomeEstabelecimento?: string | null;
  tipoObra?: string | null;
  programa?: string | null;
  redePrograma?: string | null;
  bairro?: string | null;
  novoBairro?: string | null;
  vlPercentualExecutado?: number | null;
  vlProposta?: number | null;
};

type SismobObraDetalheApiItem = {
  coSeqProposta?: number | string;
  nuProposta?: string;
  sgUf?: string;
  noMunicipio?: string;
  noMunicipioAcentuado?: string;
  dsSituacaoObra?: string;
  noEstabelecimentoProposta?: string | null;
  noEstabelecimentoCnes?: string | null;
  dsTipoObra?: string | null;
  dsPrograma?: string | null;
  dsRedePrograma?: string | null;
  dsBairro?: string | null;
  noBairro?: string | null;
  vlPercentualExecutado?: number | null;
  vlProposta?: number | null;
  dtAtualizacao?: string | null;
  vlPrimeraParcela?: number | null;
  vlPrimeiraParcela?: number | null;
  vlSegundaParcela?: number | null;
  vlTerceiraParcela?: number | null;
  vlQuartaParcela?: number | null;
};

type SismobObrasApiResponse = {
  content?: SismobObraApiItem[];
  totalElements?: number;
  totalPages?: number;
  size?: number;
  number?: number;
};

const normalizeName = (value?: string) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const fetchJson = async <T>(path: string, params?: Record<string, string | number | undefined>) => {
  const url = new URL(path, SISMOB_BASE_URL);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === "") {
        continue;
      }
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json, text/plain, */*",
      Referer: `${SISMOB_BASE_URL}/`,
      "User-Agent": "Mozilla/5.0 GestConv360/1.0"
    }
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Falha ao consultar SISMOB (${response.status}). ${detail || ""}`.trim());
  }

  return (await response.json()) as T;
};

const toUfIbge = (uf: string) => {
  const ufIbge = UF_IBGE_BY_SIGLA[uf.toUpperCase()];
  if (!ufIbge) {
    throw new Error(`UF "${uf}" inválida para consulta no SISMOB.`);
  }
  return ufIbge;
};

const findMunicipioIbge = async (uf: string, municipio: string) => {
  const ufIbge = toUfIbge(uf);
  const municipios = await fetchJson<SismobMunicipioApiItem[]>("/api/public/endereco/municipios", {
    query: municipio,
    ufIbge
  });

  const normalizedTarget = normalizeName(municipio);
  const exact = municipios.find((item) => normalizeName(item.nome) === normalizedTarget);

  if (exact?.ibge) {
    return exact.ibge;
  }

  const first = municipios.find((item) => item.ibge);
  if (first?.ibge) {
    return first.ibge;
  }

  throw new Error(`Município "${municipio}" não encontrado no portal SISMOB para a UF ${uf}.`);
};

const toNumber = (value: number | string | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const sumParcelasPagas = (detalhe?: SismobObraDetalheApiItem | null): number => {
  if (!detalhe) {
    return 0;
  }

  const parcelas: Array<number | string | null | undefined> = [
    detalhe.vlPrimeraParcela ?? detalhe.vlPrimeiraParcela,
    detalhe.vlSegundaParcela,
    detalhe.vlTerceiraParcela,
    detalhe.vlQuartaParcela
  ];

  return parcelas.reduce<number>((acc, value) => acc + toNumber(value), 0);
};

const mapObra = (item: SismobObraApiItem, detalhe?: SismobObraDetalheApiItem | null): SismobObra => {
  const nomeEstabelecimento = (
    detalhe?.noEstabelecimentoProposta ??
    detalhe?.noEstabelecimentoCnes ??
    item.nomeEstabelecimento ??
    ""
  ).trim();
  const tipoObra = (detalhe?.dsTipoObra ?? item.tipoObra ?? "").trim();
  const programa = (detalhe?.dsPrograma ?? item.programa ?? "").trim();
  const redePrograma = (detalhe?.dsRedePrograma ?? item.redePrograma ?? "").trim();
  const bairro = (detalhe?.dsBairro ?? detalhe?.noBairro ?? item.novoBairro ?? item.bairro ?? "").trim();

  const objetoPartes = [nomeEstabelecimento, tipoObra, programa, redePrograma, bairro].filter(Boolean);

  return {
    id: String(detalhe?.coSeqProposta ?? item.propostaId ?? item.numeroProposta ?? `${item.uf ?? ""}-${item.municipio ?? ""}-${Math.random()}`),
    codigo: detalhe?.nuProposta?.trim() || item.numeroProposta?.trim() || "N/A",
    municipio: detalhe?.noMunicipioAcentuado?.trim() || detalhe?.noMunicipio?.trim() || item.municipio?.trim() || "N/A",
    uf: detalhe?.sgUf?.trim() || item.uf?.trim() || "N/A",
    objeto: objetoPartes.join(" | ") || "N/A",
    situacao: detalhe?.dsSituacaoObra?.trim() || item.situacaoObra?.trim() || "N/A",
    valor_total: toNumber(detalhe?.vlProposta ?? item.vlProposta),
    valor_pago: sumParcelasPagas(detalhe),
    percentual_execucao: toNumber(detalhe?.vlPercentualExecutado ?? item.vlPercentualExecutado),
    ultima_atualizacao: detalhe?.dtAtualizacao ?? null
  };
};

const fetchObraDetalhe = async (propostaId: number | string | undefined) => {
  if (propostaId === undefined || propostaId === "") {
    return null;
  }

  try {
    return await fetchJson<SismobObraDetalheApiItem>(`/api/public/obras/${propostaId}`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("[sismob] detalhe da obra indisponivel", { propostaId, error });
    return null;
  }
};

export const listObrasSismob = async (query: SismobQueryInput) => {
  const ufIbge = toUfIbge(query.uf);
  const municipioIbge = await findMunicipioIbge(query.uf, query.municipio);
  const apiPage = Math.max(0, query.page - 1);

  const response = await fetchJson<SismobObrasApiResponse>("/api/public/obras", {
    ufIbge,
    municipioIbge,
    page: apiPage,
    size: query.page_size
  });

  const content = Array.isArray(response.content) ? response.content : [];
  const detalhes = await Promise.all(content.map((item) => fetchObraDetalhe(item.propostaId)));
  const itens = content.map((item, index) => mapObra(item, detalhes[index]));

  return {
    itens,
    paginacao: {
      pagina: (response.number ?? apiPage) + 1,
      tamanho_pagina: response.size ?? query.page_size,
      total: response.totalElements ?? itens.length,
      total_paginas: response.totalPages ?? 1
    }
  };
};
