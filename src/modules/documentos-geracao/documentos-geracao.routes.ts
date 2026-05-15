import { Router } from "express";
import multer from "multer";
import { authenticate, authorizeRoles } from "../../middlewares/auth";
import { prisma } from "../../lib/prisma";
import { UserRole } from "@prisma/client";
import {
  extractPlaceholdersFromDocx,
  generateDocument,
  convertDocxToPdf,
  generateObjectKey
} from "./documentos-geracao.service";
import { putDocumentObject, getDocumentObjectBuffer, getConveneteTimbreObjectBuffer } from "../../lib/storage/r2-storage";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

export const documentosGeracaoRouter = Router();

documentosGeracaoRouter.use(authenticate);

documentosGeracaoRouter.get("/templates", async (req, res) => {
  try {
    const { status, tipo, q } = req.query;
    const where: any = {};

    if (status) where.status = status;
    if (tipo) where.tipo = tipo;
    if (q) where.nome = { contains: String(q), mode: "insensitive" };

    const templates = await prisma.documentTemplate.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        createdByUser: { select: { id: true, nome: true, email: true } },
        _count: { select: { generatedDocuments: true } }
      }
    });

    return res.json({
      items: templates.map((t) => ({
        id: t.id,
        codigo: t.codigo,
        nome: t.nome,
        descricao: t.descricao,
        tipo: t.tipo,
        status: t.status,
        arquivoNomeOriginal: t.arquivoNomeOriginal,
        placeholdersJson: t.placeholdersJson,
        geracoes: t._count.generatedDocuments,
        createdAt: t.createdAt.toISOString(),
        criado_por: t.createdByUser
      }))
    });
  } catch (error: any) {
    console.error("[documentos-geracao] List templates error:", error);
    return res.status(500).json({ message: "Erro ao listar templates" });
  }
});

documentosGeracaoRouter.get("/templates/:id", async (req, res) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(rawId, 10);
    const template = await prisma.documentTemplate.findUnique({
      where: { id },
      include: {
        createdByUser: { select: { id: true, nome: true, email: true } },
        updatedByUser: { select: { id: true, nome: true, email: true } },
        versions: { orderBy: { version: "desc" }, take: 10 }
      }
    });

    if (!template) {
      return res.status(404).json({ message: "Template não encontrado" });
    }

    return res.json({
      id: template.id,
      codigo: template.codigo,
      nome: template.nome,
      descricao: template.descricao,
      tipo: template.tipo,
      status: template.status,
      arquivoPath: template.arquivoPath,
      arquivoNomeOriginal: template.arquivoNomeOriginal,
      arquivoMimeType: template.arquivoMimeType,
      placeholdersJson: template.placeholdersJson,
      versions: template.versions.map((v) => ({
        id: v.id,
        version: v.version,
        status: v.status,
        createdAt: v.createdAt.toISOString()
      })),
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
      criado_por: template.createdByUser,
      atualizado_por: template.updatedByUser
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Erro ao buscar template" });
  }
});

