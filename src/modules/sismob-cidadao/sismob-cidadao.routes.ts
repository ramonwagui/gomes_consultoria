import { Router } from "express";
import { authenticate } from "../../middlewares/auth";
import { sismobQuerySchema } from "./sismob-cidadao.schema";
import { listObrasSismob } from "./sismob-cidadao.service";

const router = Router();

router.use(authenticate);

router.get("/", async (req, res) => {
  const parsed = sismobQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(422).json({
      message: "Filtros inválidos",
      issues: parsed.error.flatten()
    });
  }

  try {
    const result = await listObrasSismob(parsed.data);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Erro ao consultar portal SISMOB"
    });
  }
});

export { router as sismobRouter };
