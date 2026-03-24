// components/guards/AuthGuard.tsx
"use client";

import { useShallow } from "zustand/react/shallow";
import { useSocketStore, useUserStore } from "@/store";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

// 👇 Публичные маршруты
const PUBLIC_ROUTES = ["/", "/authorization", "/registration"];

function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.includes(path) || path.startsWith("/auth");
}

// 👇 МОДУЛЬНЫЙ ФЛАГ — один на всё приложение
let hasEverConnected = false;

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const { token, isHydrated } = useUserStore(
    useShallow((state) => ({
      token: state.token,
      isHydrated: state.isHydrated,
    })),
  );

  // 👇 НЕ подписываемся на isConnected в хуке! Проверяем внутри эффекта через getState()

  useEffect(() => {
    // 🔹 1. Ждём гидратацию
    if (!isHydrated) return;

    // 🔹 2. Публичные маршруты — только редирект если есть токен
    if (isPublicRoute(pathname)) {
      if (token) {
        router.replace("/main");
      }
      return;
    }

    // 🔹 3. Защищённый маршрут без токена — редирект на вход
    if (!token) {
      router.replace("/authorization");
      return;
    }

    // 🔹 4. 👇 ГЛАВНАЯ ПРОВЕРКА: подключаем сокет ТОЛЬКО ОДИН РАЗ
    if (hasEverConnected) return;

    // 👇 Получаем актуальное состояние сокета ПРЯМО СЕЙЧАС
    const socketState = useSocketStore.getState();

    // Если уже подключен — не делаем ничего, но ставим флаг
    if (socketState.isConnected || socketState.socket?.connected) {
      hasEverConnected = true;
      return;
    }

    // 👇 Коллбэк после успешной авторизации
    const onReady = () => {
      console.log("✅ Socket connected & auth ready");
      if (isPublicRoute(pathname)) {
        router.replace("/main");
      }
    };

    // 👇 Подключаемся
    socketState.connect(token, onReady);

    // 👇 СТАВИМ ФЛАГ СРАЗУ (синхронно, до любого асинка)
    hasEverConnected = true;
  }, [token, isHydrated, router, pathname]);
  // 👆 УБРАЛИ isConnected из зависимостей! Он больше не триггерит эффект

  // 👇 UI
  if (!isHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!token && !isPublicRoute(pathname)) {
    return null;
  }

  return <>{children}</>;
}
