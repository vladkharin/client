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
