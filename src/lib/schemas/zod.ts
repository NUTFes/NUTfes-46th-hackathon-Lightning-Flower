import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

// OpenAPI 用の .openapi() を使えるようにした z。スキーマはこれを import して書く。
extendZodWithOpenApi(z);

export { z };
