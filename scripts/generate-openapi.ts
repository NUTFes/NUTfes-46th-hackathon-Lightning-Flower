import { writeFileSync } from "node:fs";
import { OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";
import { stringify } from "yaml";
import { registry } from "../src/lib/openapi/registry";

const document = new OpenApiGeneratorV31(registry.definitions).generateDocument(
  {
    openapi: "3.1.0",
    info: { title: "オトシル API", version: "0.1.0" },
  },
);

writeFileSync("openapi.yaml", stringify(document));
console.log("openapi.yaml を出力しました");
