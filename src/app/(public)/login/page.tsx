import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Login from "@/components/Login";
import { verifyAuthToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function page() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (token) {
    try {
      await verifyAuthToken(token);
      redirect("/main");
    } catch {
      // Ignore invalid/expired token and keep login page.
    }
  }

  return (
    <div className="h-full w-full bg-black pt-24">
      <Login />
    </div>
  );
}
