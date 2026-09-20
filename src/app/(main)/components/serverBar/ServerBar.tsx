"use client";

import { useEffect } from "react";
import { useChatStore } from "@/store/modules/chat";
import { useSocketStore } from "@/store";
import { REQUESTS } from "@/commands/commands";
import styles from "./serverBar.module.css";
import { ServerItem } from "@/types/types";

export default function ServerBar() {
  const {
    servers,
    setServers,
    activeServer,
    setActiveServer,
    setCreateServerModalOpen,
    setActiveChat,
  } = useChatStore();
  const { sendMessage } = useSocketStore();

  useEffect(() => {
    async function loadServers() {
      try {
        const res = await sendMessage(REQUESTS.serverList, {});
        if (res?.response) {
          setServers(res.response);
        }
      } catch (err) {
        console.error("Ошибка загрузки серверов:", err);
      }
    }

    loadServers();
  }, [sendMessage, setServers]);

  const handleSelectDM = () => {
    setActiveServer(null);
    setActiveChat(null);
  };

  const handleSelectServer = (server: ServerItem) => {
    setActiveServer(server);
    if (server.channels && server.channels.length > 0) {
      setActiveChat(server.channels[0]);
    } else {
      setActiveChat(null);
    }
  };

  return (
    <nav className={styles.serverBar} aria-label="Сообщества и Серверы">
      {/* Кнопка Личные сообщения */}
      <button
        type="button"
        className={`${styles.serverIcon} ${activeServer === null ? styles.activeServer : ""}`}
        onClick={handleSelectDM}
        title="Личные сообщения (DM)"
      >
        💬
      </button>

      <div className={styles.divider} />

      {/* Список серверов */}
      {servers &&
        servers.map((server) => {
          const isActive = activeServer?.id === server.id;
          const initials = server.name.slice(0, 2).toUpperCase();

          return (
            <button
              key={server.id}
              type="button"
              className={`${styles.serverIcon} ${isActive ? styles.activeServer : ""}`}
              onClick={() => handleSelectServer(server)}
              title={server.name}
            >
              {server.icon ? (
                <img
                  src={server.icon}
                  alt={server.name}
                  style={{ width: "100%", height: "100%", borderRadius: "inherit", objectFit: "cover" }}
                />
              ) : (
                initials
              )}
            </button>
          );
        })}

      {/* Кнопка добавления / входа на сервер */}
      <button
        type="button"
        className={styles.addServerBtn}
        onClick={() => setCreateServerModalOpen(true)}
        title="Создать сервер или присоединиться"
      >
        +
      </button>
    </nav>
  );
}
