"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUserStore, useSocketStore } from "@/store";

export default function AuthSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // 1. Извлекаем токен из URL (?token=...)
    const token = searchParams.get("token");

    if (token) {
      // 3. Обновляем Zustand store
      useUserStore.getState().setToken(token);

      // 4. Подключаем сокеты (если нужно сразу)
      useSocketStore.getState().connect(token, () => {
        // 5. Переходим на главную страницу приложения
        router.push("/main");
      });
    } else {
      // Если токена нет — возвращаем на страницу входа
      router.push("/");
    }
  }, [searchParams, router]);

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#111",
        color: "#fff",
        fontFamily: "sans-serif",
      }}
    >
      <p>Авторизация успешна! Входим в систему...</p>
    </div>
  );
}
