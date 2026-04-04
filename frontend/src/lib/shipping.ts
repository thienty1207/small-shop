const DEFAULT_SHIPPING_FEE = 30_000;
const DEFAULT_FREE_SHIPPING_FROM = 500_000;

function parseNonNegativeInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < 0) return fallback;
  return parsed;
}

export function getShippingConfig(settings: Record<string, string>) {
  return {
    shippingFeeDefault: parseNonNegativeInt(settings.shipping_fee_default, DEFAULT_SHIPPING_FEE),
    freeShippingFrom: parseNonNegativeInt(settings.free_shipping_from, DEFAULT_FREE_SHIPPING_FROM),
  };
}

export function calculateShippingFee(totalAmount: number, settings: Record<string, string>): number {
  const { shippingFeeDefault, freeShippingFrom } = getShippingConfig(settings);
  if (freeShippingFrom === 0 || totalAmount >= freeShippingFrom) return 0;
  return shippingFeeDefault;
}
