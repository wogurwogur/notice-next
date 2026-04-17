import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import NoticeInsert from "@/components/NoticeInsert";
import { verifyAuthToken } from "@/lib/auth";
import { isAdminRole } from "@/lib/user-role";

export default async function NoticeInsertPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (!token) {
    redirect("/login");
  }

  try {
    const payload = await verifyAuthToken(token);
    if (!isAdminRole(payload.user_role)) {
      redirect("/main");
    }
  } catch {
    redirect("/login");
  }

  return <NoticeInsert />;
}
