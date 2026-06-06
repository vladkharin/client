import { useGlobalStore } from "@/store";
import { SERVER_TYPE } from "@/store/modules/global";

const DEV_API_URL = "http://localhost:3001/api";
const PROD_API_URL = "https://api.crafthive.ru/api";

type OPTIONS = {
  method: string;
  headers: {
    "Content-Type": string;
    Authorization?: string; // 👈 Добавляем опциональный заголовок
  };
  body?: string;
};

const f = async (method: string, data: string | null, url: string) => {
  const { server } = useGlobalStore.getState();

  // 1. Извлекаем токен из localStorage
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const options: OPTIONS = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  // 2. Если токен есть, добавляем его в заголовки
  if (token) {
    options.headers["Authorization"] = `Bearer ${token}`;
  }

  if (data) {
    options.body = data;
  }

  const API_URL = server == SERVER_TYPE.PROD ? PROD_API_URL : DEV_API_URL;

  const response = await fetch(API_URL + url, options);

  // 3. Обработка 401 (неавторизован) — если токен просрочен, можно разлогинить юзера
  if (response.status === 401) {
    localStorage.removeItem("token");
    // Здесь можно вызвать метод из store для сброса состояния
  }

  try {
    return await response.json();
  } catch (error) {
    console.log("Fetch error:", error);
  }
};

// --- Обычная регистрация и логин ---

export async function registration(data: string) {
  return await f("POST", data, "/user/registration");
}

export async function authorization(data: string) {
  return await f("POST", data, "/auth/user");
}

// --- Новое: Авторизация через Яндекс ---

export function loginWithYandex() {
  const { server } = useGlobalStore.getState();
  const API_URL = server == SERVER_TYPE.PROD ? PROD_API_URL : DEV_API_URL;

  // Здесь мы не делаем fetch, а просто перенаправляем браузер
  window.location.href = API_URL + "/auth/yandex";
}

// --- Новое: Получение профиля (себя) ---

export async function getMe() {
  // Передаем null в data, так как это GET запрос
  return await f("GET", null, "/auth/profile");
}
