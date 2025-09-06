import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/app/provider/AuthProvider";



const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Memo App",
  description: "By Marcia Satie",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="ocean">
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var theme = localStorage.getItem('theme');
                if (theme === 'ocean') {
                  document.documentElement.setAttribute('data-theme', 'ocean');
                }
              } catch (e) {}
            })();
          `
        }} />
    </head>

      <body suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>

        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
