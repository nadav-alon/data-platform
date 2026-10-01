import { z } from "zod";
import { type ItemId } from "../core/index.ts";
export declare const CATALOGUE_ITEMS_COLLECTION = "catalogueItems";
/** The doc path for one CatalogueItem, ready for `doc(db, ...)`. */
export declare function catalogueItemDocPath(itemId: ItemId): string;
/**
 * Keyed by the Core Item's {@link ItemId}. `shopId`, when set, overrides the Category's default.
 */
export declare const catalogueItemSchema: z.ZodObject<{
    categoryId: z.ZodString & z.ZodType<import("./category.ts").CategoryId, string, z.core.$ZodTypeInternals<import("./category.ts").CategoryId, string>>;
    necessity: z.ZodEnum<{
        essential: "essential";
        important: "important";
        optional: "optional";
    }>;
    shopId: z.ZodOptional<z.ZodString & z.ZodType<import("./shop.ts").ShopId, string, z.core.$ZodTypeInternals<import("./shop.ts").ShopId, string>>>;
    deletedAt: z.ZodOptional<z.ZodCustom<import("../core/timestamp.ts").FirestoreTimestamp, import("../core/timestamp.ts").FirestoreTimestamp>>;
}, z.core.$loose>;
export type CatalogueItem = z.infer<typeof catalogueItemSchema>;
