import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { catalogueItemSchema } from "../catalogue/catalogue-item.js";
import { itemIdSchema, itemSchema } from "../core/item.js";
import { addCatalogueItem } from "./catalogue-writer.js";
import { setIngredientLink, setIngredientLinkSchema } from "./ingredient-writer.js";
import { readCategories, readFoods, readItems, readRecipes } from "./household-reader.js";
import { addFood, newFoodSchema, setFoodNutrition, setFoodNutritionSchema } from "./food-writer.js";
import { logFood, logFoodInputSchema } from "./log-writer.js";
import { addRecipe, newRecipeSchema } from "./recipe-writer.js";
import { stateSchema } from "../core/state.js";
import { setItemState } from "./household-writer.js";
const READ_ONLY = { readOnlyHint: true, openWorldHint: false };
const ADDS_ONLY = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };
const UPDATES = { ...ADDS_ONLY, idempotentHint: true };
/** One JSON text block: the raw records, with no derived view. */
function asJson(records) {
    return { content: [{ type: "text", text: JSON.stringify(records, null, 2) }] };
}
/**
 * The MCP server over one Household's Firestore. Its read tools return raw records: what is
 * makeable, and what to shop for, is left to the model to work out from them. Its writes,
 * `add_catalogue_item`, `add_food`, `set_food_nutrition`, `log_food`, `add_recipe`, `set_item_state` and `set_ingredient_link`, ask for no
 * confirmation of their own: the client's tool permission prompt is the only one. Connect it to a
 * transport with `server.connect`.
 */
export function createHouseholdServer(db) {
    const server = new McpServer({ name: "data-platform-household", version: "0.1.0" });
    server.registerTool("list_items", {
        description: "Every live Item in the Household with its State (enough, running low or out). Soft-deleted Items are left out.",
        annotations: READ_ONLY,
    }, async () => asJson(await readItems(db)));
    server.registerTool("list_recipes", {
        description: "Every live Recipe with its Ingredients, steps and notes. Each Ingredient carries `item`, the live Item it links to with its State, or null when it names none (unlinked or assumed) or names a soft-deleted one. Soft-deleted Recipes are left out.",
        annotations: READ_ONLY,
    }, async () => asJson(await readRecipes(db)));
    server.registerTool("list_foods", {
        description: "Every live Food the Household has saved, with its `place` and `perServing` Nutrition, so an existing Food can be reused instead of adding a duplicate. Soft-deleted Foods are left out.",
        annotations: READ_ONLY,
    }, async () => asJson(await readFoods(db)));
    server.registerTool("list_categories", {
        description: "Every live Category in the Household's catalogue with its id, name and default Shop (`defaultShopId`), so a `categoryId` for add_catalogue_item can be chosen. Soft-deleted Categories are left out.",
        annotations: READ_ONLY,
    }, async () => asJson(await readCategories(db)));
    server.registerTool("add_catalogue_item", {
        description: "Add a new Item to the Household's catalogue. `state` is enough, running low or out (default enough); `necessity` is essential, important or optional; `categoryId` names a live Category (see list_categories), and `shopId`, when given, a live Shop overriding the Category's default. Returns the new Item's id.",
        inputSchema: {
            name: itemSchema.shape.name,
            state: itemSchema.shape.state.optional(),
            categoryId: catalogueItemSchema.shape.categoryId,
            necessity: catalogueItemSchema.shape.necessity,
            shopId: catalogueItemSchema.shape.shopId,
            aisleId: catalogueItemSchema.shape.aisleId,
            tagIds: catalogueItemSchema.shape.tagIds.optional(),
        },
        annotations: ADDS_ONLY,
    }, async (input) => asJson({ id: await addCatalogueItem(db, input) }));
    server.registerTool("add_food", {
        description: "Add a Food to the Household: a dish or product that is not a Recipe. Check list_foods first and reuse an existing Food rather than adding a duplicate. `perServing` is the Nutrition (kcal, proteinG, carbsG, fatG) of one serving, which `servingLabel` may describe (\"1 plate\"); `place` is where it is eaten or bought. A guess from a photo or a description rather than a label or source MUST be saved with `estimated: true`; leave `estimated` out only for numbers taken from a label or source. Returns the new Food's id.",
        inputSchema: newFoodSchema,
        annotations: ADDS_ONLY,
    }, async (food) => asJson({ id: await addFood(db, food) }));
    server.registerTool("set_food_nutrition", {
        description: "Change the Nutrition of one live Food, by an id from list_foods. `perServing` replaces its per-serving Nutrition (kcal, proteinG, carbsG, fatG) and is validated as add_food validates it. `estimated` replaces the Food's flag: pass `estimated: true` for a guess, and leave it out for numbers taken from a label or source (which clears the flag). Its other fields are kept, and Log Entries already logged from it keep the Nutrition they were logged with. Returns the Food's id.",
        inputSchema: setFoodNutritionSchema,
        annotations: UPDATES,
    }, async (input) => asJson({ id: await setFoodNutrition(db, input) }));
    server.registerTool("log_food", {
        description: "Log something the signed-in Member ate, in their own private log. Give a `foodId` from list_foods (add_food first if it is not there), or, for a one-off, a `name` with per-serving `nutrition` and no `foodId`. The entry's totals are the per-serving Nutrition times `servings` (default 1, 1.5 allowed). `eatenAt` is an ISO 8601 date-time (default now); `mealType` is breakfast, lunch, dinner or snack, guessed from the clock time of `eatenAt` (in the offset you give it) when left out. A quick entry whose nutrition is an estimate (a guess rather than a label or source) must pass `estimated: true`; an entry from a `foodId` copies the Food's own flag and ignores `estimated`. Prefer saving an estimated dish as a Food through add_food (with `estimated: true`) so it can be reused. Returns the new Log Entry's id.",
        inputSchema: logFoodInputSchema,
        annotations: ADDS_ONLY,
    }, async (input) => asJson({ id: await logFood(db, input) }));
    server.registerTool("add_recipe", {
        description: "Add a Recipe with its Ingredients to the Household. Read the source (a URL or pasted text) first and pass the Recipe as structured input; the server fetches nothing. An Ingredient may link an Item by an `itemId` from list_items; an assumed Ingredient (a staple such as salt) names no Item; a `unit` needs a `quantity`. Returns the new Recipe's id.",
        inputSchema: newRecipeSchema,
        annotations: ADDS_ONLY,
    }, async (recipe) => asJson({ id: await addRecipe(db, recipe) }));
    server.registerTool("set_item_state", {
        description: "Set one live Item's State, recording it in the Item's State history. Use an Item id from list_items.",
        inputSchema: { itemId: itemIdSchema, state: stateSchema },
        annotations: {
            readOnlyHint: false,
            destructiveHint: false,
            idempotentHint: false,
            openWorldHint: false,
        },
    }, async ({ itemId: id, state }) => {
        try {
            await setItemState(db, id, state);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return { isError: true, content: [{ type: "text", text: message }] };
        }
        return { content: [{ type: "text", text: `Set ${id} to ${state}.` }] };
    });
    server.registerTool("set_ingredient_link", {
        description: "Change what one Ingredient of a live Recipe points at. `ingredient` is its 0-based position in the Recipe's Ingredients (see list_recipes). `link` is `{ itemId }` to link it to an Item from list_items, `{ assumed: true }` to mark it a staple taken as already in the house, or `{}` to unlink it. Its other fields are kept. Returns the Recipe's id.",
        inputSchema: setIngredientLinkSchema,
        annotations: UPDATES,
    }, async (input) => asJson({ id: await setIngredientLink(db, input) }));
    return server;
}
