import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daymark | Life Tracker",
  description: "A daily tracker for priorities, study sessions and check-ins.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
