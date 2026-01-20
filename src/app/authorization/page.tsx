"use client";

import { FORM_AUTHORIZATION, RESPONSE_AUTHORIZATION } from "@/types/types";
import styles from "./page.module.css";
import { ChangeEvent, FormEvent, useState } from "react";
import { authorization } from "@/API/routes";
import { useUserStore } from "@/store";

export default function Page() {
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

  return (
    <section className={styles.section}>
      <div>Авторизация</div>
      <form className={styles.form} onSubmit={postData}>
        <div className={styles.input_area}>
          <p className={styles.label}>Введите Никнейм</p>
          <input className={styles.input} type="text" name={"username"} placeholder={"Никнейм"} onChange={handleChange} />
        </div>
        <div className={styles.input_area}>
          <p className={styles.label}>Введите Пароль</p>
          <input className={styles.input} type="text" name={"password"} placeholder={"Пароль"} onChange={handleChange} />
        </div>
        <button type={"submit"}>Авторизоваться</button>
      </form>
    </section>
  );

  async function postData(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errorCount = 0;

    const dataObj = formState;
    console.log(dataObj);

    if (errorCount == 0) {
      const response: RESPONSE_AUTHORIZATION = await authorization(JSON.stringify(dataObj));

      login(response.access_token, response.id);
    }
  }
}
