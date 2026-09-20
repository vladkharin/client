"use client";

import { useEffect, useState } from "react";
import { useChatStore, useSocketStore, useUserStore, useCallStore } from "@/store";
import { REQUESTS } from "@/commands/commands";
import UserActionPopover from "../userActionPopover/UserActionPopover";
import styles from "./memberList.module.css";

interface ServerMemberItem {
  id: number;
  userId: number;
  username: string;
  name?: string | null;
  surname?: string | null;
  avatar?: string | null;
  customStatus?: string | null;
  statusEmoji?: string | null;
  lastSeenAt?: string | null;
  isOnline?: boolean;
  role: "OWNER" | "ADMIN" | "MEMBER";
}

function getAvatarGradient(str: string = "") {
  const gradients = [
    "linear-gradient(135deg, #f97316, #fb923c)",
    "linear-gradient(135deg, #6366f1, #a855f7)",
    "linear-gradient(135deg, #ec4899, #f43f5e)",
    "linear-gradient(135deg, #10b981, #14b8a6)",
    "linear-gradient(135deg, #3b82f6, #06b6d4)",
    "linear-gradient(135deg, #eab308, #f97316)",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}

function getInitials(name?: string) {
  if (!name) return "?";
  return name.slice(0, 2).toUpperCase();
}

export default function MemberList() {
  const { activeServer, activeChat, isMemberListOpen, findOrCreateDirectChat, setActiveChat, onlineUserIds } = useChatStore();
  const { sendMessage } = useSocketStore();
  const { user_id } = useUserStore();
  const { setOutgoing, setConversationId } = useCallStore();

  const [members, setMembers] = useState<ServerMemberItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState<ServerMemberItem | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!activeServer?.id) {
      setMembers([]);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    sendMessage(REQUESTS.serverMembers, { serverId: activeServer.id })
      .then((res: any) => {
        if (!isMounted) return;
        const list = Array.isArray(res) ? res : res?.response || [];
        setMembers(list);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Ошибка загрузки участников сервера:", err);
        setMembers([]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeServer?.id, sendMessage]);

  if (!isMemberListOpen || !activeServer) {
    return null;
  }

  const handleMemberClick = (member: ServerMemberItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (member.userId === user_id) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const top = Math.min(rect.top, window.innerHeight - 380);
    setPopoverPos({ top, left: Math.max(12, rect.left - 290) });
    setSelectedMember(member);
  };

  const isUserOnline = (m: ServerMemberItem) => {
    return m.userId === user_id || (m.userId ? onlineUserIds.includes(m.userId) : false) || !!m.isOnline;
  };

  // Group members into roles / categories
  const owners = members.filter((m) => m.role === "OWNER");
  const admins = members.filter((m) => m.role === "ADMIN");
  const regularMembers = members.filter((m) => m.role === "MEMBER" || !m.role);

  return (
    <aside className={styles.container}>
      <div className={styles.scrollArea}>
        {isLoading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <span>Загрузка участников...</span>
          </div>
        ) : (
          <>
            {/* ГРУППА 1: ВЛАДЕЛЕЦ */}
            {owners.length > 0 && (
              <div className={styles.group}>
                <div className={styles.groupHeader}>
                  <span>👑 ВЛАДЕЛЕЦ</span>
                  <span className={styles.groupCount}>— {owners.length}</span>
                </div>
                {owners.map((member) => (
                  <MemberRow
                    key={member.id || member.userId}
                    member={member}
                    isSelf={member.userId === user_id}
                    isOnline={isUserOnline(member)}
                    onClick={(e) => handleMemberClick(member, e)}
                  />
                ))}
              </div>
            )}

            {/* ГРУППА 2: АДМИНИСТРАТОРЫ */}
            {admins.length > 0 && (
              <div className={styles.group}>
                <div className={styles.groupHeader}>
                  <span>🛡️ АДМИНИСТРАТОРЫ</span>
                  <span className={styles.groupCount}>— {admins.length}</span>
                </div>
                {admins.map((member) => (
                  <MemberRow
                    key={member.id || member.userId}
                    member={member}
                    isSelf={member.userId === user_id}
                    isOnline={isUserOnline(member)}
                    onClick={(e) => handleMemberClick(member, e)}
                  />
                ))}
              </div>
            )}

            {/* ГРУППА 3: УЧАСТНИКИ */}
            {regularMembers.length > 0 && (
              <div className={styles.group}>
                <div className={styles.groupHeader}>
                  <span>УЧАСТНИКИ</span>
                  <span className={styles.groupCount}>— {regularMembers.length}</span>
                </div>
                {regularMembers.map((member) => (
                  <MemberRow
                    key={member.id || member.userId}
                    member={member}
                    isSelf={member.userId === user_id}
                    isOnline={isUserOnline(member)}
                    onClick={(e) => handleMemberClick(member, e)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Меню действий с пользователем */}
      <UserActionPopover
        isOpen={!!selectedMember}
        user={
          selectedMember
            ? {
                id: selectedMember.userId,
                username: selectedMember.username,
                name: selectedMember.name,
                surname: selectedMember.surname,
                avatar: selectedMember.avatar,
                customStatus: selectedMember.customStatus,
                statusEmoji: selectedMember.statusEmoji,
                isOnline: isUserOnline(selectedMember),
                role: selectedMember.role,
              }
            : null
        }
        anchorPos={popoverPos}
        onClose={() => setSelectedMember(null)}
      />
    </aside>
  );
}

function MemberRow({
  member,
  isSelf,
  isOnline,
  onClick,
}: {
  member: ServerMemberItem;
  isSelf: boolean;
  isOnline: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  const displayName = member.name
    ? `${member.name} ${member.surname || ""}`.trim()
    : member.username;

  return (
    <div className={styles.memberRow} onClick={onClick} style={{ opacity: isOnline ? 1 : 0.65 }}>
      <div className={styles.avatarWrapper}>
        <div
          className={styles.avatar}
          style={{ background: getAvatarGradient(member.username) }}
        >
          {getInitials(displayName)}
        </div>
        <span className={isOnline ? styles.statusIndicator : styles.offlineIndicator} />
      </div>

      <div className={styles.memberInfo}>
        <div className={styles.memberNameRow}>
          <span className={styles.memberName}>
            {displayName} {isSelf && <span className={styles.selfTag}>(вы)</span>}
          </span>
          {member.role === "OWNER" && <span className={styles.crownIcon} title="Создатель">👑</span>}
        </div>

        {member.customStatus ? (
          <div className={styles.customStatusText}>
            <span>{member.statusEmoji || "✨"}</span>
            <span className={styles.statusSnippet}>{member.customStatus}</span>
          </div>
        ) : (
          <span className={styles.memberHandle}>@{member.username}</span>
        )}
      </div>
    </div>
  );
}
