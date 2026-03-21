import { describe, it, expect } from "vitest";
import { getCouponStatus } from "../../frontend/src/lib/coupon-status";

describe("getCouponStatus", () => {
  const now = new Date("2026-03-21T12:00:00.000Z");

  it("returns used_up when max uses is reached", () => {
    const status = getCouponStatus(
      {
        is_active: true,
        used_count: 1,
        max_uses: 1,
        expires_at: "2026-03-11T00:00:00.000Z",
      },
      now,
    );

    expect(status).toBe("used_up");
  });

  it("returns expired when not used up but expired", () => {
    const status = getCouponStatus(
      {
        is_active: true,
        used_count: 0,
        max_uses: 10,
        expires_at: "2026-03-11T00:00:00.000Z",
      },
      now,
    );

    expect(status).toBe("expired");
  });

  it("returns inactive when not used up and not expired but disabled", () => {
    const status = getCouponStatus(
      {
        is_active: false,
        used_count: 0,
        max_uses: null,
        expires_at: null,
      },
      now,
    );

    expect(status).toBe("inactive");
  });

  it("returns active when valid and enabled", () => {
    const status = getCouponStatus(
      {
        is_active: true,
        used_count: 0,
        max_uses: 5,
        expires_at: "2026-03-31T00:00:00.000Z",
      },
      now,
    );

    expect(status).toBe("active");
  });
});
