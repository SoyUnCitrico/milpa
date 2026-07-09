import type { Metadata } from "next";
import { Share_Tech_Mono } from "next/font/google";
import "./globals.css";

const mono = Share_Tech_Mono({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "MILPA — galería de código creativo",
  description:
    "MILPA: una galería donde el código se siembra. Sketches legacy de p5.js envueltos en modo instancia y montados con un componente React reutilizable.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={mono.variable}>
      {/* Sin bg-fondo en body: el fondo opaco vive en html (globals.css) para
          no tapar la escena parallax fija de la landing. */}
      <body className="min-h-screen font-mono text-crema antialiased">
        {children}
      </body>
    </html>
  );
}
