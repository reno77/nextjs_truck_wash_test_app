import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/login");
  }

  // Role-based redirection
  const role = (session.user as any).role;
  switch (role) {
    case "manager":
      redirect("/manager/dashboard");
    case "washer":
      redirect("/washer/washes");
    case "driver":
      redirect("/driver/dashboard");
    default:
      redirect("/login");
  }
}
