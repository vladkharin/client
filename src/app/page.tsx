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

  const handleYandexLogin = () => {
    const DEV_API_URL = "http://localhost:3001/api";
    const PROD_API_URL = "https://api.crafthive.ru/api";
    const API_URL = server === SERVER_TYPE.PROD ? PROD_API_URL : DEV_API_URL;
    window.location.href = `${API_URL}/auth/yandex`;
  };

  return (
    <main className={styles.section}>
      <div className={styles.glow_bg} />
      <div className={styles.wrapper}>
        <div className={styles.brand_badge}>⚡ Мессенджер нового поколения</div>
        <h1 className={styles.logo_text}>
          craft<span>Hive</span>
        </h1>
        <p className={styles.description}>
          Быстрый, приватный и удобный мессенджер с поддержкой групповых чатов, голосовых и видеозвонков.
        </p>

        <div className={styles.buttons}>
          <Link href="/registration" className={`${styles.button} ${styles.button_primary}`}>
            Регистрация
          </Link>
          <Link href="/authorization" className={`${styles.button} ${styles.button_secondary}`}>
            Авторизация
          </Link>
        </div>

        <div className={styles.social_divider}>
          <span>или войти через</span>
        </div>

        <button className={styles.yandex_btn} onClick={handleYandexLogin} type="button">
          Войти с Яндекс ID
        </button>
      </div>
    </main>
  );
}
