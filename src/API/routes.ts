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

// --- Подтверждение и смена Email ---

export async function verifyEmail(email: string, code: string) {
  return await f("POST", JSON.stringify({ email, code }), "/user/verify-email");
}

export async function resendVerification(email?: string) {
  return await f("POST", JSON.stringify({ email }), "/user/resend-verification");
}

export async function verifyEmailMe(code: string) {
  return await f("POST", JSON.stringify({ code }), "/user/verify-email-me");
}

export async function resendVerificationMe() {
  return await f("POST", null, "/user/resend-verification-me");
}

export async function requestEmailChange(newEmail: string) {
  return await f("POST", JSON.stringify({ newEmail }), "/user/request-email-change");
}

export async function verifyEmailChange(code: string) {
  return await f("POST", JSON.stringify({ code }), "/user/verify-email-change");
}

// --- Push-уведомления ---

export async function registerPushToken(token: string, platform: string = "web") {
  return await f("POST", JSON.stringify({ token, platform }), "/push/register");
}

export async function unregisterPushToken(token: string) {
  return await f("DELETE", JSON.stringify({ token }), "/push/unregister");
}

// --- Загрузка файлов и изображений (Cloudinary) ---

export interface UploadResult {
  success: boolean;
  url: string;
  publicId?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  width?: number;
  height?: number;
}

export async function uploadFile(file: File | Blob, fileName?: string): Promise<UploadResult> {
  const { server } = useGlobalStore.getState();
  const token =
    useUserStore.getState().token ||
    (typeof window !== "undefined"
      ? localStorage.getItem("token") || localStorage.getItem("auth_token")
      : null);

  const API_URL = server === SERVER_TYPE.PROD ? PROD_API_URL : DEV_API_URL;
  const formData = new FormData();
  formData.append("file", file, fileName || (file instanceof File ? file.name : "upload.bin"));

  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}/upload/file`, {
    method: "POST",
    headers,
    body: formData,
  });

  const resData = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(resData?.message || `Ошибка загрузки: ${response.status}`);
  }

  return resData;
}

export async function uploadImage(file: File): Promise<UploadResult> {
  return uploadFile(file);
}
