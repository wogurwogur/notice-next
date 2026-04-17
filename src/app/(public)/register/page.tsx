import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Register from "@/components/Register";
import { verifyAuthToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function regester() {
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  if (token) {
    try {
      await verifyAuthToken(token);
      redirect("/main");
    } catch {
      // Ignore invalid/expired token and keep register page.
    }
  }

  return (
    <div className="w-full h-full bg-black pt-24">
      <Register />
    </div>
  );
}
