"use client";

import styles from "./page.module.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSocketStore, useUserStore } from "@/store";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      useUserStore.getState().setToken(token);
      useSocketStore.getState().connect(token, () => {
        router.push("/main");
      });
    }
  }, [router]);

  return (
    <section className={styles.section}>
      <div className={styles.wrapper}>
        {/* Текстовое лого вместо Image для стиля craftHive */}
        <h1 className={styles.logo_text}>
          craft<span>Hive</span>
        </h1>

        <div className={styles.buttons}>
          <Link href="/registration" className={`${styles.button} ${styles.button_primary}`}>
            Регистрация
          </Link>
          <Link href="/authorization" className={`${styles.button} ${styles.button_secondary}`}>
            Авторизация
          </Link>
        </div>
      </div>
    </section>
  );
}