documentosGeracaoRouter.post(
  "/templates",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR),
  upload.single("arquivo"),
  async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Usuário não identificado" });
      }

      const { codigo, nome, descricao, tipo } = req.body;
      if (!codigo?.trim() || !nome?.trim()) {
        return res.status(400).json({ message: "Código e nome são obrigatórios" });
      }

      const existing = await prisma.documentTemplate.findUnique({
        where: { codigo: String(codigo).trim() }
      });
      if (existing) {
        return res.status(400).json({ message: "Código de template já existe" });
      }

      let placeholdersJson: string[] = [];
      let arquivoPath: string | undefined;
      let arquivoNomeOriginal: string | undefined;
      let arquivoMimeType: string | undefined;

      if (req.file) {
        const buffer = req.file.buffer;
        placeholdersJson = extractPlaceholdersFromDocx(buffer);
        arquivoNomeOriginal = req.file.originalname;
        arquivoMimeType = req.file.mimetype;

        arquivoPath = generateObjectKey("templates", arquivoNomeOriginal);
        await putDocumentObject({
          key: arquivoPath,
          buffer,
          contentType: req.file.mimetype
        });
      }

      const template = await prisma.documentTemplate.create({
        data: {
          codigo: String(codigo).trim(),
          nome: String(nome).trim(),
          descricao: descricao?.trim() || null,
          tipo: tipo?.trim() || "DECLARACAO",
          conteudo: "",
          status: "RASCUNHO",
          arquivoPath: arquivoPath || null,
          arquivoNomeOriginal: arquivoNomeOriginal || null,
          arquivoMimeType: arquivoMimeType || null,
          placeholdersJson: placeholdersJson,
          createdByUserId: userId
        }
      });

      return res.status(201).json({
        id: template.id,
        codigo: template.codigo,
        nome: template.nome,
        descricao: template.descricao,
        tipo: template.tipo,
        status: template.status,
        arquivoNomeOriginal: template.arquivoNomeOriginal,
        placeholdersJson: placeholdersJson,
        createdAt: template.createdAt.toISOString()
      });
    } catch (error: any) {
      console.error("[documentos-geracao] Create template error:", error);
      return res.status(500).json({ message: "Erro ao criar template" });
    }
  }
);

documentosGeracaoRouter.put(
  "/templates/:id",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR),
  upload.single("arquivo"),
  async (req, res) => {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const id = parseInt(rawId, 10);

      const nome = req.body?.nome;
      const descricao = req.body?.descricao;
      const tipo = req.body?.tipo;
      const status = req.body?.status;

      const existingTemplate = await prisma.documentTemplate.findUnique({ where: { id } });
      if (!existingTemplate) {
        return res.status(404).json({ message: "Template não encontrado" });
      }

      let placeholdersJson: string[] | null = null;
      let arquivoPath = existingTemplate.arquivoPath;
      let arquivoNomeOriginal = existingTemplate.arquivoNomeOriginal;
      let arquivoMimeType = existingTemplate.arquivoMimeType;

      if (req.file) {
        placeholdersJson = extractPlaceholdersFromDocx(req.file.buffer);
        arquivoNomeOriginal = req.file.originalname;
        arquivoMimeType = req.file.mimetype;

        arquivoPath = generateObjectKey("templates", arquivoNomeOriginal);
        await putDocumentObject({
          key: arquivoPath,
          buffer: req.file.buffer,
          contentType: req.file.mimetype
        });
      }

      const template = await prisma.documentTemplate.update({
        where: { id },
        data: {
          ...(nome?.trim() && { nome: nome.trim() }),
          ...(descricao !== undefined && { descricao: descricao?.trim() || null }),
          ...(tipo?.trim() && { tipo: tipo.trim() }),
          ...(status && { status }),
          ...(req.file && {
            arquivoPath,
            arquivoNomeOriginal,
            arquivoMimeType,
            placeholdersJson
          })
        }
      });

      return res.json({
        id: template.id,
        nome: template.nome,
        descricao: template.descricao,
        tipo: template.tipo,
        status: template.status,
        arquivoNomeOriginal: template.arquivoNomeOriginal,
        placeholdersJson: template.placeholdersJson,
        updatedAt: template.updatedAt.toISOString()
      });
    } catch (error: any) {
      console.error("[documentos-geracao] Update template error:", error);
      return res.status(500).json({ message: "Erro ao atualizar template" });
    }
  }
);

documentosGeracaoRouter.delete(
  "/templates/:id",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR),
  async (req, res) => {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const id = parseInt(rawId, 10);
      await prisma.documentTemplate.delete({ where: { id } });
      return res.json({ message: "Template excluído com sucesso" });
    } catch (error: any) {
      return res.status(500).json({ message: "Erro ao excluir template" });
    }
  }
);

