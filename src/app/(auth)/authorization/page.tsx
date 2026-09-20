"use client";

import { FORM_AUTHORIZATION, RESPONSE_AUTHORIZATION } from "@/types/types";
import styles from "./page.module.css";
import { ChangeEvent, FormEvent, useState } from "react";
import { authorization } from "@/API/routes";
import { useSocketStore, useUserStore } from "@/store";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AuthorizationPage() {
  const router = useRouter();
  const { login } = useUserStore();
  const [formState, setFormState] = useState<FORM_AUTHORIZATION>({
    username: "",
    password: "",
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errorMessage) {
      setErrorMessage(null);
    }
  };

  async function postData(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const response: RESPONSE_AUTHORIZATION = await authorization(JSON.stringify(formState));

      login(response.access_token, response.id, formState.username);

      // Подключаемся к WebSocket
      useSocketStore.getState().connect(response.access_token, () => {
        router.push("/main");
      });
    } catch (error: any) {
      console.error("Auth error:", error);
      setErrorMessage(error?.message || "Неверный логин или пароль");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className={styles.section}>
      <Link href="/" className={styles.logo_link}>
        <div className={styles.logo_container}>
          <div className={styles.logo_icon}>✨</div>
          <h1 className={styles.logo_title}>
            craft<span>Hive</span>
          </h1>
        </div>
      </Link>

      <div className={styles.wrapper}>
        <div className={styles.header}>
          <h2 className={styles.title}>С возвращением!</h2>
          <p className={styles.subtitle}>Войдите в свой аккаунт CraftHive</p>
        </div>

        {errorMessage && (
          <div className={styles.error_banner}>
            <span className={styles.error_banner_icon}>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        <form className={styles.form} onSubmit={postData} noValidate>
          <div className={styles.input_area}>
            <label htmlFor="auth-username" className={styles.label}>
              Логин или никнейм
            </label>
            <div className={styles.input_prefix_wrapper}>
              <span className={styles.input_prefix}>@</span>
              <input
                id="auth-username"
                className={`${styles.input} ${styles.input_with_prefix}`}
                type="text"
                name="username"
                autoComplete="username"
                placeholder="username"
                value={formState.username}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className={styles.input_area}>
            <label htmlFor="auth-password" className={styles.label}>
              Пароль
            </label>
            <input
              id="auth-password"
              className={styles.input}
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={formState.password}
              onChange={handleChange}
              required
            />
          </div>

          <button className={styles.submit_btn} type="submit" disabled={isLoading}>
            {isLoading ? (
              <span className={styles.btn_spinner_content}>
                <span className={styles.spinner} /> Вход...
              </span>
            ) : (
              "Войти в систему"
            )}
          </button>

          <p className={styles.footer_text}>
            Нет аккаунта?{" "}
            <Link href="/registration" className={styles.link}>
              Зарегистрироваться
            </Link>
          </p>
        </form>
      </div>
    </section>
  );
}
