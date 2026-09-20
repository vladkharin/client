import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Сообщения и звонки",
};

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
