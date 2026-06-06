"use client";

import styles from "./page.module.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSocketStore, useUserStore, useGlobalStore } from "@/store";
import { SERVER_TYPE } from "@/store/modules/global";

export default function Home() {
  const router = useRouter();
  const { server } = useGlobalStore();

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      useUserStore.getState().setToken(token);
      useSocketStore.getState().connect(token, () => {
        router.push("/main");
      });
    }
  }, [router]);

  // Функция для «ручного» входа через Яндекс
  const handleYandexLogin = () => {
    const DEV_API_URL = "http://localhost:3001/api";
    const PROD_API_URL = "https://api.crafthive.ru/api";
    const API_URL = server === SERVER_TYPE.PROD ? PROD_API_URL : DEV_API_URL;

    // Просто перенаправляем на бэкенд
    window.location.href = `${API_URL}/auth/yandex`;
  };

  return (
    <section className={styles.section}>
      <div className={styles.wrapper}>
        <h1 className={styles.logo_text}>
          craft<span>Hive</span>
        </h1>

        <div className={styles.buttons}>
          {/* <Link href="/registration" className={`${styles.button} ${styles.button_primary}`}> */}
          {/* Регистрация
          </Link>
          <Link href="/authorization" className={`${styles.button} ${styles.button_secondary}`}>
            Авторизация
          </Link> */}

          {/* --- НАША КНОПКА (КОПИЯ XXL ВЕРСИИ ЯНДЕКСА) --- */}
          <button onClick={handleYandexLogin} className={styles.yandex_icon_only}></button>
        </div>
      </div>
    </section>
  );
}
