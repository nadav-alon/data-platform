import { z } from "zod";
export declare const STORES_COLLECTION = "stores";
declare const storeIdBrand: unique symbol;
export type StoreId = string & {
    readonly [storeIdBrand]: true;
};
export declare function isStoreId(value: string): value is StoreId;
export declare function storeId(value: string): StoreId;
export declare const storeIdSchema: z.ZodString & z.ZodType<StoreId, string, z.core.$ZodTypeInternals<StoreId, string>>;
/**
 * A named Store under one Shop ("Osher Ad" under "grocery"). Branches aren't modelled: a second
 * differing branch is another Store with a longer name. Nothing references a Store, so it holds
 * no reference count and doesn't count toward its Shop's.
 */
export declare const storeSchema: z.ZodObject<{
    name: z.ZodString;
    shopId: z.ZodString & z.ZodType<import("./shop.ts").ShopId, string, z.core.$ZodTypeInternals<import("./shop.ts").ShopId, string>>;
    aisleOrder: z.ZodDefault<z.ZodArray<z.ZodString & z.ZodType<import("./aisle.ts").AisleId, string, z.core.$ZodTypeInternals<import("./aisle.ts").AisleId, string>>>>;
    deletedAt: z.ZodOptional<z.ZodCustom<import("../core/timestamp.ts").FirestoreTimestamp, import("../core/timestamp.ts").FirestoreTimestamp>>;
}, z.core.$loose>;
export type Store = z.infer<typeof storeSchema>;
export {};
