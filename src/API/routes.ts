import { useGlobalStore, useUserStore } from "@/store";
import { SERVER_TYPE } from "@/store/modules/global";

const DEV_API_URL = "http://localhost:3001/api";
const PROD_API_URL = "https://api.crafthive.ru/api";

type OPTIONS = {
  method: string;
  headers: {
    "Content-Type": string;
    Authorization?: string;
  };
  body?: string;
};

const f = async (method: string, data: string | null, url: string) => {
  const { server } = useGlobalStore.getState();
  const token =
    useUserStore.getState().token ||
    (typeof window !== "undefined"
      ? localStorage.getItem("token") || localStorage.getItem("auth_token")
      : null);

  const options: OPTIONS = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (token) {
    options.headers["Authorization"] = `Bearer ${token}`;
  }

  if (data) {
    options.body = data;
  }

  const API_URL = server === SERVER_TYPE.PROD ? PROD_API_URL : DEV_API_URL;

  const response = await fetch(API_URL + url, options);

  if (response.status === 401) {
    useUserStore.getState().logout();
  }

  const resData = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(resData?.message || `Ошибка сервера: ${response.status}`);
  }

  return resData;
};

// --- Обычная регистрация и логин ---

export async function registration(data: string) {
  return await f("POST", data, "/user/registration");
}

export async function authorization(data: string) {
  return await f("POST", data, "/auth/user");
}

// --- Авторизация через Яндекс ---

export function loginWithYandex() {
  const { server } = useGlobalStore.getState();
  const API_URL = server === SERVER_TYPE.PROD ? PROD_API_URL : DEV_API_URL;
  window.location.href = API_URL + "/auth/yandex";
}

// --- Профиль пользователя ---

export async function getMe() {
  return await f("GET", null, "/user/me");
}

export async function updateProfile(data: { username?: string; email?: string; name?: string; surname?: string }) {
  return await f("PATCH", JSON.stringify(data), "/user/profile");
}