documentosGeracaoRouter.get("/responsaveis-tecnicos", async (_req, res) => {
  try {
    const responsaveis = await prisma.responsavelTecnico.findMany({
      orderBy: { nome: "asc" }
    });

    return res.json({
      items: responsaveis.map((r) => ({
        id: r.id,
        nome: r.nome,
        cpf: r.cpf,
        crea: r.crea,
        cargo: r.cargo,
        createdAt: r.createdAt.toISOString()
      }))
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Erro ao listar responsáveis técnicos" });
  }
});

documentosGeracaoRouter.post(
  "/responsaveis-tecnicos",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR),
  async (req, res) => {
    try {
      const { nome, cpf, crea, cargo } = req.body;
      if (!nome?.trim() || !cpf?.trim() || !crea?.trim() || !cargo?.trim()) {
        return res.status(400).json({ message: "Todos os campos são obrigatórios" });
      }

      const existing = await prisma.responsavelTecnico.findUnique({
        where: { cpf: cpf.trim() }
      });
      if (existing) {
        return res.status(400).json({ message: "CPF já cadastrado" });
      }

      const responsavel = await prisma.responsavelTecnico.create({
        data: {
          nome: nome.trim(),
          cpf: cpf.trim(),
          crea: crea.trim(),
          cargo: cargo.trim()
        }
      });

      return res.status(201).json({
        id: responsavel.id,
        nome: responsavel.nome,
        cpf: responsavel.cpf,
        crea: responsavel.crea,
        cargo: responsavel.cargo,
        createdAt: responsavel.createdAt.toISOString()
      });
    } catch (error: any) {
      return res.status(500).json({ message: "Erro ao criar responsável técnico" });
    }
  }
);

documentosGeracaoRouter.put(
  "/responsaveis-tecnicos/:id",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR),
  async (req, res) => {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const id = parseInt(rawId, 10);
      const { nome, crea, cargo } = req.body;

      const responsavel = await prisma.responsavelTecnico.update({
        where: { id },
        data: {
          ...(nome?.trim() && { nome: nome.trim() }),
          ...(crea?.trim() && { crea: crea.trim() }),
          ...(cargo?.trim() && { cargo: cargo.trim() })
        }
      });

      return res.json({
        id: responsavel.id,
        nome: responsavel.nome,
        cpf: responsavel.cpf,
        crea: responsavel.crea,
        cargo: responsavel.cargo,
        updatedAt: responsavel.updatedAt.toISOString()
      });
    } catch (error: any) {
      return res.status(500).json({ message: "Erro ao atualizar responsável técnico" });
    }
  }
);

documentosGeracaoRouter.delete(
  "/responsaveis-tecnicos/:id",
  authorizeRoles(UserRole.ADMIN, UserRole.GESTOR),
  async (req, res) => {
    try {
      const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const id = parseInt(rawId, 10);
      await prisma.responsavelTecnico.delete({ where: { id } });
      return res.json({ message: "Responsável técnico excluído com sucesso" });
    } catch (error: any) {
      return res.status(500).json({ message: "Erro ao excluir responsável técnico" });
    }
  }
);

