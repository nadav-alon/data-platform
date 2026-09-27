import { test } from "node:test";
import assert from "node:assert/strict";
import { isBarcode, barcode } from "./barcode.ts";

test("accepts an 8-digit EAN-8", () => {
  assert.equal(isBarcode("12345670"), true);
  assert.equal(barcode("12345670"), "12345670");
});

test("accepts a 12-digit UPC-A", () => {
  assert.equal(isBarcode("012345678905"), true);
});

test("accepts a 13-digit EAN-13", () => {
  assert.equal(isBarcode("0123456789012"), true);
});

test("accepts a 14-digit GTIN-14", () => {
  assert.equal(isBarcode("01234567890128"), true);
});

test("rejects a length between the accepted lengths", () => {
  assert.equal(isBarcode("123456789"), false);
});

test("rejects a length on the other side of the gap between accepted lengths", () => {
  assert.equal(isBarcode("12345678901"), false);
});

test("rejects a length below the minimum", () => {
  assert.equal(isBarcode("1234567"), false);
});

test("rejects a length above the maximum", () => {
  assert.equal(isBarcode("123456789012345"), false);
});

test("rejects leading or trailing whitespace", () => {
  assert.equal(isBarcode(" 12345670"), false);
  assert.equal(isBarcode("12345670 "), false);
});

test("rejects a non-digit character", () => {
  assert.equal(isBarcode("01234567890a"), false);
});

test("rejects free text", () => {
  assert.equal(isBarcode("dish soap"), false);
  assert.throws(() => barcode("dish soap"), /Not a Barcode/);
});

test("rejects an empty string", () => {
  assert.equal(isBarcode(""), false);
});
