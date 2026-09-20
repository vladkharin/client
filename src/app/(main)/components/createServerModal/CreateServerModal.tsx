"use client";

import { useState, FormEvent } from "react";
import { useChatStore } from "@/store/modules/chat";
import { useSocketStore } from "@/store";
import { REQUESTS } from "@/commands/commands";
import styles from "./createServerModal.module.css";

export default function CreateServerModal() {
  const { setCreateServerModalOpen, addServer } = useChatStore();
  const { sendMessage } = useSocketStore();

  const [serverName, setServerName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [activeTab, setActiveTab] = useState<"create" | "join">("create");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const closeModal = () => {
    setCreateServerModalOpen(false);
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!serverName.trim()) return;

    try {
      setIsLoading(true);
      setError(null);
      const res: any = await sendMessage(REQUESTS.serverCreate, {
        name: serverName.trim(),
      });

      const serverData = res?.response ?? res;
      if (serverData && (serverData.id || serverData.name)) {
        addServer(serverData);
        closeModal();
      }
    } catch (err: any) {
      setError(err.message || "Ошибка создания сервера");
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async (e: FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    try {
      setIsLoading(true);
      setError(null);
      const res: any = await sendMessage(REQUESTS.serverJoin, {
        inviteCode: inviteCode.trim(),
      });

      const serverData = res?.response ?? res;
      if (serverData && (serverData.id || serverData.name)) {
        addServer(serverData);
        closeModal();
      }
    } catch (err: any) {
      setError(err.message || "Ошибка подключения к серверу");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.backdrop} onClick={closeModal}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Сообщества и Серверы</h2>
          <button className={styles.closeBtn} onClick={closeModal}>
            ✕
          </button>
        </div>

        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "create" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("create")}
          >
            ➕ Создать сервер
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "join" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("join")}
          >
            🔗 Присоединиться
          </button>
        </div>

        {error && <div className={styles.errorAlert}>{error}</div>}

        {activeTab === "create" ? (
          <form onSubmit={handleCreate} className={styles.form}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Название сервера</label>
              <input
                className={styles.input}
                type="text"
                placeholder="Моё крутое сообщество..."
                value={serverName}
                onChange={(e) => setServerName(e.target.value)}
                required
              />
            </div>
            <div className={styles.footer}>
              <button type="button" className={styles.cancelBtn} onClick={closeModal}>
                Отмена
              </button>
              <button type="submit" className={styles.submitBtn} disabled={isLoading}>
                {isLoading ? "Создание..." : "Создать сервер"}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleJoin} className={styles.form}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Код приглашения</label>
              <input
                className={styles.input}
                type="text"
                placeholder="Вставьте код приглашения..."
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                required
              />
            </div>
            <div className={styles.footer}>
              <button type="button" className={styles.cancelBtn} onClick={closeModal}>
                Отмена
              </button>
              <button type="submit" className={styles.submitBtn} disabled={isLoading}>
                {isLoading ? "Вход..." : "Присоединиться"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
