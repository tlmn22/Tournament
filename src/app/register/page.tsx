import type { Metadata } from "next";
import { AccountPreview } from "@/components/account-preview";

export const metadata: Metadata = { title: "Бүртгүүлэх" };

export default function RegisterPage() {
  return <AccountPreview mode="register" />;
}
