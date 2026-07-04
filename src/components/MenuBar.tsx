import { auth } from "@/auth";
import MenuBarClient from "@/components/MenuBarClient";

export default async function MenuBar() {
  const session = await auth();
  const role = session?.user?.role;
  return <MenuBarClient role={role} />;
}
