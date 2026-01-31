"use client";

import Image from "next/image";
import styles from "./page.module.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSocketStore, useUserStore } from "@/store";
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
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
        <Image src={"/next.svg"} alt={"logo"} width={100} height={50} />
        <div className={styles.buttons}>
          <Link href={"/registration"} className={styles.button}>
            Регистрация
          </Link>
          <Link href={"/authorization"} className={styles.button}>
            Авторизация
          </Link>
        </div>
      </div>
    </section>
  );
}
