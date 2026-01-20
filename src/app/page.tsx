import Image from "next/image";
import styles from "./page.module.css";
import Link from "next/link";
export default async function Home() {
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
