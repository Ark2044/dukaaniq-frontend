import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema, passwordSchema } from "./auth";
import { merchantProfileSchema, merchantToFormValues, toMerchantProfileInput } from "./merchant";
import { emptyProductForm, productSchema, toProductCreateInput, toProductUpdateInput } from "./product";
import { merchant } from "@/test/utils";

describe("passwordSchema", () => {
  it.each([
    ["short1", false],
    ["allletters", false],
    ["12345678", false],
    ["Passw0rd!x", true],
    ["a1".repeat(36), true],
    ["a1".repeat(36) + "x", false],
  ])("%s -> %s", (value, valid) => {
    expect(passwordSchema.safeParse(value).success).toBe(valid);
  });
});

describe("registerSchema / loginSchema", () => {
  const valid = {
    ownerName: "Asha",
    email: "asha@example.com",
    password: "Passw0rd!x",
    phone: "",
    shopName: "Shree",
    businessCategory: "KIRANA",
    preferredLanguage: "EN",
    city: "",
  };

  it("accepts a minimal valid registration (optional phone/city blank)", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it.each(["5876543210", "98765", "98765432101", "98765 43210"])("rejects phone %s", (phone) => {
    expect(registerSchema.safeParse({ ...valid, phone }).success).toBe(false);
  });

  it("rejects a city over 80 characters and a bad email", () => {
    expect(registerSchema.safeParse({ ...valid, city: "x".repeat(81) }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "nope", password: "x" }).success).toBe(false);
  });
});

describe("merchantProfileSchema", () => {
  const values = merchantToFormValues(merchant());

  it("accepts the current profile and round-trips to the API shape", () => {
    expect(merchantProfileSchema.safeParse(values).success).toBe(true);
    expect(toMerchantProfileInput(values)).toMatchObject({ shopName: "Shree General Store", city: "Pune", state: null, latitude: null });
  });

  it("validates pincode and coordinates", () => {
    expect(merchantProfileSchema.safeParse({ ...values, pincode: "012345" }).success).toBe(false);
    expect(merchantProfileSchema.safeParse({ ...values, pincode: "411001" }).success).toBe(true);
    expect(merchantProfileSchema.safeParse({ ...values, latitude: "91" }).success).toBe(false);
    expect(merchantProfileSchema.safeParse({ ...values, longitude: "-180.5" }).success).toBe(false);
    expect(toMerchantProfileInput({ ...values, latitude: "18.52", longitude: "73.85" })).toMatchObject({ latitude: 18.52, longitude: 73.85 });
  });
});

describe("productSchema and payload mapping", () => {
  const valid = { ...emptyProductForm, name: "Tata Salt", sellingPrice: "28", stockQuantity: "12.5" };

  it("enforces name length, aliases and numeric bounds", () => {
    expect(productSchema.safeParse(valid).success).toBe(true);
    expect(productSchema.safeParse({ ...valid, name: "x".repeat(151) }).success).toBe(false);
    expect(productSchema.safeParse({ ...valid, aliases: Array.from({ length: 21 }, (_, i) => `a${i}`) }).success).toBe(false);
    expect(productSchema.safeParse({ ...valid, aliases: ["x".repeat(61)] }).success).toBe(false);
    expect(productSchema.safeParse({ ...valid, stockQuantity: "1.2345" }).success).toBe(false);
    expect(productSchema.safeParse({ ...valid, sku: "x".repeat(41) }).success).toBe(false);
    expect(productSchema.safeParse({ ...valid, barcode: "x".repeat(33) }).success).toBe(false);
  });

  it("maps blanks to null/defaults on create and omits stockQuantity on update", () => {
    expect(toProductCreateInput(valid)).toEqual({
      name: "Tata Salt",
      brand: null,
      category: null,
      sku: null,
      barcode: null,
      unit: "PIECE",
      packSize: null,
      sellingPrice: 28,
      costPrice: null,
      stockQuantity: 12.5,
      reorderLevel: 0,
      aliases: [],
    });
    const update = toProductUpdateInput(valid);
    expect(update).not.toHaveProperty("stockQuantity");
    expect(update.active).toBe(true);
  });
});
