import { Router } from "express";
import { authenticate } from "../../middlewares/auth";

export const consultaCnpjRouter = Router();

consultaCnpjRouter.use(authenticate);

consultaCnpjRouter.get("/:cnpj", async (req, res) => {
  try {
    const cnpjRaw = Array.isArray(req.params.cnpj) ? req.params.cnpj[0] : req.params.cnpj;
    const cnpj = cnpjRaw.replace(/\D/g, "");

    console.log("[consulta-cnpj] CNPJ recebido:", cnpj);

    if (cnpj.length !== 14) {
      return res.status(400).json({ message: "CNPJ inválido. Deve ter 14 dígitos." });
    }

    console.log("[consulta-cnpj] Fazendo request para API externa...");
    const response = await fetch(`https://publica.cnpj.ws/cnpj/${cnpj}`, {
      headers: {
        "Accept": "application/json"
      }
    });

    console.log("[consulta-cnpj] Status response:", response.status);

    if (!response.ok) {
      if (response.status === 429) {
        return res.status(429).json({ message: "Limite de consultas excedido. Tente novamente em 1 minuto." });
      }
      if (response.status === 404) {
        return res.status(404).json({ message: "CNPJ não encontrado." });
      }
      return res.status(response.status).json({ message: "Erro ao consultar CNPJ." });
    }

    const data = await response.json();

    const estab = data.estabelecimento || {};
    const pais = estab.pais || {};
    const estado = estab.estado || {};
    const cidade = estab.cidade || {};

    const cepRaw = estab.cep || "";
    const cepFormatado = cepRaw.length === 8 ? `${cepRaw.slice(0,5)}-${cepRaw.slice(5)}` : cepRaw;

    const result = {
      nome: data.razao_social || "",
      nome_fantasia: estab.nome_fantasia || "",
      situacao_cadastral: estab.situacao_cadastral || "",
      data_abertura: estab.data_inicio_atividade || "",
      logradouro: estab.logradouro || "",
      numero: estab.numero || "",
      complemento: estab.complemento || "",
      bairro: estab.bairro || "",
      cep: cepFormatado,
      uf: estado.sigla || "",
      cidade: cidade.nome || "",
      pais: pais.nome || "",
      telefone: estab.telefone1 || "",
      email: estab.email || ""
    };

    return res.json(result);
  } catch (error: any) {
    console.error("[consulta-cnpj] Error:", error);
    return res.status(500).json({ message: "Erro ao consultar CNPJ." });
  }
});