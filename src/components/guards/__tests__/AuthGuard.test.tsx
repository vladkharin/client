import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthGuard } from "../AuthGuard";
import { useUserStore } from "@/store";

// Mock next/navigation
const mockReplace = vi.fn();
let currentPathname = "/main";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
  }),
  usePathname: () => currentPathname,
}));

vi.mock("@/store", async () => {
  const actual = await vi.importActual<typeof import("@/store")>("@/store");
  return {
    ...actual,
    useSocketStore: {
      getState: () => ({
        isConnected: false,
        socket: null,
        connect: vi.fn(),
      }),
    },
  };
});

describe("AuthGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render children when authenticated on protected route", () => {
    currentPathname = "/main";
    useUserStore.setState({
      token: "valid_jwt_token",
      isHydrated: true,
    });

    render(
      <AuthGuard>
        <div data-testid="protected-content">Secret Chat Content</div>
      </AuthGuard>,
    );

    expect(screen.getByTestId("protected-content")).toBeInTheDocument();
  });

  it("should redirect to / when unauthenticated on protected route", () => {
    currentPathname = "/main";
    useUserStore.setState({
      token: "",
      isHydrated: true,
    });

    render(
      <AuthGuard>
        <div data-testid="protected-content">Secret Chat Content</div>
      </AuthGuard>,
    );

    expect(mockReplace).toHaveBeenCalledWith("/");
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
  });

  it("should render children when unauthenticated on public route", () => {
    currentPathname = "/authorization";
    useUserStore.setState({
      token: "",
      isHydrated: true,
    });

    render(
      <AuthGuard>
        <div data-testid="public-content">Login Form</div>
      </AuthGuard>,
    );

    expect(screen.getByTestId("public-content")).toBeInTheDocument();
  });
});
