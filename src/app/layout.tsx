import type { Metadata } from "next";
import { EmotionRegistry } from "@/components/ui/emotion-registry";
import { Provider } from "@/components/ui/provider";

export const metadata: Metadata = {
  title: "オトシル",
  description: "技大祭の落とし物アプリ",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body>
        <EmotionRegistry>
          <Provider>{children}</Provider>
        </EmotionRegistry>
      </body>
    </html>
  );
}
