import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AuthorizationPage from "../page";
import * as routes from "@/API/routes";

const mockPush = vi.fn();
const mockConnect = vi.fn((token, cb) => cb && cb());
const mockLogin = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

vi.mock("@/store", async () => {
  const actual = await vi.importActual<typeof import("@/store")>("@/store");
  return {
    ...actual,
    useSocketStore: {
      getState: () => ({
        connect: mockConnect,
      }),
    },
    useUserStore: () => ({
      login: mockLogin,
    }),
  };
});

describe("Authorization Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render username, password inputs and login button", () => {
    render(<AuthorizationPage />);

    expect(screen.getByRole("heading", { name: "С возвращением!" })).toBeInTheDocument();
    expect(screen.getByLabelText("Логин или никнейм")).toBeInTheDocument();
    expect(screen.getByLabelText("Пароль")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Войти в систему" })).toBeInTheDocument();
  });

  it("should display error banner on invalid credentials", async () => {
    vi.spyOn(routes, "authorization").mockRejectedValueOnce(
      new Error("Неверный логин или пароль")
    );

    render(<AuthorizationPage />);

    fireEvent.change(screen.getByLabelText("Логин или никнейм"), { target: { value: "wronguser" } });
    fireEvent.change(screen.getByLabelText("Пароль"), { target: { value: "wrongpass" } });

    fireEvent.click(screen.getByRole("button", { name: "Войти в систему" }));

    await waitFor(() => {
      expect(screen.getByText("Неверный логин или пароль")).toBeInTheDocument();
    });
  });

  it("should login and navigate to /main on success", async () => {
    vi.spyOn(routes, "authorization").mockResolvedValueOnce({
      id: 1,
      access_token: "mock_token_123",
    });

    render(<AuthorizationPage />);

    fireEvent.change(screen.getByLabelText("Логин или никнейм"), { target: { value: "correctuser" } });
    fireEvent.change(screen.getByLabelText("Пароль"), { target: { value: "correctpass" } });

    fireEvent.click(screen.getByRole("button", { name: "Войти в систему" }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("mock_token_123", 1, "correctuser");
      expect(mockConnect).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/main");
    });
  });
});
