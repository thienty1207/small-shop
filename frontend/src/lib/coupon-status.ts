export interface CouponStatusInput {
  is_active: boolean;
  used_count: number;
  max_uses: number | null;
  expires_at: string | null;
}

export type CouponStatus = "active" | "inactive" | "expired" | "used_up";

export function getCouponStatus(coupon: CouponStatusInput, now: Date = new Date()): CouponStatus {
  if (coupon.max_uses != null && coupon.used_count >= coupon.max_uses) {
    return "used_up";
  }

  if (coupon.expires_at) {
    const expiresAtMs = new Date(coupon.expires_at).getTime();
    if (!Number.isNaN(expiresAtMs) && expiresAtMs <= now.getTime()) {
      return "expired";
    }
  }

  if (!coupon.is_active) {
    return "inactive";
  }

  return "active";
}
