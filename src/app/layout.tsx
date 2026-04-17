import "./globals.css";
import "@/styles/common.css";
import FlairCursor from "@/components/FlairCursor";



export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="ko" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div className="h-screen overflow-hidden">
          <FlairCursor></FlairCursor>
          {children}
        </div>
      </body>
    </html>
  );
}
