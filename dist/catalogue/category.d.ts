import { z } from "zod";
export declare const CATEGORIES_COLLECTION = "categories";
declare const categoryIdBrand: unique symbol;
export type CategoryId = string & {
    readonly [categoryIdBrand]: true;
};
export declare function isCategoryId(value: string): value is CategoryId;
export declare function categoryId(value: string): CategoryId;
export declare const categoryIdSchema: z.ZodString & z.ZodType<CategoryId, string, z.core.$ZodTypeInternals<CategoryId, string>>;
export declare const categorySchema: z.ZodObject<{
    name: z.ZodString;
    defaultShopId: z.ZodString & z.ZodType<import("./shop.ts").ShopId, string, z.core.$ZodTypeInternals<import("./shop.ts").ShopId, string>>;
}, z.core.$loose>;
export type Category = z.infer<typeof categorySchema>;
export {};
