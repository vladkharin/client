"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import styles from "./page.module.css";
import { FORM_REGISTRATION } from "@/types/types";
import { registration } from "@/API/routes";

export default function Page() {
  const [formState, setFormState] = useState<FORM_REGISTRATION>({
    name: "",
    surname: "",
    username: "",
    email: "",
    password: "",
    password_confirmed: "",
  });

  const [error, setError] = useState<FORM_REGISTRATION>({
    name: "",
    surname: "",
    username: "",
    email: "",
    password: "",
    password_confirmed: "",
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
      <div className={styles.wrapper}>
        <h2>Регистрация</h2>
        <form className={styles.form} onSubmit={postData}>
          <div className={styles.input_area}>
            <p className={styles.label}>Введите Имя</p>
            <input className={styles.input} type="text" name={"name"} placeholder={"Имя"} onChange={handleChange} />
            <p style={{ display: error.name ? "block" : "none" }}>{error.name}</p>
          </div>
          <div className={styles.input_area}>
            <p className={styles.label}>Введите Фамилию</p>
            <input className={styles.input} type="text" name={"surname"} placeholder={"Фамилия"} onChange={handleChange} />
            <p style={{ display: error.surname ? "block" : "none" }}>{error.surname}</p>
          </div>
          <div className={styles.input_area}>
            <p className={styles.label}>Введите Никнейм</p>
            <input className={styles.input} type="text" name={"username"} placeholder={"Никнейм"} onChange={handleChange} />
            <p style={{ display: error.username ? "block" : "none" }}>{error.username}</p>
          </div>
          <div className={styles.input_area}>
            <p className={styles.label}>Введите Почту</p>
            <input className={styles.input} type="email" name={"email"} placeholder={"Почта"} onChange={handleChange} />
            <p style={{ display: error.email ? "block" : "none" }}>{error.email}</p>
          </div>
          <div className={styles.input_area}>
            <p className={styles.label}>Введите Пароль</p>
            <input className={styles.input} type="text" name={"password"} placeholder={"Пароль"} onChange={handleChange} />
            <p style={{ display: error.password ? "block" : "none" }}>{error.password}</p>
          </div>
          <div className={styles.input_area}>
            <p className={styles.label}>Введите Повторно Пароль</p>
            <input
              className={styles.input}
              type="text"
              name={"password_confirmed"}
              placeholder={"Повторите пароль"}
              onChange={handleChange}
            />
            <p style={{ display: error.password_confirmed ? "block" : "none" }}>{error.password_confirmed}</p>
          </div>

          <button type={"submit"}>Зарегистрироваться</button>
        </form>
      </div>
    </section>
  );

  async function postData(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let errorCount = 0;
    if (formState.password != formState.password_confirmed) {
      setError({ ...error, password_confirmed: "Пароли не совпадают" });
      errorCount++;
    }

    const dataObj = formState;

    console.log(dataObj);
    delete dataObj["password_confirmed"];
    console.log(dataObj);

    if (errorCount == 0) {
      const response = await registration(JSON.stringify(dataObj));

      const data = await response.json();
      console.log(data);
    }
  }
}
