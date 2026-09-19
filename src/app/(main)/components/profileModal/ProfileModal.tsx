"use client";

import { useState, useEffect, FormEvent } from "react";
import { useUserStore } from "@/store";
import { getMe, updateProfile } from "@/API/routes";
import styles from "./profileModal.module.css";

export default function ProfileModal() {
  const {
    username: storeUsername,
    email: storeEmail,
    name: storeName,
    surname: storeSurname,
    user_id,
    setProfileModalOpen,
    setUserProfile,
  } = useUserStore();

  const [username, setUsername] = useState(storeUsername || "");
  const [email, setEmail] = useState(storeEmail || "");
  const [name, setName] = useState(storeName || "");
  const [surname, setSurname] = useState(storeSurname || "");

  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadUserData() {
      try {
        setIsFetching(true);
        const data = await getMe();
        if (data) {
          setUsername(data.username || "");
          setEmail(data.email || "");
          setName(data.name || "");
          setSurname(data.surname || "");
          setCreatedAt(data.createdAt || null);
          setUserProfile(data);
        }
      } catch (e: any) {
        console.error("Ошибка загрузки профиля:", e);
      } finally {
        setIsFetching(false);
      }
    }

    loadUserData();
  }, [setUserProfile]);

  const closeModal = () => {
    setProfileModalOpen(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    if (!trimmedUsername) {
      setErrorMessage("Никнейм не может быть пустым");
      return;
    }

    if (!trimmedEmail) {
      setErrorMessage("Email не может быть пустым");
      return;
    }

    try {
      setIsLoading(true);
      const updatedUser = await updateProfile({
        username: trimmedUsername,
        email: trimmedEmail,
        name: name.trim(),
        surname: surname.trim(),
      });

      if (updatedUser) {
        setUserProfile(updatedUser);
        setSuccessMessage("Профиль успешно обновлен!");
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Не удалось сохранить изменения");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.backdrop} onClick={closeModal}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Мой профиль</h2>
          <button className={styles.closeBtn} onClick={closeModal}>
            ✕
          </button>
        </div>

        {isFetching ? (
          <div className={styles.loading}>Загрузка данных...</div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.avatarSection}>
              <div className={styles.avatar}>
                {(name ? name[0] : username ? username[0] : "U").toUpperCase()}
              </div>
              <div className={styles.avatarMeta}>
                <span className={styles.userTag}>ID: #{user_id}</span>
                {createdAt && (
                  <span className={styles.dateTag}>
                    Регистрация: {new Date(createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {errorMessage && <div className={styles.errorAlert}>{errorMessage}</div>}
            {successMessage && <div className={styles.successAlert}>{successMessage}</div>}

            <div className={styles.inputGroup}>
              <label className={styles.label}>Никнейм (@)</label>
              <input
                className={styles.input}
                type="text"
                placeholder="Придумайте ник..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Электронная почта</label>
              <input
                className={styles.input}
                type="email"
                placeholder="example@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className={styles.row}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Имя</label>
                <input
                  className={styles.input}
                  type="text"
                  placeholder="Ваше имя"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Фамилия</label>
                <input
                  className={styles.input}
                  type="text"
                  placeholder="Ваша фамилия"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.footer}>
              <button type="button" className={styles.cancelBtn} onClick={closeModal}>
                Отмена
              </button>
              <button type="submit" className={styles.saveBtn} disabled={isLoading}>
                {isLoading ? "Сохранение..." : "Сохранить изменения"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
