import { useGlobalStore } from "@/store";
import { SERVER_TYPE } from "@/store/modules/global";

const DEV_API_URL = "http://localhost:3001/api";
const PROD_API_URL = "https://api.domcraft.digital/api";

type OPTIONS = {
  method: string;
  headers: {
    "Content-Type": string;
  };
  body?: string;
};

const f = async (method: string, data: string, url: string) => {
  const { server } = useGlobalStore.getState();
  const options: OPTIONS = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (data) {
    options.body = data;
  }

  const API_URL = server == SERVER_TYPE.PROD ? PROD_API_URL : DEV_API_URL;

  const response = await fetch(API_URL + url, options);

  try {
    return response.json();
  } catch (error) {
    console.log(error);
  }
};

export async function registration(data: string) {
  return await f("POST", data, "/user/registration");
}

export async function authorization(data: string) {
  return await f("POST", data, "/auth/user");
}
