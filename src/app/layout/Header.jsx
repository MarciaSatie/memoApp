import Image from "next/image";
import ThemeSwitcher from "@/components/layout/ThemeSwitcher";

export default function Header() {
  return (
    <div className="flex items-center justify-between bg-neutral-800 p-5 border-b-2 border-bd mt-6">
      {/* LEFT SIDE: logo + title */}
      <div className="flex items-center gap-3">
        <Image
          src="/cards_logo.svg"
          alt="Memo Mingle Logo"
          width={100}
          height={100}
          priority
        />
        <h1 className=" text-title text-2xl font-bold">Memo Mingle App</h1>
      </div>
      {/* RIGHT SIDE: theme switcher */}
      <ThemeSwitcher />
    </div>
  );
}
