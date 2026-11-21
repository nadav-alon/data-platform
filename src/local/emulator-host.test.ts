import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emulatorHost,
  isEmulatorHost,
  splitEmulatorHost,
} from "./emulator-host.ts";

test("isEmulatorHost accepts host:port and bracketed IPv6", () => {
  assert.equal(isEmulatorHost("127.0.0.1:8090"), true);
  assert.equal(isEmulatorHost("localhost:9199"), true);
  assert.equal(isEmulatorHost("[::1]:8090"), true);
});

test("isEmulatorHost rejects a missing host, a missing or out-of-range port", () => {
  for (const bad of [
    "",
    "localhost",
    "localhost:",
    ":8090",
    "localhost:0",
    "localhost:70000",
    "a:b",
    "::1:8090",
  ]) {
    assert.equal(isEmulatorHost(bad), false, bad);
  }
});

test("emulatorHost throws naming the value", () => {
  assert.throws(
    () => emulatorHost("localhost"),
    /Not an EmulatorHost: "localhost"/,
  );
});

test("splitEmulatorHost returns the host and numeric port", () => {
  assert.deepEqual(splitEmulatorHost(emulatorHost("127.0.0.1:8090")), {
    host: "127.0.0.1",
    port: 8090,
  });
  assert.deepEqual(splitEmulatorHost(emulatorHost("[::1]:9099")), {
    host: "[::1]",
    port: 9099,
  });
});
