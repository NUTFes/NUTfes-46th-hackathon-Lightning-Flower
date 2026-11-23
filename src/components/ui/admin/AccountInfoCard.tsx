import { Badge } from "@chakra-ui/react";
import type { Role } from "@/lib/types";
import { LogoutButton } from "../LogoutButton";
import styles from "./Panel.module.css";

const ROLE_LABELS: Record<Role, string> = {
  admin: "本部（admin）",
  member: "実行委員（member）",
  guest: "参加者（guest）",
};

// 設定（A08）のアカウント情報
export function AccountInfoCard({
  email,
  role,
  authProvider,
}: {
  email: string;
  role: Role;
  authProvider: string;
}) {
  return (
    <section className={styles.panel} aria-labelledby="account-info-title">
      <h2 id="account-info-title" className={styles.title}>
        アカウント
      </h2>
      <dl className={styles.infoList}>
        <dt>メールアドレス</dt>
        <dd>{email}</dd>
        <dt>権限</dt>
        <dd>
          <Badge colorPalette={role === "admin" ? "purple" : "gray"}>
            {ROLE_LABELS[role]}
          </Badge>
        </dd>
        <dt>ログイン方法</dt>
        <dd>{authProvider}</dd>
      </dl>
      <LogoutButton />
    </section>
  );
}
