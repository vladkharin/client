"use client";

import { useState, useEffect, FormEvent } from "react";
import { useUserStore, useSocketStore } from "@/store";
import { getMe, updateProfile } from "@/API/routes";
import { REQUESTS } from "@/commands/commands";
import styles from "./profileModal.module.css";

const STATUS_EMOJIS = ["🎮", "💻", "🏖️", "☕", "🚀", "🎧", "📚", "🔥", "✨", "💤"];

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

  const { sendMessage } = useSocketStore();

  const [activeTab, setActiveTab] = useState<"profile" | "security" | "appearance">("profile");

  const [username, setUsername] = useState(storeUsername || "");
  const [email, setEmail] = useState(storeEmail || "");
  const [name, setName] = useState(storeName || "");
  const [surname, setSurname] = useState(storeSurname || "");
  const [customStatus, setCustomStatus] = useState("");
  const [statusEmoji, setStatusEmoji] = useState("✨");

  // 2FA & Security state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorSecret, setTwoFactorSecret] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [sessions, setSessions] = useState<any[]>([]);

  // Theme state
  const [currentTheme, setCurrentTheme] = useState("dark");

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
          setCustomStatus(data.customStatus || "");
          setStatusEmoji(data.statusEmoji || "✨");
          setTwoFactorEnabled(!!data.twoFactorEnabled);
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

  const handleGenerate2FA = async () => {
    try {
      const res = await sendMessage(REQUESTS.user2faGenerate, {});
      if (res?.secret) {
        setTwoFactorSecret(res.secret);
      }
    } catch (e: any) {
      setErrorMessage(e.message || "Ошибка генерации 2FA");
    }
  };

  const handleVerify2FA = async () => {
    if (!twoFactorCode.trim()) return;
    try {
      const res = await sendMessage(REQUESTS.user2faVerify, { code: twoFactorCode.trim() });
      if (res?.success) {
        setTwoFactorEnabled(true);
        setTwoFactorSecret(null);
        setSuccessMessage("2FA успешно активирована!");
      }
    } catch (e: any) {
      setErrorMessage(e.message || "Неверный код 2FA");
    }
  };

  const handleDisable2FA = async () => {
    try {
      await sendMessage(REQUESTS.user2faDisable, {});
      setTwoFactorEnabled(false);
      setSuccessMessage("2FA отключена");
    } catch (e: any) {
      setErrorMessage(e.message || "Ошибка отключения 2FA");
    }
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
      }

      // Обновляем кастомный статус через сокет
      await sendMessage(REQUESTS.userStatusUpdate, {
        customStatus: customStatus.trim(),
        statusEmoji,
      });

      setSuccessMessage("Профиль и статус успешно обновлены!");
      setTimeout(() => setSuccessMessage(null), 3000);
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
          <h2>Настройки аккаунта</h2>
          <button className={styles.closeBtn} onClick={closeModal}>
            ✕
          </button>
        </div>

        {/* Вкладки */}
        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "profile" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            👤 Профиль
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "security" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("security")}
          >
            🔒 Безопасность (2FA)
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "appearance" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("appearance")}
          >
            🎨 Темы
          </button>
        </div>

        {isFetching ? (
          <div className={styles.loading}>Загрузка данных...</div>
        ) : (
          <>
            {errorMessage && <div className={styles.errorAlert}>{errorMessage}</div>}
            {successMessage && <div className={styles.successAlert}>{successMessage}</div>}

            {/* ВКЛАДКА 1: ПРОФИЛЬ */}
            {activeTab === "profile" && (
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

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Пользовательский статус</label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <select
                      className={styles.input}
                      style={{ width: "70px", padding: "8px" }}
                      value={statusEmoji}
                      onChange={(e) => setStatusEmoji(e.target.value)}
                    >
                      {STATUS_EMOJIS.map((em) => (
                        <option key={em} value={em}>
                          {em}
                        </option>
                      ))}
                    </select>
                    <input
                      className={styles.input}
                      style={{ flex: 1 }}
                      type="text"
                      placeholder="Чем занимаетесь? (напр. В сети / На работе)"
                      value={customStatus}
                      onChange={(e) => setCustomStatus(e.target.value)}
                    />
                  </div>
                </div>

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

            {/* ВКЛАДКА 2: БЕЗОПАСНОСТЬ 2FA & СЕССИИ */}
            {activeTab === "security" && (
              <div className={styles.securitySection}>
                <div className={styles.cardBox}>
                  <span className={styles.cardTitle}>Двухфакторная аутентификация (2FA)</span>
                  <span className={styles.cardDesc}>
                    Защитите ваш аккаунт с помощью TOTP-приложения (Google Authenticator, Яндекс.Ключ).
                  </span>
                  {twoFactorEnabled ? (
                    <div>
                      <div style={{ color: "#30d158", fontWeight: 600, marginBottom: "8px" }}>
                        ✅ 2FA включена и защищает аккаунт
                      </div>
                      <button
                        type="button"
                        className={styles.actionBtn}
                        style={{ background: "#ef4444" }}
                        onClick={handleDisable2FA}
                      >
                        Отключить 2FA
                      </button>
                    </div>
                  ) : twoFactorSecret ? (
                    <div>
                      <p style={{ fontSize: "12px", color: "var(--primary)" }}>
                        Секретный ключ: <code>{twoFactorSecret}</code>
                      </p>
                      <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                        <input
                          type="text"
                          className={styles.input}
                          placeholder="6-значный код"
                          value={twoFactorCode}
                          onChange={(e) => setTwoFactorCode(e.target.value)}
                        />
                        <button type="button" className={styles.actionBtn} onClick={handleVerify2FA}>
                          Подтвердить
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" className={styles.actionBtn} onClick={handleGenerate2FA}>
                      Подключить 2FA
                    </button>
                  )}
                </div>

                <div className={styles.cardBox}>
                  <span className={styles.cardTitle}>Активные сессии</span>
                  <span className={styles.cardDesc}>
                    Устройства и браузеры, с которых выполнен вход в ваш аккаунт.
                  </span>
                  <div className={styles.sessionItem}>
                    <div>
                      <div style={{ fontWeight: 600 }}>Текущее устройство (Браузер)</div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                        IP: Ваш адрес • Активен прямо сейчас
                      </div>
                    </div>
                    <span style={{ color: "#30d158", fontSize: "12px" }}>Текущий сеанс</span>
                  </div>
                </div>
              </div>
            )}

            {/* ВКЛАДКА 3: ОФОРМЛЕНИЕ И ТЕМЫ */}
            {activeTab === "appearance" && (
              <div className={styles.themeGrid}>
                <div
                  className={`${styles.themeCard} ${currentTheme === "dark" ? styles.activeTheme : ""}`}
                  onClick={() => setCurrentTheme("dark")}
                >
                  <span className={styles.themeTitle}>🌙 Темная тема</span>
                  <span className={styles.themeSubtitle}>Классический темный интерфейс CraftHive</span>
                </div>

                <div
                  className={`${styles.themeCard} ${currentTheme === "neon" ? styles.activeTheme : ""}`}
                  onClick={() => setCurrentTheme("neon")}
                >
                  <span className={styles.themeTitle}>⚡ Киберпанк / Неон</span>
                  <span className={styles.themeSubtitle}>Яркие оранжево-неоновые акценты</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