documentosGeracaoRouter.post("/gerar", async (req, res) => {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email;
    if (!userId || !userEmail) {
      return res.status(401).json({ message: "Usuário não identificado" });
    }

    const { instrumento_id, template_id, responsavel_tecnico_id, titulo, tipo_documento, formato } = req.body;

    const formatoSaida = formato === "pdf" ? "pdf" : "docx";

    if (!instrumento_id || !template_id) {
      return res.status(400).json({ message: "Instrumento e template são obrigatórios" });
    }

    const instrumento = await prisma.instrumentProposal.findUnique({
      where: { id: instrumento_id },
      include: { convenete: true }
    });

    if (!instrumento) {
      return res.status(404).json({ message: "Instrumento não encontrado" });
    }

    const template = await prisma.documentTemplate.findUnique({
      where: { id: template_id }
    });

    if (!template || !template.arquivoPath) {
      return res.status(404).json({ message: "Template não encontrado ou sem arquivo" });
    }

    let responsavelTecnico = null;
    const responsavelId = responsavel_tecnico_id ? parseInt(String(responsavel_tecnico_id), 10) : null;
    if (responsavelId && !isNaN(responsavelId)) {
      responsavelTecnico = await prisma.responsavelTecnico.findUnique({
        where: { id: responsavelId }
      });
    }

    const templateBuffer = await getDocumentObjectBuffer(template.arquivoPath);
    if (!templateBuffer) {
      return res.status(500).json({ message: "Erro ao carregar template" });
    }

    let timbreBuffer: Buffer | null = null;
    if (instrumento.convenete?.timbrePath) {
      try {
        timbreBuffer = await getConveneteTimbreObjectBuffer(instrumento.convenete.timbrePath);
        console.log("[documentos-geracao] Timbre loaded for proponente:", instrumento.convenete.nome);
      } catch (err) {
        console.error("[documentos-geracao] Error loading timbre:", err);
      }
    }

    const substitutions = buildSubstitutions(instrumento, instrumento.convenete, responsavelTecnico);
    
    if (instrumento.convenete?.logoPath) {
      const logoUrl = `${req.protocol}://${req.get("host")}/api/v1/proponentes/logo/${instrumento.convenete.id}?v=${instrumento.convenete.updatedAt.getTime()}`;
      substitutions["TIMBRE"] = logoUrl;
    }
    
    const generatedDocxBuffer = generateDocument(templateBuffer, substitutions, timbreBuffer);

    let outputBuffer: Buffer;
    let contentType: string;
    let extensao: string;

    if (formatoSaida === "pdf") {
      const logoUrl = instrumento.convenete?.logoPath
        ? `${req.protocol}://${req.get("host")}/api/v1/proponentes/logo/${instrumento.convenete.id}?v=${instrumento.convenete.updatedAt.getTime()}`
        : undefined;
      console.log("[documentos-geracao] PDF using logo:", logoUrl ? "yes" : "no");
      outputBuffer = await convertDocxToPdf(generatedDocxBuffer, logoUrl);
      contentType = "application/pdf";
      extensao = "pdf";
    } else {
      outputBuffer = generatedDocxBuffer;
      contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      extensao = "docx";
    }

    const outputKey = generateObjectKey("documentos", `${titulo || "documento"}.${extensao}`);
    await putDocumentObject({
      key: outputKey,
      buffer: outputBuffer,
      contentType
    });

    let docxKey: string | null = null;
    if (formatoSaida !== "docx") {
      const docxKeyGenerated = generateObjectKey("documentos", `${titulo || "documento"}.docx`);
      await putDocumentObject({
        key: docxKeyGenerated,
        buffer: generatedDocxBuffer,
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      });
      docxKey = docxKeyGenerated;
    }

    const documentoLog = await prisma.documentoLog.create({
      data: {
        instrumentId: instrumento_id,
        templateId: template_id,
        responsavelTecnicoId: responsavel_tecnico_id || null,
        tipoDocumento: tipo_documento || "DECLARACAO",
        titulo: titulo || `Documento ${template.nome}`,
        urlPdf: formatoSaida === "pdf" ? outputKey : null,
        urlDocx: formatoSaida === "docx" ? outputKey : docxKey,
        arquivoPdfPath: formatoSaida === "pdf" ? outputKey : null,
        arquivoDocxPath: formatoSaida === "docx" ? outputKey : docxKey,
        placeholdersJson: substitutions,
        usuario: userEmail,
        createdByUserId: userId
      }
    });

    return res.status(201).json({
      id: documentoLog.id,
      titulo: documentoLog.titulo,
      urlPdf: documentoLog.urlPdf,
      urlDocx: documentoLog.urlDocx,
      dataGeracao: documentoLog.dataGeracao.toISOString()
    });
  } catch (error: any) {
    console.error("[documentos-geracao] Generate error:", error);
    return res.status(500).json({ message: "Erro ao gerar documento" });
  }
});

