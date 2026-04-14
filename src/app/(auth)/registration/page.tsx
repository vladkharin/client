"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import styles from "./page.module.css";
import { FORM_REGISTRATION, RESPONSE_AUTHORIZATION } from "@/types/types";
import { registration, authorization } from "@/API/routes"; // Импортируем обе функции
import { useSocketStore, useUserStore } from "@/store";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Page() {
  const router = useRouter();
  const { login } = useUserStore();

  const [formState, setFormState] = useState<FORM_REGISTRATION>({
    name: "",
    surname: "",
    username: "",
    email: "",
    password: "",
    password_confirmed: "",
  });

  const [error, setError] = useState<Partial<FORM_REGISTRATION>>({});

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormState({ ...formState, [name]: value });
    if (error[name as keyof FORM_REGISTRATION]) {
      setError({ ...error, [name]: "" });
    }
  };

  async function postData(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let errorCount = 0;

    if (formState.password !== formState.password_confirmed) {
      setError((prev) => ({ ...prev, password_confirmed: "Пароли не совпадают" }));
      errorCount++;
      return;
    }

    if (errorCount === 0) {
      try {
        const { password_confirmed, ...dataToSend } = formState;

        // 1. Регистрируем пользователя
        await registration(JSON.stringify(dataToSend));

        // 2. Сразу авторизуем (автологин)
        const authData = {
          username: formState.username,
          password: formState.password,
        };

        const response: RESPONSE_AUTHORIZATION = await authorization(JSON.stringify(authData));

        // 3. Сохраняем данные в стор
        login(response.access_token, response.id);

        // 4. Подключаем сокет и переходим в приложение
        useSocketStore.getState().connect(response.access_token, () => {
          router.push("/main");
        });
      } catch (err) {
        console.error("Ошибка при регистрации/входе:", err);
        // Тут можно добавить вывод ошибки в UI
      }
    }
  }

  return (
    <section className={styles.section}>
      {/* Тот самый логотип-ссылка */}
      <Link href="/" className={styles.logo_link}>
        <h1 className={styles.logo_title}>
          craft<span>Hive</span>
        </h1>
      </Link>

      <div className={styles.wrapper}>
        <h2 className={styles.title}>Регистрация</h2>
        <form className={styles.form} onSubmit={postData}>
          <div className={styles.input_area}>
            <p className={styles.label}>Имя</p>
            <input className={styles.input} type="text" name="name" placeholder="Имя" onChange={handleChange} required />
          </div>

          <div className={styles.input_area}>
            <p className={styles.label}>Фамилия</p>
            <input className={styles.input} type="text" name="surname" placeholder="Фамилия" onChange={handleChange} required />
          </div>

          <div className={styles.input_area}>
            <p className={styles.label}>Никнейм</p>
            <input className={styles.input} type="text" name="username" placeholder="Никнейм" onChange={handleChange} required />
          </div>

          <div className={styles.input_area}>
            <p className={styles.label}>Почта</p>
            <input className={styles.input} type="email" name="email" placeholder="example@mail.com" onChange={handleChange} required />
          </div>

          <div className={styles.input_area}>
            <p className={styles.label}>Пароль</p>
            <input className={styles.input} type="password" name="password" placeholder="••••••••" onChange={handleChange} required />
          </div>

          <div className={styles.input_area}>
            <p className={styles.label}>Повторите пароль</p>
            <input
              className={styles.input}
              type="password"
              name="password_confirmed"
              placeholder="••••••••"
              onChange={handleChange}
              required
            />
            {error.password_confirmed && <p className={styles.error_text}>{error.password_confirmed}</p>}
          </div>

          <button className={styles.submit_btn} type="submit">
            Создать аккаунт
          </button>
        </form>
      </div>
    </section>
  );
}
