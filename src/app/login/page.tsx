import type { Metadata } from "next";
import { AccountPreview } from "@/components/account-preview";

export const metadata: Metadata = { title: "Нэвтрэх" };

export default function LoginPage() {
  return <AccountPreview mode="login" />;
}
