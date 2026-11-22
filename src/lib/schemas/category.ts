import { z } from "./zod";

export const Category = z
  .object({
    id: z.number().int(),
    name: z.string(),
    isValuableDefault: z.boolean(),
  })
  .openapi("Category");

export const CategoryList = z
  .object({ items: z.array(Category) })
  .openapi("CategoryList");

export type Category = z.infer<typeof Category>;
export type CategoryList = z.infer<typeof CategoryList>;
