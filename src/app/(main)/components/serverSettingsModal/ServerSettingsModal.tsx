"use client";

import React, { useEffect, useState } from "react";
import { useChatStore, useSocketStore, useUserStore } from "@/store";
import { REQUESTS } from "@/commands/commands";
import { toast } from "react-toastify";
import { QRCodeSVG } from "qrcode.react";
import styles from "./serverSettingsModal.module.css";

interface ServerMemberData {
  id: number;
  userId: number;
  username: string;
  name?: string | null;
  surname?: string | null;
  avatar?: string | null;
  customStatus?: string | null;
  statusEmoji?: string | null;
  role: "OWNER" | "ADMIN" | "MEMBER";
  isOnline: boolean;
}

export function ServerSettingsModal() {
  const { activeServer, serverSettingsModalOpen, setServerSettingsModalOpen, updateServer, removeServer } =
    useChatStore();
  const { sendMessage } = useSocketStore();
  const currentUserId = useUserStore((s) => s.user_id);

  const [activeTab, setActiveTab] = useState<"overview" | "members" | "invites" | "danger">("overview");
  const [serverName, setServerName] = useState("");
  const [serverIcon, setServerIcon] = useState("");
  const [members, setMembers] = useState<ServerMemberData[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentRole, setCurrentRole] = useState<string>("MEMBER");

  useEffect(() => {
    if (activeServer && serverSettingsModalOpen) {
      setServerName(activeServer.name || "");
      setServerIcon(activeServer.icon || "");
      loadMembers();
    }
  }, [activeServer?.id, serverSettingsModalOpen]);

  const loadMembers = async () => {
    if (!activeServer) return;
    setIsLoadingMembers(true);
    try {
      const res = await sendMessage(REQUESTS.serverMembers, { serverId: activeServer.id });
      if (Array.isArray(res)) {
        setMembers(res);
        const me = res.find((m: ServerMemberData) => m.userId === currentUserId || m.id === currentUserId);
        if (me) {
          setCurrentRole(me.role);
        } else if (activeServer.ownerId === currentUserId) {
          setCurrentRole("OWNER");
        }
      }
    } catch (err: any) {
      console.error("Ошибка загрузки участников:", err);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  if (!serverSettingsModalOpen || !activeServer) return null;

  const isOwner = currentRole === "OWNER" || activeServer.ownerId === currentUserId;
  const isAdmin = isOwner || currentRole === "ADMIN";

  const handleSaveOverview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverName.trim()) {
      toast.error("Название сервера не может быть пустым");
      return;
    }
    setIsSaving(true);
    try {
      const updated = await sendMessage(REQUESTS.serverUpdate, {
        serverId: activeServer.id,
        name: serverName.trim(),
        icon: serverIcon.trim() || undefined,
      });
      if (updated) {
        updateServer(activeServer.id, {
          name: updated.name || serverName.trim(),
          icon: updated.icon,
        });
        toast.success("Настройки сервера успешно сохранены!");
      }
    } catch (err: any) {
      toast.error(err?.message || "Не удалось сохранить настройки");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRoleChange = async (targetUserId: number, newRole: string) => {
    try {
      await sendMessage(REQUESTS.serverMemberRoleUpdate, {
        serverId: activeServer.id,
        targetUserId,
        newRole,
      });
      setMembers((prev) =>
        prev.map((m) => (m.userId === targetUserId || m.id === targetUserId ? { ...m, role: newRole as any } : m)),
      );
      toast.success("Роль участника обновлена!");
    } catch (err: any) {
      toast.error(err?.message || "Не удалось изменить роль");
    }
  };

  const handleKickMember = async (targetUserId: number, username: string) => {
    if (!confirm(`Вы уверены, что хотите исключить пользователя ${username} с сервера?`)) return;
    try {
      await sendMessage(REQUESTS.serverMemberKick, {
        serverId: activeServer.id,
        targetUserId,
      });
      setMembers((prev) => prev.filter((m) => m.userId !== targetUserId && m.id !== targetUserId));
      toast.success(`Пользователь ${username} исключен с сервера`);
    } catch (err: any) {
      toast.error(err?.message || "Не удалось исключить участника");
    }
  };

  const handleRegenerateInvite = async () => {
    if (!confirm("Старая ссылка-приглашение перестанет работать. Продолжить?")) return;
    try {
      const res = await sendMessage(REQUESTS.serverInviteRegenerate, { serverId: activeServer.id });
      if (res?.inviteCode) {
        updateServer(activeServer.id, { inviteCode: res.inviteCode });
        toast.success("Создана новая ссылка-приглашение!");
      }
    } catch (err: any) {
      toast.error(err?.message || "Не удалось обновить ссылку");
    }
  };

  const handleDeleteServer = async () => {
    if (!confirm(`ВНИМАНИЕ! Вы собираетесь навсегда удалить сервер "${activeServer.name}". Это действие нельзя отменить.`))
      return;
    try {
      await sendMessage(REQUESTS.serverDelete, { serverId: activeServer.id });
      removeServer(activeServer.id);
      setServerSettingsModalOpen(false);
      toast.success("Сервер успешно удален");
    } catch (err: any) {
      toast.error(err?.message || "Не удалось удалить сервер");
    }
  };

  const handleLeaveServer = async () => {
    if (!confirm(`Вы действительно хотите покинуть сервер "${activeServer.name}"?`)) return;
    try {
      await sendMessage(REQUESTS.serverLeave, { serverId: activeServer.id });
      removeServer(activeServer.id);
      setServerSettingsModalOpen(false);
      toast.success("Вы покинули сервер");
    } catch (err: any) {
      toast.error(err?.message || "Не удалось покинуть сервер");
    }
  };

  const inviteUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/invite/${activeServer.inviteCode}`;

  return (
    <div className={styles.overlay} onClick={() => setServerSettingsModalOpen(false)}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.title}>
            <span>⚙️ Настройки сервера:</span>
            <span style={{ color: "#f97316" }}>{activeServer.name}</span>
          </div>
          <button className={styles.closeBtn} onClick={() => setServerSettingsModalOpen(false)}>
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tabBtn} ${activeTab === "overview" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            📋 Обзор
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === "members" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("members")}
          >
            👥 Участники и Роли ({members.length})
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === "invites" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("invites")}
          >
            🔗 Приглашения
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === "danger" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("danger")}
          >
            ⚠️ Управление
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <form onSubmit={handleSaveOverview} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Название сервера</label>
                <input
                  type="text"
                  className={styles.input}
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value)}
                  placeholder="Введите название сервера"
                  disabled={!isAdmin}
                  maxLength={50}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Ссылка на иконку (URL аватарки)</label>
                <input
                  type="url"
                  className={styles.input}
                  value={serverIcon}
                  onChange={(e) => setServerIcon(e.target.value)}
                  placeholder="https://example.com/icon.png"
                  disabled={!isAdmin}
                />
              </div>

              {serverIcon && (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <img
                    src={serverIcon}
                    alt="Предпросмотр"
                    style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover" }}
                    onError={(e) => ((e.target as HTMLElement).style.display = "none")}
                  />
                  <span style={{ fontSize: 13, color: "#94a3b8" }}>Предпросмотр иконки</span>
                </div>
              )}

              {isAdmin && (
                <div>
                  <button type="submit" className={styles.primaryBtn} disabled={isSaving}>
                    {isSaving ? "Сохранение..." : "💾 Сохранить изменения"}
                  </button>
                </div>
              )}
            </form>
          )}

          {/* TAB 2: MEMBERS & ROLES */}
          {activeTab === "members" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ fontSize: 13, color: "#94a3b8" }}>
                Управляйте правами доступа и ролями участников вашего сервера.
              </div>

              {isLoadingMembers ? (
                <div style={{ padding: 20, textAlign: "center", color: "#94a3b8" }}>Загрузка участников...</div>
              ) : (
                <div className={styles.memberList}>
                  {members.map((member) => {
                    const memberId = member.userId || member.id;
                    const isTargetOwner = member.role === "OWNER";
                    const isSelf = memberId === currentUserId;

                    return (
                      <div key={memberId} className={styles.memberItem}>
                        <div className={styles.memberInfo}>
                          {member.avatar ? (
                            <img src={member.avatar} alt={member.username} className={styles.avatar} />
                          ) : (
                            <div className={styles.avatarFallback}>
                              {member.username?.[0]?.toUpperCase() || "U"}
                            </div>
                          )}
                          <div className={styles.memberDetails}>
                            <div className={styles.memberName}>
                              <span>{member.name ? `${member.name} ${member.surname || ""}` : member.username}</span>
                              {isSelf && <span style={{ fontSize: 11, color: "#94a3b8" }}>(Вы)</span>}
                            </div>
                            <div className={styles.memberUsername}>@{member.username}</div>
                          </div>
                        </div>

                        {/* Role Badge / Selector */}
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {isTargetOwner ? (
                            <span className={`${styles.roleBadge} ${styles.roleOwner}`}>👑 Владелец</span>
                          ) : isOwner ? (
                            <select
                              className={styles.roleSelect}
                              value={member.role}
                              onChange={(e) => handleRoleChange(memberId, e.target.value)}
                            >
                              <option value="MEMBER">👤 Участник</option>
                              <option value="ADMIN">🛡️ Администратор</option>
                            </select>
                          ) : (
                            <span
                              className={`${styles.roleBadge} ${
                                member.role === "ADMIN" ? styles.roleAdmin : styles.roleMember
                              }`}
                            >
                              {member.role === "ADMIN" ? "🛡️ Администратор" : "👤 Участник"}
                            </span>
                          )}

                          {/* Kick Button */}
                          {!isTargetOwner && !isSelf && (isOwner || (isAdmin && member.role === "MEMBER")) && (
                            <button
                              type="button"
                              className={styles.kickBtn}
                              onClick={() => handleKickMember(memberId, member.username)}
                              title="Исключить с сервера"
                            >
                              🚫 Исключить
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: INVITES */}
          {activeTab === "invites" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className={styles.inviteBox}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#ffffff" }}>
                  QR-код и ссылка для приглашения
                </div>
                <div className={styles.qrContainer}>
                  <QRCodeSVG value={inviteUrl} size={160} />
                </div>
                <div className={styles.copyInputGroup}>
                  <input type="text" className={styles.input} value={inviteUrl} readOnly style={{ flex: 1 }} />
                  <button
                    type="button"
                    className={styles.primaryBtn}
                    onClick={() => {
                      navigator.clipboard?.writeText(inviteUrl);
                      toast.success("Ссылка скопирована в буфер обмена!");
                    }}
                  >
                    📋 Копировать
                  </button>
                </div>
              </div>

              {isAdmin && (
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button type="button" className={styles.dangerBtn} onClick={handleRegenerateInvite}>
                    🔄 Сгенерировать новую ссылку
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: DANGER ZONE */}
          {activeTab === "danger" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {isOwner ? (
                <div
                  style={{
                    padding: 16,
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    background: "rgba(239, 68, 68, 0.05)",
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: "#ef4444", fontSize: 15 }}>Удалить этот сервер</div>
                    <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>
                      Сервер, все текстовые и голосовые каналы будут безвозвратно удалены.
                    </div>
                  </div>
                  <button type="button" className={styles.dangerBtn} onClick={handleDeleteServer}>
                    🗑️ Удалить сервер
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    padding: 16,
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    background: "rgba(239, 68, 68, 0.05)",
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: "#ef4444", fontSize: 15 }}>Покинуть сервер</div>
                    <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>
                      Вы потеряете доступ к каналам и сообщениям этого сообщества.
                    </div>
                  </div>
                  <button type="button" className={styles.dangerBtn} onClick={handleLeaveServer}>
                    🚪 Покинуть сервер
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
