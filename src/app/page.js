import AuthWidget from "@/components/auth/AuthWidget";
import Header from "./layout/Header";
import SidebarMenu from "./layout/SidebarMenu";

export default function Home() {
  return (
    <main className="p-6">
      <Header />
      <AuthWidget />
      <SidebarMenu />
    </main>
  );
}
