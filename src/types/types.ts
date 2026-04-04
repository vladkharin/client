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

export interface User {
  id: number;
  name: string;
  surname: string;
  username: string;
}

export interface Member {
  id: number;
  userId: number;
  conversationId: number;
  joinedAt: string; // ISO 8601 строка, например "2026-01-20T18:03:32.058Z"
  lastReadAt: string | null;
  isOwner: boolean;
  username: string | null;
  user: User;
}

export interface CHAT {
  id: number;
  type: "DIRECT"; // или enum, если будут другие типы
  name: string | null;
  avatar: string | null;
  ownerId: number | null;
  createdAt: string; // ISO 8601
  updatedAt?: string; // ISO 8601
  dmHash?: string;
  members: Member[];
  isTemporary?: boolean;
  unreadCount: number;
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
