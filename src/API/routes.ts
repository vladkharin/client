const API_URL = "http://localhost:3001/api";

type OPTIONS = {
  method: string;
  headers: {
    "Content-Type": string;
  };
  body?: string;
};

const f = async (method: string, data: string, url: string) => {
  const options: OPTIONS = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (data) {
    options.body = data;
  }

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
