import { useState, useEffect, FormEvent } from "react";
import { useUserStore, useSocketStore } from "@/store";
import { getMe, updateProfile } from "@/API/routes";
import { REQUESTS } from "@/commands/commands";
import { QRCodeSVG } from "qrcode.react";
import VoiceSettingsTab from "./VoiceSettingsTab";
import styles from "./profileModal.module.css";
import { toast } from "react-toastify";

const STATUS_EMOJIS = ["🎮", "💻", "🏖️", "☕", "🚀", "🎧", "📚", "🔥", "✨", "💤"];

export default function ProfileModal() {
  const {
    username: storeUsername,
    email: storeEmail,
    name: storeName,
    surname: storeSurname,
    user_id,
    profileModalTab,
    setProfileModalOpen,
    setProfileModalTab,
    setUserProfile,
  } = useUserStore();

  const { sendMessage } = useSocketStore();

  const [activeTab, setActiveTab] = useState<"profile" | "security" | "appearance" | "voice" | "notifications">(
    profileModalTab || "profile",
  );

  const [notifPermission, setNotifPermission] = useState<string>("default");
  const [countdown, setCountdown] = useState<number>(0);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (profileModalTab) {
      setActiveTab(profileModalTab);
    }
  }, [profileModalTab]);

  const [username, setUsername] = useState(storeUsername || "");
  const [email, setEmail] = useState(storeEmail || "");
  const [name, setName] = useState(storeName || "");
  const [surname, setSurname] = useState(storeSurname || "");
  const [customStatus, setCustomStatus] = useState("");
  const [statusEmoji, setStatusEmoji] = useState("✨");

  // 2FA & Security state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorSecret, setTwoFactorSecret] = useState<string | null>(null);
  const [twoFactorOtpUrl, setTwoFactorOtpUrl] = useState<string | null>(null);
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
        const url =
          res.otpauthUrl ||
          `otpauth://totp/CraftHive%20(${encodeURIComponent(username || "user")})?secret=${res.secret}&issuer=CraftHive`;
        setTwoFactorOtpUrl(url);
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
        setTwoFactorOtpUrl(null);
        setTwoFactorCode("");
        toast.success("2FA успешно активирована!");
      }
    } catch (e: any) {
      toast.error(e.message || "Неверный код 2FA");
      setErrorMessage(e.message || "Неверный код 2FA");
    }
  };

  const handleDisable2FA = async () => {
    try {
      await sendMessage(REQUESTS.user2faDisable, {});
      setTwoFactorEnabled(false);
      setTwoFactorSecret(null);
      setTwoFactorOtpUrl(null);
      toast.info("2FA отключена");
    } catch (e: any) {
      toast.error(e.message || "Ошибка отключения 2FA");
      setErrorMessage(e.message || "Ошибка отключения 2FA");
    }
  };

  const handleRequestPush = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const perm = await Notification.requestPermission();
        setNotifPermission(perm);
        if (perm === "granted") {
          toast.success("Push-уведомления успешно включены!");
          new Notification("CraftHive", {
            body: "Тестовое уведомление: всё работает отлично!",
            icon: "/icon.png",
          });
        } else {
          toast.warn("Уведомления отклонены или заблокированы");
        }
      } catch (err: any) {
        toast.error(err?.message || "Ошибка запроса уведомлений");
      }
    }
  };

  const handleStartPushTest = () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Ваш браузер не поддерживает Notifications API");
      return;
    }

    if (Notification.permission !== "granted") {
      toast.warn("Сначала разрешите системные уведомления, нажав кнопку выше");
      return;
    }

    setCountdown(5);
    toast.info("⏳ Сверните вкладку! Уведомление сработает через 5 секунд...");

    let current = 5;
    const interval = setInterval(() => {
      current -= 1;
      setCountdown(current);
      if (current <= 0) {
        clearInterval(interval);
        try {
          new Notification("CraftHive — Тестовое уведомление", {
            body: "🎉 Тест успешен! Системные уведомления работают идеально.",
            icon: "/icon.png",
          });
        } catch {}
        toast.success("🎉 Системное уведомление отправлено!");
      }
    }, 1000);
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
            onClick={() => {
              setActiveTab("profile");
              setProfileModalTab("profile");
            }}
          >
            👤 Профиль
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "voice" ? styles.activeTab : ""}`}
            onClick={() => {
              setActiveTab("voice");
              setProfileModalTab("voice");
            }}
          >
            🎙️ Голос и Видео
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "security" ? styles.activeTab : ""}`}
            onClick={() => {
              setActiveTab("security");
              setProfileModalTab("security");
            }}
          >
            🔒 Безопасность (2FA)
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "appearance" ? styles.activeTab : ""}`}
            onClick={() => {
              setActiveTab("appearance");
              setProfileModalTab("appearance");
            }}
          >
            🎨 Темы
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "notifications" ? styles.activeTab : ""}`}
            onClick={() => {
              setActiveTab("notifications");
              setProfileModalTab("notifications");
            }}
          >
            🔔 Уведомления
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

            {/* ВКЛАДКА 2: ГОЛОС И ВИДЕО */}
            {activeTab === "voice" && <VoiceSettingsTab />}

            {/* ВКЛАДКА 3: БЕЗОПАСНОСТЬ 2FA & СЕССИИ */}
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
                    <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "12px" }}>
                      <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                        1. Отсканируйте QR-код в приложении аутентификатора (Google Authenticator, Яндекс.Ключ, 1Password):
                      </div>

                      <div
                        style={{
                          background: "#ffffff",
                          padding: "14px",
                          borderRadius: "12px",
                          width: "fit-content",
                          margin: "0 auto",
                          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
                        }}
                      >
                        <QRCodeSVG
                          value={
                            twoFactorOtpUrl ||
                            `otpauth://totp/CraftHive%20(${encodeURIComponent(username || "user")})?secret=${twoFactorSecret}&issuer=CraftHive`
                          }
                          size={170}
                          level="M"
                        />
                      </div>

                      <div
                        style={{
                          background: "var(--bg-element)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "8px",
                          padding: "10px 14px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "8px",
                        }}
                      >
                        <div style={{ fontSize: "12px", color: "var(--text-secondary)", wordBreak: "break-all" }}>
                          Ключ: <strong style={{ color: "var(--primary)", letterSpacing: "1px" }}>{twoFactorSecret}</strong>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (twoFactorSecret) {
                              navigator.clipboard.writeText(twoFactorSecret);
                              toast.success("Секретный ключ скопирован!");
                            }
                          }}
                          style={{
                            background: "transparent",
                            border: "1px solid var(--border-color)",
                            color: "var(--text-primary)",
                            borderRadius: "6px",
                            padding: "4px 8px",
                            cursor: "pointer",
                            fontSize: "11px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          📋 Скопировать
                        </button>
                      </div>

                      <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>
                        2. Введите 6-значный код из приложения для подтверждения:
                      </div>

                      <div style={{ display: "flex", gap: "8px" }}>
                        <input
                          type="text"
                          className={styles.input}
                          placeholder="000000"
                          maxLength={6}
                          value={twoFactorCode}
                          onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ""))}
                          style={{ letterSpacing: "3px", textAlign: "center", fontWeight: 700, fontSize: "16px" }}
                        />
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={handleVerify2FA}
                          disabled={twoFactorCode.length < 6}
                        >
                          Подтвердить
                        </button>
                        <button
                          type="button"
                          className={styles.cancelBtn}
                          onClick={() => {
                            setTwoFactorSecret(null);
                            setTwoFactorOtpUrl(null);
                            setTwoFactorCode("");
                          }}
                          style={{ padding: "0 12px", fontSize: "12px" }}
                        >
                          Отмена
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

            {/* ВКЛАДКА 5: УВЕДОМЛЕНИЯ И ТЕСТИРОВАНИЕ */}
            {activeTab === "notifications" && (
              <div className={styles.form}>
                <div className={styles.cardBox}>
                  <span className={styles.cardTitle}>Статус системных Push-уведомлений</span>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "12px" }}>
                    <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>
                      Разрешение браузера:
                    </span>
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 700,
                        color:
                          notifPermission === "granted"
                            ? "#10b981"
                            : notifPermission === "denied"
                            ? "#ef4444"
                            : "#f59e0b",
                      }}
                    >
                      {notifPermission === "granted"
                        ? "✅ Разрешено"
                        : notifPermission === "denied"
                        ? "❌ Заблокировано"
                        : "⚠️ Требуется разрешение"}
                    </span>
                  </div>

                  {notifPermission !== "granted" && (
                    <button
                      type="button"
                      className={styles.actionBtn}
                      style={{ marginTop: "14px", width: "100%", justifyContent: "center" }}
                      onClick={handleRequestPush}
                    >
                      🔔 Разрешить уведомления в браузере
                    </button>
                  )}
                </div>

                <div className={styles.cardBox}>
                  <span className={styles.cardTitle}>🧪 Тестирование уведомлений</span>
                  <span className={styles.cardDesc}>
                    Нажмите кнопку ниже, чтобы проверить работу всплывающих уведомлений или системного Push.
                  </span>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "14px" }}>
                    <button
                      type="button"
                      className={styles.secondaryBtn}
                      style={{ padding: "12px 16px", fontSize: "13px", textAlign: "left", width: "100%", cursor: "pointer" }}
                      onClick={() => {
                        toast.info("💬 @svetik: Привет! Это мгновенный тестовый Toast 🎉");
                      }}
                    >
                      ⚡ 1. Мгновенный тест (Toast внутри сайта)
                    </button>

                    <button
                      type="button"
                      className={styles.actionBtn}
                      style={{ padding: "12px 16px", fontSize: "13px", textAlign: "left", width: "100%", cursor: "pointer" }}
                      disabled={countdown > 0}
                      onClick={handleStartPushTest}
                    >
                      {countdown > 0
                        ? `⏳ Сверните вкладку! Push сработает через ${countdown} сек...`
                        : "⏱️ 2. Тест системного Push через 5 секунд (успеете свернуть окно)"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
