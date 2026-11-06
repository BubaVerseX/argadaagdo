import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canPickAvatar,
  checkName,
  cleanName,
  formatGeorgianPhone,
  formatTbilisiDate,
  isNameLocked,
  nameInitials,
  nextNameChangeAt,
} from "../lib/profileFields.ts";
import {
  clampCrop,
  cropSourceRect,
  initialCrop,
  zoomCrop,
} from "../lib/avatarCrop.ts";

test("names: letters with single separators, max 30", () => {
  for (const name of ["ნინო", "Nino Beridze", "Jean-Luc", "O'Brien", "O’Brien", "Élodie", "Анна Петрова", "ნინო ბერიძე"]) {
    assert.equal(checkName(name), "ok", name);
  }
  assert.equal(checkName("  Nino   Beridze "), "ok");
  assert.equal(cleanName("  Nino   Beridze "), "Nino Beridze");
  assert.equal(checkName(""), "empty");
  assert.equal(checkName("   "), "empty");
  assert.equal(checkName("a".repeat(30)), "ok");
  assert.equal(checkName("a".repeat(31)), "too_long");
  for (const name of ["Nino1", "nino@x.ge", "https://x.ge", "Nino 😀", "Nino--B", "-Nino", "Nino.", "x.ge"]) {
    assert.equal(checkName(name), "invalid", name);
  }
});

test("name lock: 30 days after the last change", () => {
  assert.equal(nextNameChangeAt(null), null);
  const next = nextNameChangeAt("2026-11-07T10:00:00Z");
  assert.equal(next.toISOString(), "2026-12-07T10:00:00.000Z");
  assert.equal(isNameLocked(next, new Date("2026-11-20T00:00:00Z")), true);
  assert.equal(isNameLocked(next, new Date("2026-12-07T10:00:01Z")), false);
  assert.equal(isNameLocked(null), false);
});

test("dates are dd.mm.yyyy in Tbilisi time", () => {
  assert.equal(formatTbilisiDate(new Date("2026-12-07T10:00:00Z")), "07.12.2026");
  // 21:30 UTC is already the next day in Tbilisi (UTC+4).
  assert.equal(formatTbilisiDate(new Date("2026-12-06T21:30:00Z")), "07.12.2026");
});

test("verified phone is shown as +995 5XX XX XX XX", () => {
  assert.equal(formatGeorgianPhone("995555123456"), "+995 555 12 34 56");
  assert.equal(formatGeorgianPhone("+995 555 123 456"), "+995 555 12 34 56");
  assert.equal(formatGeorgianPhone(""), "");
  assert.equal(formatGeorgianPhone(null), "");
});

test("photo picker: website and Android always, iOS from build 7", () => {
  assert.equal(canPickAvatar(null), true);
  assert.equal(canPickAvatar({ platform: "android", build: "3" }), true);
  assert.equal(canPickAvatar({ platform: "ios", build: "6" }), false);
  assert.equal(canPickAvatar({ platform: "ios", build: "1" }), false);
  assert.equal(canPickAvatar({ platform: "ios", build: null }), false);
  assert.equal(canPickAvatar({ platform: "ios", build: "7" }), true);
  assert.equal(canPickAvatar({ platform: "ios", build: 12 }), true);
});

test("initials", () => {
  assert.equal(nameInitials("Nino Beridze"), "NB");
  assert.equal(nameInitials("ნინო"), "ნ");
  assert.equal(nameInitials(""), "A");
});

test("crop keeps the photo covering the circle", () => {
  const image = { width: 2000, height: 1000 };
  const view = 300;
  const start = initialCrop(image, view);
  assert.deepEqual(cropSourceRect(start, image, view), { sx: 500, sy: 0, size: 1000 });

  const pushed = clampCrop({ ...start, x: 100, y: 100 }, image, view);
  assert.equal(pushed.x, 0);
  assert.equal(pushed.y, 0);
  const far = clampCrop({ ...start, x: -10000 }, image, view);
  assert.deepEqual(cropSourceRect(far, image, view), { sx: 1000, sy: 0, size: 1000 });

  const zoomed = zoomCrop(start, image, view, 2);
  const rect = cropSourceRect(zoomed, image, view);
  assert.equal(rect.size, 500);
  assert.equal(rect.sx, 750); // still centred
  assert.equal(rect.sy, 250);
  assert.equal(zoomCrop(start, image, view, 99).zoom, 4);
  assert.equal(zoomCrop(start, image, view, 0.1).zoom, 1);
});
