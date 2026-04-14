"use client";

import { FORM_AUTHORIZATION, RESPONSE_AUTHORIZATION } from "@/types/types";
import styles from "./page.module.css";
import { ChangeEvent, FormEvent, useState } from "react";
import { authorization } from "@/API/routes";
import { useSocketStore, useUserStore } from "@/store";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Page() {
  const router = useRouter();
  const { login } = useUserStore();
  const [formState, setFormState] = useState<FORM_AUTHORIZATION>({
    username: "",
    password: "",
  });

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState({
      ...formState,
      [name]: value,
    });
  };

  async function postData(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const response: RESPONSE_AUTHORIZATION = await authorization(JSON.stringify(formState));

      login(response.access_token, response.id);

      // Подключаемся к WebSocket
      useSocketStore.getState().connect(response.access_token, () => {
        router.push("/main");
      });
    } catch (error) {
      console.error("Auth error:", error);
      // Тут можно добавить алерт об ошибке
    }
  }

  return (
    <section className={styles.section}>
      <Link href="/" className={styles.logo_link}>
        <h1 className={styles.logo_title}>
          craft<span>Hive</span>
        </h1>
      </Link>

      <form className={styles.form} onSubmit={postData}>
        <div className={styles.input_area}>
          <p className={styles.label}>Никнейм</p>
          <input className={styles.input} type="text" name="username" placeholder="Ваш логин" onChange={handleChange} required />
        </div>

        <div className={styles.input_area}>
          <p className={styles.label}>Пароль</p>
          <input
            className={styles.input}
            type="password" // Поменял на password для безопасности
            name="password"
            placeholder="••••••••"
            onChange={handleChange}
            required
          />
        </div>

        <button className={styles.submit_btn} type="submit">
          Войти в систему
        </button>
      </form>
    </section>
  );
}
