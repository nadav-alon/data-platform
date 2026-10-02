import type { RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { Timestamp } from "firebase/firestore";
import { CATALOGUE_ITEMS_COLLECTION } from "../../src/catalogue/catalogue-item.ts";
import { CATEGORIES_COLLECTION, type CategoryId } from "../../src/catalogue/category.ts";
import { SHOPS_COLLECTION, type ShopId } from "../../src/catalogue/shop.ts";
import {
  TAG_NAMES_COLLECTION,
  TAGS_COLLECTION,
  tagNameKey,
  type TagId,
} from "../../src/catalogue/tag.ts";
import { ITEMS_COLLECTION, type ItemId } from "../../src/core/item.ts";
import { HOUSEHOLD_DOC_PATH } from "../../src/core/household.ts";
import type { Email } from "../../src/core/email.ts";
import { inviteDocPath } from "../../src/core/invites.ts";
import { memberDocPath } from "../../src/core/members.ts";
import type { Uid } from "../../src/core/uid.ts";

const validMemberData = {
  email: "member@example.com",
  addedAt: { seconds: 1_700_000_000, nanoseconds: 0 },
};

/** Seeds `members/{uid}` directly, bypassing rules, so a test can assume a Member exists. */
export async function seedMember(testEnv: RulesTestEnvironment, memberUid: Uid): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(memberDocPath(memberUid)).set(validMemberData);
  });
}

/** Seeds a claimed Household directly, bypassing rules, so a test can start post-bootstrap. */
export async function seedHousehold(testEnv: RulesTestEnvironment, owner: Uid): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(HOUSEHOLD_DOC_PATH).set({ owner });
  });
  await seedMember(testEnv, owner);
}

/** A `deletedAt` a seeded doc can carry to start out soft-deleted. */
export const seededDeletedAt = Timestamp.fromMillis(1_700_000_000_000);

/** The fields a seeder spreads in to start its doc soft-deleted, or none when it is live. */
function deletedFields(deleted: boolean): { deletedAt?: Timestamp } {
  return deleted ? { deletedAt: seededDeletedAt } : {};
}

/**
 * Seeds a Shop directly, bypassing rules, so a test can start from a known referenceCount;
 * soft-deleted when `deleted` is set.
 */
export async function seedShop(
  testEnv: RulesTestEnvironment,
  id: ShopId,
  referenceCount: number,
  { deleted = false }: { deleted?: boolean } = {},
): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context
      .firestore()
      .doc(`${SHOPS_COLLECTION}/${id}`)
      .set({ name: "Shop", referenceCount, ...deletedFields(deleted) });
  });
}

/** Seeds a Category directly, bypassing rules, so a test can start from a known referenceCount. */
export async function seedCategory(
  testEnv: RulesTestEnvironment,
  id: CategoryId,
  defaultShopId: ShopId,
  referenceCount: number,
  { deleted = false }: { deleted?: boolean } = {},
): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context
      .firestore()
      .doc(`${CATEGORIES_COLLECTION}/${id}`)
      .set({
        name: "Category",
        defaultShopId,
        referenceCount,
        ...deletedFields(deleted),
      });
  });
}

/** Seeds `invites/{email}` directly, bypassing rules, so a test can assume an invite is pending. */
export async function seedInvite(testEnv: RulesTestEnvironment, invitee: Email): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().doc(inviteDocPath(invitee)).set({
      invitedAt: { seconds: 1_700_000_000, nanoseconds: 0 },
    });
  });
}

/** Seeds an Item directly, bypassing rules; soft-deleted when `deleted` is set. */
export async function seedItem(
  testEnv: RulesTestEnvironment,
  id: ItemId,
  { deleted = false }: { deleted?: boolean } = {},
): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context
      .firestore()
      .doc(`${ITEMS_COLLECTION}/${id}`)
      .set({ name: "Item", state: "enough", ...deletedFields(deleted) });
  });
}

/** Seeds a CatalogueItem directly, bypassing rules; soft-deleted when `deleted` is set. */
export async function seedCatalogueItem(
  testEnv: RulesTestEnvironment,
  id: ItemId,
  categoryId: CategoryId,
  { shopId, deleted = false }: { shopId?: ShopId; deleted?: boolean } = {},
): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context
      .firestore()
      .doc(`${CATALOGUE_ITEMS_COLLECTION}/${id}`)
      .set({
        categoryId,
        necessity: "essential",
        ...(shopId === undefined ? {} : { shopId }),
        ...deletedFields(deleted),
      });
  });
}

/**
 * Seeds a Tag and the claim on its name directly, bypassing rules; soft-deleted when `deleted`
 * is set, in which case it holds no claim.
 */
export async function seedTag(
  testEnv: RulesTestEnvironment,
  id: TagId,
  name: string,
  { deleted = false }: { deleted?: boolean } = {},
): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const firestore = context.firestore();
    await firestore.doc(`${TAGS_COLLECTION}/${id}`).set({ name, ...deletedFields(deleted) });
    if (!deleted) {
      await firestore.doc(`${TAG_NAMES_COLLECTION}/${tagNameKey(name)}`).set({ tagId: id });
    }
  });
}
