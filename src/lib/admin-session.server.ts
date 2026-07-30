import { useSession } from "@tanstack/react-start/server";

type AdminSession = { admin?: boolean };

function config() {
  return {
    password: process.env.SESSION_SECRET!,
    name: "presento-admin",
    maxAge: 60 * 60 * 8,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "lax" as const,
      path: "/",
    },
  };
}

export async function getAdminSession() {
  return useSession<AdminSession>(config());
}

export async function isAdmin(): Promise<boolean> {
  const session = await getAdminSession();
  return session.data.admin === true;
}

export async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Unauthorized");
}
