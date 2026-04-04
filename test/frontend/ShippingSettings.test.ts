import { describe, expect, it } from "vitest";
import { calculateShippingFee, getShippingConfig } from "../../frontend/src/lib/shipping";

describe("shipping settings", () => {
  it("uses default values when settings are missing", () => {
    const cfg = getShippingConfig({});
    expect(cfg.shippingFeeDefault).toBe(30000);
    expect(cfg.freeShippingFrom).toBe(500000);
  });

  it("applies free shipping when amount reaches threshold", () => {
    const settings = { shipping_fee_default: "45000", free_shipping_from: "700000" };
    expect(calculateShippingFee(699999, settings)).toBe(45000);
    expect(calculateShippingFee(700000, settings)).toBe(0);
  });

  it("treats free_shipping_from = 0 as always free", () => {
    const settings = { shipping_fee_default: "30000", free_shipping_from: "0" };
    expect(calculateShippingFee(1, settings)).toBe(0);
  });
});
