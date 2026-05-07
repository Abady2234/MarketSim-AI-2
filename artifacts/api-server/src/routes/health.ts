import { Router, Request, Response } from "express"; // أضفنا Request و Response
import { HealthCheckResponse } from "@workspace/api-zod";

const router = Router(); // استخدم Router مباشرة أسهل وأضمن

// أضفنا الأنواع :Request و :Response هنا
router.get("/healthz", (_req: Request, res: Response) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

export default router;
