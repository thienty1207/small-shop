import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Account from "../../frontend/src/pages/Account";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUpdateProfile = vi.fn();

let mockUser = {
  id: "uuid-1",
  email: "test@google.com",
  name: "Hồ Thiên Tỷ",
  avatar_url: "https://example.com/avatar.jpg",
  role: "customer",
  phone: null as string | null,
  address: null as string | null,
};

vi.mock("../../frontend/src/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
    updateProfile: mockUpdateProfile,
  }),
}));

vi.mock("../../frontend/src/components/layout/Header", () => ({
  default: () => <div data-testid="mock-header" />,
}));

vi.mock("../../frontend/src/components/layout/Footer", () => ({
  default: () => <div data-testid="mock-footer" />,
}));

function renderAccount(search = "") {
  return render(
    <MemoryRouter initialEntries={[`/account${search}`]}>
      <Account />
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Account page", () => {
  beforeEach(() => {
    mockUser = {
      id: "uuid-1",
      email: "test@google.com",
      name: "Hồ Thiên Tỷ",
      avatar_url: null,
      role: "customer",
      phone: null,
      address: null,
    };
    mockUpdateProfile.mockClear();
  });

  it("renders profile tab by default", () => {
    renderAccount();
    expect(screen.getByText("Thông tin")).toBeInTheDocument();
    expect(screen.getByText("Đơn hàng")).toBeInTheDocument();
  });

  it("pre-fills name from user context (read-only)", () => {
    renderAccount();
    const nameInput = screen.getByDisplayValue("Hồ Thiên Tỷ");
    expect(nameInput).toBeInTheDocument();
    expect(nameInput).toHaveAttribute("readonly");
  });

  it("pre-fills email from user context (read-only)", () => {
    renderAccount();
    const emailInput = screen.getByDisplayValue("test@google.com");
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute("readonly");
  });

  it("phone field is editable and empty when user has no phone", () => {
    renderAccount();
    const phoneInput = screen.getByPlaceholderText(/0901 234 567/i);
    expect(phoneInput).toBeInTheDocument();
    expect(phoneInput).not.toHaveAttribute("readonly");
    expect((phoneInput as HTMLInputElement).value).toBe("");
  });

  it("pre-fills phone and address when user already has them", () => {
    mockUser.phone = "0987654321";
    mockUser.address = "123 Đường ABC";
    renderAccount();
    expect(screen.getByDisplayValue("0987654321")).toBeInTheDocument();
    expect(screen.getByDisplayValue("123 Đường ABC")).toBeInTheDocument();
  });

  it("calls updateProfile with correct data on save", async () => {
    mockUpdateProfile.mockResolvedValueOnce(undefined);
    renderAccount();

    const phoneInput = screen.getByPlaceholderText(/0901 234 567/i);
    await userEvent.type(phoneInput, "0901111222");

    await act(async () => {
      await userEvent.click(screen.getByText("Lưu thay đổi"));
    });

    expect(mockUpdateProfile).toHaveBeenCalledOnce();
    expect(mockUpdateProfile).toHaveBeenCalledWith(
      expect.objectContaining({ phone: "0901111222" }),
    );
  });

  it("shows success message after successful save", async () => {
    mockUpdateProfile.mockResolvedValueOnce(undefined);
    renderAccount();

    await act(async () => {
      await userEvent.click(screen.getByText("Lưu thay đổi"));
    });

    await waitFor(() =>
      expect(screen.getByText("Đã lưu thành công!")).toBeInTheDocument(),
    );
  });

  it("shows error message when save fails", async () => {
    mockUpdateProfile.mockRejectedValueOnce(new Error("Network error"));
    renderAccount();

    await act(async () => {
      await userEvent.click(screen.getByText("Lưu thay đổi"));
    });

    await waitFor(() =>
      expect(
        screen.getByText("Lưu thất bại, thử lại sau."),
      ).toBeInTheDocument(),
    );
  });

  it("opens orders tab when ?tab=orders is in URL", () => {
    renderAccount("?tab=orders");
    // Orders tab content should show mock orders
    expect(screen.getByText("#HMH001")).toBeInTheDocument();
  });

  it("switches to orders tab on click", async () => {
    renderAccount();
    await userEvent.click(screen.getByText("Đơn hàng"));
    await waitFor(() =>
      expect(screen.getByText("#HMH001")).toBeInTheDocument(),
    );
  });
});
