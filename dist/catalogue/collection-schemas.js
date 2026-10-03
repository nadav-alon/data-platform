import { CATALOGUE_ITEMS_COLLECTION, catalogueItemSchema } from "./catalogue-item.js";
import { CATEGORIES_COLLECTION, categorySchema } from "./category.js";
import { SHOPS_COLLECTION, shopSchema } from "./shop.js";
import { TAG_NAMES_COLLECTION, TAGS_COLLECTION, tagNameReservationSchema, tagSchema } from "./tag.js";
/** Every Catalogue collection's zod schema, keyed by its collection name. */
export const CATALOGUE_COLLECTION_SCHEMAS = {
    [CATALOGUE_ITEMS_COLLECTION]: catalogueItemSchema,
    [CATEGORIES_COLLECTION]: categorySchema,
    [SHOPS_COLLECTION]: shopSchema,
    [TAGS_COLLECTION]: tagSchema,
    [TAG_NAMES_COLLECTION]: tagNameReservationSchema,
};
