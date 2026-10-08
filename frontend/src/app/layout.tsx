import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Typeform Clone",
  description: "Build conversational forms, one question at a time.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Karla:wght@400;700&family=Playfair+Display:wght@400;700&family=Space+Grotesk:wght@400;700&display=swap"
        />
      </head>
      <body>
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            duration: 2600,
            style: { background: "#191919", color: "#fff", fontSize: 14, borderRadius: 6, padding: "8px 14px" },
            success: { iconTheme: { primary: "#4ade80", secondary: "#191919" } },
          }}
        />
      </body>
    </html>
  );
}
