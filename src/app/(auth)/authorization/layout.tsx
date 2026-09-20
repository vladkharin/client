import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Авторизация",
};

export default function AuthorizationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
