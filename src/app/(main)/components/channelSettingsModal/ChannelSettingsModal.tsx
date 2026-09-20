"use client";

import { useState } from "react";
import { CHAT } from "@/types/types";
import { useChatStore, useSocketStore } from "@/store";
import { REQUESTS } from "@/commands/commands";
import { toast } from "react-toastify";
import ConfirmModal from "../confirmModal/ConfirmModal";
import styles from "./channelSettingsModal.module.css";

interface ChannelSettingsModalProps {
  channel: CHAT;
  serverId: number;
  onClose: () => void;
}

export default function ChannelSettingsModal({
  channel,
  serverId,
  onClose,
}: ChannelSettingsModalProps) {
  const { sendMessage } = useSocketStore();
  const { updateServerChannel, deleteServerChannel, activeChat } = useChatStore();

  const [channelName, setChannelName] = useState(channel.name || "");
  const [channelType, setChannelType] = useState<"SERVER_CHANNEL" | "SERVER_VOICE">(
    channel.type === "SERVER_VOICE" ? "SERVER_VOICE" : "SERVER_CHANNEL",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "permissions">("overview");

  const isVoice = channelType === "SERVER_VOICE";

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanName = channelName.trim().toLowerCase().replace(/\s+/g, "-");
    if (!cleanName) {
      toast.warn("Имя канала не может быть пустым");
      return;
    }

    try {
      setIsLoading(true);
      const res = await sendMessage(REQUESTS.channelUpdate, {
        channelId: channel.id,
        name: cleanName,
        type: channelType,
      });

      const updated = res?.response || res || { ...channel, name: cleanName, type: channelType };
      updateServerChannel(serverId, updated);
      toast.success("Настройки канала сохранены");
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Не удалось обновить канал");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsLoading(true);
      await sendMessage(REQUESTS.channelDelete, {
        channelId: channel.id,
      });

      deleteServerChannel(serverId, channel.id);
      toast.info(`Канал #${channel.name} удален`);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Ошибка удаления канала");
    } finally {
      setIsLoading(false);
      setIsDeleteConfirmOpen(false);
    }
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Боковая панель настроек канала в стиле Discord */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <span className={styles.channelPrefix}>{isVoice ? "🔊" : "#"}</span>
            <span className={styles.channelTitle}>{channel.name}</span>
          </div>

          <div className={styles.tabList}>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === "overview" ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab("overview")}
            >
              ⚙️ Обзор канала
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === "permissions" ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab("permissions")}
            >
              🔒 Права доступа
            </button>
          </div>

          <div className={styles.sidebarFooter}>
            <button
              type="button"
              className={styles.deleteSidebarBtn}
              onClick={() => setIsDeleteConfirmOpen(true)}
            >
              🗑️ Удалить канал
            </button>
          </div>
        </div>

        {/* Основной контент вкладки */}
        <div className={styles.content}>
          <div className={styles.header}>
            <h2>{activeTab === "overview" ? "Обзор канала" : "Права доступа канала"}</h2>
            <button className={styles.closeBtn} onClick={onClose} title="Закрыть (ESC)">
              ✕
            </button>
          </div>

          {activeTab === "overview" && (
            <form className={styles.form} onSubmit={handleSave}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>Название канала</label>
                <div className={styles.inputWrapper}>
                  <span className={styles.inputPrefix}>{isVoice ? "🔊" : "#"}</span>
                  <input
                    type="text"
                    className={`${styles.input} ${styles.inputWithPrefix}`}
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                    placeholder="название-канала"
                    required
                  />
                </div>
                <span className={styles.hint}>
                  Используйте строчные буквы, цифры и дефисы для разделения слов.
                </span>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Тип канала</label>
                <div className={styles.typeSelector}>
                  <div
                    className={`${styles.typeCard} ${channelType === "SERVER_CHANNEL" ? styles.typeCardActive : ""}`}
                    onClick={() => setChannelType("SERVER_CHANNEL")}
                  >
                    <div className={styles.typeCardIcon}>#</div>
                    <div className={styles.typeCardInfo}>
                      <span className={styles.typeCardTitle}>Текстовый канал</span>
                      <span className={styles.typeCardDesc}>
                        Публикация сообщений, изображений, файлов и реакций
                      </span>
                    </div>
                    {channelType === "SERVER_CHANNEL" && <span className={styles.checkBadge}>✓</span>}
                  </div>

                  <div
                    className={`${styles.typeCard} ${channelType === "SERVER_VOICE" ? styles.typeCardActive : ""}`}
                    onClick={() => setChannelType("SERVER_VOICE")}
                  >
                    <div className={styles.typeCardIcon}>🔊</div>
                    <div className={styles.typeCardInfo}>
                      <span className={styles.typeCardTitle}>Голосовой канал</span>
                      <span className={styles.typeCardDesc}>
                        Общение голосом, демонстрация экрана, видеосвязь и чат
                      </span>
                    </div>
                    {channelType === "SERVER_VOICE" && <span className={styles.checkBadge}>✓</span>}
                  </div>
                </div>
              </div>

              <div className={styles.dangerBox}>
                <div className={styles.dangerInfo}>
                  <span className={styles.dangerTitle}>Удаление канала</span>
                  <span className={styles.dangerDesc}>
                    Канал #{channel.name} и вся история сообщений будут безвозвратно удалены.
                  </span>
                </div>
                <button
                  type="button"
                  className={styles.dangerBtn}
                  onClick={() => setIsDeleteConfirmOpen(true)}
                >
                  Удалить
                </button>
              </div>

              <div className={styles.footer}>
                <button type="button" className={styles.cancelBtn} onClick={onClose}>
                  Отмена
                </button>
                <button type="submit" className={styles.saveBtn} disabled={isLoading}>
                  {isLoading ? "Сохранение..." : "Сохранить изменения"}
                </button>
              </div>
            </form>
          )}

          {activeTab === "permissions" && (
            <div className={styles.permissionsTab}>
              <div className={styles.cardBox}>
                <span className={styles.cardTitle}>Доступ участников сервера</span>
                <span className={styles.cardDesc}>
                  По умолчанию все участники сервера имеют доступ к просмотру и отправке сообщений в этот канал.
                </span>
                <div className={styles.permissionItem}>
                  <span>👀 Просмотр канала</span>
                  <span className={styles.permTag}>Разрешено всем</span>
                </div>
                <div className={styles.permissionItem}>
                  <span>💬 Отправка сообщений и медиа</span>
                  <span className={styles.permTag}>Разрешено всем</span>
                </div>
                <div className={styles.permissionItem}>
                  <span>⚙️ Управление каналом</span>
                  <span className={styles.permTag}>Только владельцы и администраторы</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        title="Удалить канал?"
        description={`Вы уверены, что хотите удалить канал "${isVoice ? "🔊 " : "#"}${channel.name}"? Это действие нельзя отменить.`}
        confirmText="Да, удалить канал"
        cancelText="Отмена"
        variant="danger"
        onConfirm={handleDelete}
        onClose={() => setIsDeleteConfirmOpen(false)}
      />
    </div>
  );
}
