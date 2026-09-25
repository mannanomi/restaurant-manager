"use client";

import { useRouter } from "next/navigation";
import { IconLogout } from "./ui/icons";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      title="Log out"
      aria-label="Log out"
      className="shrink-0 rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
    >
      <IconLogout className="h-[18px] w-[18px]" />
    </button>
  );
}
