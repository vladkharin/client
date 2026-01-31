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
  nickname: string | null;
  user: User;
}

export interface CHAT {
  id: number;
  type: "DIRECT"; // или enum, если будут другие типы
  name: string | null;
  avatar: string | null;
  ownerId: number | null;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  dmHash: string;
  members: Member[];
}
