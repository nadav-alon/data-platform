import { z } from "zod";
export declare const SHOPS_COLLECTION = "shops";
declare const shopIdBrand: unique symbol;
export type ShopId = string & {
    readonly [shopIdBrand]: true;
};
export declare function isShopId(value: string): value is ShopId;
export declare function shopId(value: string): ShopId;
export declare const shopIdSchema: z.ZodString & z.ZodType<ShopId, string, z.core.$ZodTypeInternals<ShopId, string>>;
/**
 * A kind of place (pharmacy, grocery), not a specific store.
 */
export declare const shopSchema: z.ZodObject<{
    name: z.ZodString;
    referenceCount: z.ZodNumber;
}, z.core.$loose>;
export type Shop = z.infer<typeof shopSchema>;
export {};
