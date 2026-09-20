"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSocketStore, useUserStore, useChatStore } from "@/store";
import { REQUESTS } from "@/commands/commands";
import styles from "./invite.module.css";

interface InviteInfo {
  id: number;
  name: string;
  icon?: string | null;
  inviteCode: string;
  membersCount: number;
  channelsCount: number;
  owner?: {
    id: number;
    username: string;
    avatar?: string | null;
  } | null;
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const rawCode = Array.isArray(params?.code) ? params.code[0] : (params?.code as string) || "";
  const cleanCode = decodeURIComponent(rawCode).replace(/.*\/invite\//, "").trim();

  const { isConnected, connect, sendMessage } = useSocketStore();
  const { token, user_id } = useUserStore();
  const { addServer, setActiveServer, setActiveChat } = useChatStore();

  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCopied, setHasCopied] = useState(false);

  useEffect(() => {
    if (token && !isConnected) {
      connect(token);
    }
  }, [token, isConnected, connect]);

  useEffect(() => {
    if (!cleanCode) {
      setError("Код приглашения не указан");
      setIsLoading(false);
      return;
    }

    async function loadInvite() {
      try {
        setIsLoading(true);
        setError(null);
        const res: any = await sendMessage(REQUESTS.serverInviteInfo, {
          inviteCode: cleanCode,
        });

        const data = res?.response ?? res;
        if (data && (data.id || data.name)) {
          setInviteInfo(data);
        } else {
          setError("Приглашение недействительно или сервер удален");
        }
      } catch (err: any) {
        setError(err?.message || "Не удалось загрузить информацию о сервере");
      } finally {
        setIsLoading(false);
      }
    }

    loadInvite();
  }, [cleanCode, sendMessage]);

  const handleAcceptInvite = async () => {
    if (!token || !user_id) {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("pending_invite", cleanCode);
      }
      router.push(`/authorization?invite=${encodeURIComponent(cleanCode)}`);
      return;
    }

    try {
      setIsJoining(true);
      setError(null);
      const res: any = await sendMessage(REQUESTS.serverJoin, {
        inviteCode: cleanCode,
      });

      const serverData = res?.response ?? res;
      if (serverData && (serverData.id || serverData.name)) {
        addServer(serverData);
        setActiveServer(serverData);
        if (serverData.channels && serverData.channels.length > 0) {
          setActiveChat(serverData.channels[0]);
        }
        router.push("/main");
      } else {
        router.push("/main");
      }
    } catch (err: any) {
      setError(err?.message || "Ошибка подключения к серверу");
      setIsJoining(false);
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard?.writeText(window.location.href);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "CH";
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.glow} />

        {isLoading ? (
          <div className={styles.loadingBox}>
            <div className={styles.spinner} />
            <span>Загрузка приглашения...</span>
          </div>
        ) : error ? (
          <div className={styles.errorBox}>
            <div className={styles.errorIcon}>⚠️</div>
            <h2 className={styles.errorTitle}>Недействительное приглашение</h2>
            <p className={styles.errorDesc}>{error}</p>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => router.push("/main")}
            >
              Перейти на главную
            </button>
          </div>
        ) : inviteInfo ? (
          <>
            <div className={styles.headerSubtitle}>
              ВАС ПРИГЛАШАЮТ ПРИСОЕДИНИТЬСЯ К СООБЩЕСТВУ
            </div>

            <div className={styles.serverMeta}>
              <div className={styles.serverIconBox}>
                {inviteInfo.icon ? (
                  <img
                    src={inviteInfo.icon}
                    alt={inviteInfo.name}
                    className={styles.serverIconImg}
                  />
                ) : (
                  <div className={styles.serverInitials}>
                    {getInitials(inviteInfo.name)}
                  </div>
                )}
              </div>

              <h1 className={styles.serverTitle}>{inviteInfo.name}</h1>

              <div className={styles.statsRow}>
                <div className={styles.statItem}>
                  <span className={styles.onlineDot} />
                  <span>{inviteInfo.membersCount} участников</span>
                </div>
                <span className={styles.statDivider}>•</span>
                <div className={styles.statItem}>
                  <span>🔊 {inviteInfo.channelsCount} каналов</span>
                </div>
              </div>

              {inviteInfo.owner && (
                <div className={styles.ownerRow}>
                  <span>Создатель:</span>
                  <span className={styles.ownerName}>@{inviteInfo.owner.username}</span>
                </div>
              )}
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={handleAcceptInvite}
                disabled={isJoining}
              >
                {isJoining ? "Подключение..." : "Принять приглашение"}
              </button>

              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={handleCopyLink}
              >
                {hasCopied ? "✓ Ссылка скопирована!" : "📋 Скопировать ссылку"}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