documentosGeracaoRouter.get("/documentos-log", async (req, res) => {
  try {
    const instrumento_id = req.query.instrumento_id;
    const template_id = req.query.template_id;
    const where: any = {};

    if (instrumento_id) where.instrumentoId = parseInt(String(instrumento_id));
    if (template_id) where.templateId = parseInt(String(template_id));

    const logs = await prisma.documentoLog.findMany({
      where,
      orderBy: { dataGeracao: "desc" },
      take: 50,
      include: {
        instrument: { select: { id: true, instrumento: true, objeto: true } },
        template: { select: { id: true, nome: true } },
        responsavelTecnico: { select: { id: true, nome: true, crea: true } }
      }
    });

    return res.json({
      items: logs.map((log) => ({
        id: log.id,
        instrumento_id: log.instrumentId,
        instrumento_nome: log.instrument.instrumento,
        template_id: log.templateId,
        template_nome: log.template.nome,
        responsavel_tecnico: log.responsavelTecnico
          ? { id: log.responsavelTecnico.id, nome: log.responsavelTecnico.nome, crea: log.responsavelTecnico.crea }
          : null,
        tipoDocumento: log.tipoDocumento,
        titulo: log.titulo,
        urlPdf: log.urlPdf,
        urlDocx: log.urlDocx,
        usuario: log.usuario,
        dataGeracao: log.dataGeracao.toISOString()
      }))
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Erro ao listar documentos gerados" });
  }
});

documentosGeracaoRouter.get("/documentos-log/instrumento/:instrumentoId", async (req, res) => {
  try {
    const rawId = Array.isArray(req.params.instrumentoId) ? req.params.instrumentoId[0] : req.params.instrumentoId;
    const instrumentoId = parseInt(rawId, 10);
    const logs = await prisma.documentoLog.findMany({
      where: { instrumentId: instrumentoId },
      orderBy: { dataGeracao: "desc" },
      include: {
        template: { select: { id: true, nome: true } },
        responsavelTecnico: { select: { id: true, nome: true, crea: true } }
      }
    });

    return res.json({
      items: logs.map((log) => ({
        id: log.id,
        template_id: log.templateId,
        template_nome: log.template.nome,
        responsavel_tecnico: log.responsavelTecnico
          ? { id: log.responsavelTecnico.id, nome: log.responsavelTecnico.nome, crea: log.responsavelTecnico.crea }
          : null,
        tipoDocumento: log.tipoDocumento,
        titulo: log.titulo,
        urlPdf: log.urlPdf,
        urlDocx: log.urlDocx,
        usuario: log.usuario,
        dataGeracao: log.dataGeracao.toISOString()
      }))
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Erro ao buscar documentos do instrumento" });
  }
});

documentosGeracaoRouter.get("/documentos-log/:id/download", async (req, res) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(rawId, 10);
    const { formato } = req.query;
    const formatoVal = String(formato || "pdf").toLowerCase();

    const log = await prisma.documentoLog.findUnique({ where: { id } });
    if (!log) {
      return res.status(404).json({ message: "Documento não encontrado" });
    }

    const key = formatoVal === "docx" && log.arquivoDocxPath ? log.arquivoDocxPath : (log.arquivoPdfPath || log.arquivoDocxPath);
    if (!key) {
      return res.status(404).json({ message: "Arquivo não encontrado" });
    }
    const buffer = await getDocumentObjectBuffer(key);
    if (!buffer) {
      return res.status(404).json({ message: "Arquivo não encontrado" });
    }

    const contentType =
      formatoVal === "docx"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "application/pdf";

    const extensao = formatoVal === "docx" ? "docx" : "pdf";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${log.titulo}.${extensao}"`);
    res.setHeader("Content-Length", buffer.length);
    return res.end(buffer);
  } catch (error: any) {
    return res.status(500).json({ message: "Erro ao baixar documento" });
  }
});

documentosGeracaoRouter.get("/instrumento/:id/dados", async (req, res) => {
  try {
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const instrumentoId = parseInt(rawId, 10);
    const instrumento = await prisma.instrumentProposal.findUnique({
      where: { id: instrumentoId },
      include: { convenete: true }
    });

    if (!instrumento) {
      return res.status(404).json({ message: "Instrumento não encontrado" });
    }

    return res.json({
      instrumento: {
        id: instrumento.id,
        proposta: instrumento.proposta,
        instrumento: instrumento.instrumento,
        objeto: instrumento.objeto,
        valor_repasse: instrumento.valorRepasse,
        valor_contrapartida: instrumento.valorContrapartida,
        vigencia_inicio: instrumento.vigenciaInicio?.toISOString().split("T")[0],
        vigencia_fim: instrumento.vigenciaFim?.toISOString().split("T")[0],
        concedente: instrumento.concedente,
        status: instrumento.status,
        fluxo_tipo: instrumento.fluxoTipo
      },
      convenete: instrumento.convenete
        ? {
            id: instrumento.convenete.id,
            nome: instrumento.convenete.nome,
            cnpj: instrumento.convenete.cnpj,
            endereco: instrumento.convenete.endereco,
            bairro: instrumento.convenete.bairro,
            cep: instrumento.convenete.cep,
            cidade: instrumento.convenete.cidade,
            uf: instrumento.convenete.uf,
            tel: instrumento.convenete.tel,
            email: instrumento.convenete.email,
            gestorNome: instrumento.convenete.gestorNome,
            gestorCpf: instrumento.convenete.gestorCpf,
            gestorRg: instrumento.convenete.gestorRg,
            gestorEndereco: instrumento.convenete.gestorEndereco
          }
        : null
    });
  } catch (error: any) {
    return res.status(500).json({ message: "Erro ao buscar dados do instrumento" });
  }
});

function buildSubstitutions(
  instrumento: any,
  convenete: any,
  responsavelTecnico: any | null
): Record<string, string> {
  const subs: Record<string, string> = {};

  if (convenete) {
    subs["NOME_PREFEITURA"] = convenete.nome || "";
    subs["CNPJ_PREFEITURA"] = convenete.cnpj || "";
    subs["ENDERECO_PREFEITURA"] = convenete.endereco || "";
    subs["BAIRRO_PREFEITURA"] = convenete.bairro || "";
    subs["CEP_PREFEITURA"] = convenete.cep || "";
    subs["CIDADE_PREFEITURA"] = convenete.cidade || "";
    subs["UF_PREFEITURA"] = convenete.uf || "";
    subs["TELEFONE_PREFEITURA"] = convenete.tel || "";
    subs["EMAIL_PREFEITURA"] = convenete.email || "";
    subs["NOME_GESTOR"] = convenete.gestorNome || "";
    subs["CPF_GESTOR"] = convenete.gestorCpf || "";
    subs["RG_GESTOR"] = convenete.gestorRg || "";
    subs["ENDERECO_GESTOR"] = convenete.gestorEndereco || "";
    subs["EMAIL_GESTOR"] = convenete.gestorEmail || "";
  }

  if (instrumento) {
    subs["NUMERO_PROPOSTA"] = instrumento.proposta || "";
    subs["NUMERO_INSTRUMENTO"] = instrumento.instrumento || "";
    subs["OBJETO"] = instrumento.objeto || "";
    subs["VALOR_REPASSE"] = formatCurrency(Number(instrumento.valorRepasse));
    subs["VALOR_CONTRAPARTIDA"] = formatCurrency(Number(instrumento.valorContrapartida));
    subs["VALOR_TOTAL"] = formatCurrency(Number(instrumento.valorRepasse) + Number(instrumento.valorContrapartida));
    subs["VIGENCIA_INICIO"] = instrumento.vigenciaInicio ? formatDate(instrumento.vigenciaInicio) : "";
    subs["VIGENCIA_FIM"] = instrumento.vigenciaFim ? formatDate(instrumento.vigenciaFim) : "";
    subs["CONCEDENTE"] = instrumento.concedente || "";
    subs["STATUS"] = instrumento.status || "";
    subs["FLUXO_TIPO"] = instrumento.fluxoTipo || "";
  }

  if (responsavelTecnico) {
    subs["NOME_ENGENHEIRO"] = responsavelTecnico.nome || "";
    subs["CPF_ENGENHEIRO"] = responsavelTecnico.cpf || "";
    subs["CREA_ENGENHEIRO"] = responsavelTecnico.crea || "";
    subs["CARGO_ENGENHEIRO"] = responsavelTecnico.cargo || "";
  }

  return subs;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(date));
}