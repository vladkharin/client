export type FORM_REGISTRATION = {
  name: string;
  surname: string;
  username: string;
  password: string;
  email: string;
  password_confirmed?: string;
};

export type FORM_AUTHORIZATION = {
  username: string;
  password: string;
};

export type RESPONSE_AUTHORIZATION = {
  id: number;
  access_token: string;
};

export interface Interlocutor {
  id: number;
  username: string;
  name: string | null;
  surname: string | null;
}

export interface LastMessage {
  text: string;
  createdAt: Date | string; // Date для бэкенда, string для фронтенда после JSON.stringify
}

export interface CHAT {
  id: number;
  updatedAt: Date | string;
  lastMessage: LastMessage | null;
  interlocutor: Interlocutor | null;
  isTemporary?: boolean; // Добавь это поле сюда
}

export type FriendStatus = "PENDING" | "ACCEPTED" | "BLOCKED"; // 👈 Расширьте по необходимости

export interface FriendUser {
  id: number;
  username: string;
}

export interface FriendshipInfo {
  id: number; // ID записи в таблице friend
  status: FriendStatus; // Статус дружбы
  createdAt: string; // ISO 8601 date string
  isInitiator: boolean; // true = я отправил запрос, false = мне отправили
}

export interface FriendListItem extends FriendUser {
  friendship: FriendshipInfo;
}

// 👇 Для массива:
export type FriendList = FriendListItem[];

// 👇 ОДИН интерфейс для всех случаев
export interface RespondToRequestResult {
  success: boolean; // true = ок, false = ошибка
  action?: "accepted" | "declined"; // только если success: true
  friend?: FriendListItem; // только если action: 'accepted'
  friendId?: number; // только если action: 'declined' (для удаления из списка заявок)
  error?: string; // только если success: false
  friendshipId?: number;
}
