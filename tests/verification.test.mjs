import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { isValidStandardWebhook } from "../lib/sms/standardWebhook.ts";
import {
  isValidIdCode,
  isValidRegistryExtract,
  isValidTbcIban,
  normalizeGeorgianMobile,
} from "../lib/verification.ts";

// Builds an IBAN with a correct checksum, so the tests don't depend on a real account.
function tbcIban(digits = "0000000123456789") {
  // Bank code and account first, then the country code; letters become numbers.
  const numeric = `2911${digits}161400`;
  const check = 98n - BigInt(numeric) % 97n;
  return `GE${String(check).padStart(2, "0")}TB${digits}`;
}

test("accepts a correct TBC IBAN, also with spaces and lower case", () => {
  const iban = tbcIban();
  assert.equal(iban.length, 22);
  assert.equal(isValidTbcIban(iban), true);
  assert.equal(isValidTbcIban(iban.toLowerCase().replace(/(.{4})/g, "$1 ")), true);
});

test("rejects a wrong checksum, length or bank", () => {
  const iban = tbcIban();
  const lastDigit = iban.at(-1) === "1" ? "2" : "1";
  assert.equal(isValidTbcIban(iban.slice(0, -1) + lastDigit), false);
  assert.equal(isValidTbcIban(iban + "0"), false);
  assert.equal(isValidTbcIban(iban.slice(0, -1)), false);
  assert.equal(isValidTbcIban(iban.replace("TB", "BG")), false);
  assert.equal(isValidTbcIban(""), false);
});

test("identification code has 9 or 11 digits", () => {
  assert.equal(isValidIdCode("123456789"), true);
  assert.equal(isValidIdCode("12345678901"), true);
  assert.equal(isValidIdCode("1234567890"), false);
  assert.equal(isValidIdCode("12345678a"), false);
});

test("normalizes Georgian mobile numbers and refuses others", () => {
  assert.equal(normalizeGeorgianMobile("555 12 34 56"), "+995555123456");
  assert.equal(normalizeGeorgianMobile("+995 555-123-456"), "+995555123456");
  assert.equal(normalizeGeorgianMobile("995555123456"), "+995555123456");
  assert.equal(normalizeGeorgianMobile("322123456"), null);
  assert.equal(normalizeGeorgianMobile("+49 151 1234567"), null);
});

test("registry extract must be a PDF or JPG up to 10 MB", () => {
  assert.equal(isValidRegistryExtract({ type: "application/pdf", size: 1000 }), true);
  assert.equal(isValidRegistryExtract({ type: "image/jpeg", size: 1000 }), true);
  assert.equal(isValidRegistryExtract({ type: "image/png", size: 1000 }), false);
  assert.equal(isValidRegistryExtract({ type: "application/pdf", size: 0 }), false);
  assert.equal(isValidRegistryExtract({ type: "application/pdf", size: 11 * 1024 * 1024 }), false);
});

test("hook signature: accepts a correct one, refuses tampering and old requests", () => {
  const raw = Buffer.from("test-secret");
  const secret = `v1,whsec_${raw.toString("base64")}`;
  const nowSeconds = 1800000000;
  const timestamp = String(nowSeconds);
  const body = '{"sms":{"otp":"123456"}}';
  const signature = createHmac("sha256", raw).update(`id1.${timestamp}.${body}`).digest("base64");
  const input = { secret, id: "id1", timestamp, signatureHeader: `v1,${signature}`, body, nowSeconds };

  assert.equal(isValidStandardWebhook(input), true);
  assert.equal(isValidStandardWebhook({ ...input, body: body + " " }), false);
  assert.equal(isValidStandardWebhook({ ...input, nowSeconds: nowSeconds + 3600 }), false);
  assert.equal(isValidStandardWebhook({ ...input, signatureHeader: null }), false);
});
