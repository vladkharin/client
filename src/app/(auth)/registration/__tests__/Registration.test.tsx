import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RegistrationPage from "../page";
import * as routes from "@/API/routes";

const mockPush = vi.fn();
const mockConnect = vi.fn((token, cb) => cb && cb());

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
      login: vi.fn(),
    }),
  };
});

describe("Registration Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render registration fields and submit button", () => {
    render(<RegistrationPage />);

    expect(screen.getByRole("heading", { name: "Создать аккаунт" })).toBeInTheDocument();
    expect(screen.getByLabelText("Имя")).toBeInTheDocument();
    expect(screen.getByLabelText("Фамилия")).toBeInTheDocument();
    expect(screen.getByLabelText("Никнейм")).toBeInTheDocument();
    expect(screen.getByLabelText("Электронная почта")).toBeInTheDocument();
    expect(screen.getByLabelText("Пароль")).toBeInTheDocument();
    expect(screen.getByLabelText("Повторите пароль")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Зарегистрироваться" })).toBeInTheDocument();
  });

  it("should validate matching passwords", async () => {
    render(<RegistrationPage />);

    fireEvent.change(screen.getByLabelText("Имя"), { target: { value: "Иван" } });
    fireEvent.change(screen.getByLabelText("Фамилия"), { target: { value: "Иванов" } });
    fireEvent.change(screen.getByLabelText("Никнейм"), { target: { value: "ivanov" } });
    fireEvent.change(screen.getByLabelText("Электронная почта"), { target: { value: "ivan@test.ru" } });
    fireEvent.change(screen.getByLabelText("Пароль"), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText("Повторите пароль"), { target: { value: "different" } });

    fireEvent.click(screen.getByRole("button", { name: "Зарегистрироваться" }));

    await waitFor(() => {
      expect(screen.getByText("Пароли не совпадают")).toBeInTheDocument();
    });
  });

  it("should display backend error message when registration fails (409 Conflict)", async () => {
    vi.spyOn(routes, "registration").mockRejectedValueOnce(
      new Error("Пользователь с таким никнеймом уже существует")
    );

    render(<RegistrationPage />);

    fireEvent.change(screen.getByLabelText("Имя"), { target: { value: "Иван" } });
    fireEvent.change(screen.getByLabelText("Фамилия"), { target: { value: "Иванов" } });
    fireEvent.change(screen.getByLabelText("Никнейм"), { target: { value: "ivanov" } });
    fireEvent.change(screen.getByLabelText("Электронная почта"), { target: { value: "ivan@test.ru" } });
    fireEvent.change(screen.getByLabelText("Пароль"), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText("Повторите пароль"), { target: { value: "password123" } });

    fireEvent.click(screen.getByRole("button", { name: "Зарегистрироваться" }));

    await waitFor(() => {
      expect(screen.getAllByText("Пользователь с таким никнеймом уже существует").length).toBeGreaterThan(0);
    });
  });

  it("should transition to 6-digit verification code step on successful registration", async () => {
    vi.spyOn(routes, "registration").mockResolvedValueOnce({ success: true, message: "OK" });

    render(<RegistrationPage />);

    fireEvent.change(screen.getByLabelText("Имя"), { target: { value: "Иван" } });
    fireEvent.change(screen.getByLabelText("Фамилия"), { target: { value: "Иванов" } });
    fireEvent.change(screen.getByLabelText("Никнейм"), { target: { value: "ivanov" } });
    fireEvent.change(screen.getByLabelText("Электронная почта"), { target: { value: "ivan@test.ru" } });
    fireEvent.change(screen.getByLabelText("Пароль"), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText("Повторите пароль"), { target: { value: "password123" } });

    fireEvent.click(screen.getByRole("button", { name: "Зарегистрироваться" }));

    await waitFor(() => {
      expect(screen.getByText("Подтверждение Email")).toBeInTheDocument();
      expect(screen.getByText("ivan@test.ru")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Подтвердить и войти" })).toBeInTheDocument();
    });
  });
});
