import type { Metadata } from "next";
import { ButtonPointerHighlight } from "@/components/ui/button-pointer-highlight";
import { Providers } from "./providers";
import "./globals.css";
import "./stitch.css";
import "./motion.css";
export const metadata: Metadata = {
  title: "OpsDesk | Travel support, connected",
  description:
    "Every booking, conversation and travel deadline in one workspace.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
        <ButtonPointerHighlight />
      </body>
    </html>
  );
}
