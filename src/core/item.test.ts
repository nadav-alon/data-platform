import { test } from "node:test";
import assert from "node:assert/strict";
import { ITEMS_COLLECTION, itemSchema } from "./item.ts";

test("accepts an Item with only the required fields", () => {
  const item = itemSchema.parse({ name: "Dish soap", state: "enough" });
  assert.equal(item.name, "Dish soap");
  assert.equal(item.state, "enough");
});

test("accepts an Item with its optional fields set", () => {
  const item = itemSchema.parse({
    name: "Dish soap",
    brandNote: "the green one",
    barcodes: ["012345678905", "099887766554"],
    state: "running low",
  });
  assert.equal(item.brandNote, "the green one");
  assert.deepEqual(item.barcodes, ["012345678905", "099887766554"]);
});

test("tolerates an unknown field", () => {
  const item = itemSchema.parse({ name: "Dish soap", state: "enough", unexpected: true });
  assert.equal(item.unexpected, true);
});

test("rejects an empty name", () => {
  assert.throws(() => itemSchema.parse({ name: "", state: "enough" }));
});

test("rejects a missing name", () => {
  assert.throws(() => itemSchema.parse({ state: "enough" }));
});

test("rejects a non-string name", () => {
  assert.throws(() => itemSchema.parse({ name: 123, state: "enough" }));
});

test("rejects a non-string brandNote", () => {
  assert.throws(() => itemSchema.parse({ name: "Dish soap", state: "enough", brandNote: 123 }));
});

test("rejects barcodes that isn't an array", () => {
  assert.throws(() =>
    itemSchema.parse({ name: "Dish soap", state: "enough", barcodes: "012345678905" }),
  );
});

test("rejects a barcode that isn't a string", () => {
  assert.throws(() => itemSchema.parse({ name: "Dish soap", state: "enough", barcodes: [12345] }));
});

test("rejects an empty barcode", () => {
  assert.throws(() => itemSchema.parse({ name: "Dish soap", state: "enough", barcodes: [""] }));
});

test("rejects a missing state", () => {
  assert.throws(() => itemSchema.parse({ name: "Dish soap" }));
});

test("rejects a state outside the State enum", () => {
  assert.throws(() => itemSchema.parse({ name: "Dish soap", state: "almost gone" }));
});

test("ITEMS_COLLECTION is stable", () => {
  assert.equal(ITEMS_COLLECTION, "items");
});
