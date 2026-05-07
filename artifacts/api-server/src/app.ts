import express, { type Express, Request, Response } from "express"; // أضفنا Request و Response
import cors from "cors";
import { pinoHttp } from "pino-http"; // تعديل: أضفنا الأقواس { }
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      // أضفنا : any أو الأنواع المخصصة لـ req و res
      req(req: any) { 
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: any) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use("/api", router);

export default app;
