import { LogoutButton } from "@/components/LogoutButton";
import styles from "@/components/Panel.module.css";
import { RoleBadge } from "@/components/RoleBadge";
import type { Me } from "@/lib/schemas/me";

// 設定（A08）のアカウント情報。/admin は Cloudflare Access の内側なので guest は来ない
export function AccountInfoCard({
  email,
  role,
  authProvider,
}: {
  email: string;
  role: Exclude<Me["role"], "guest">;
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
          <RoleBadge role={role} />
        </dd>
        <dt>ログイン方法</dt>
        <dd>{authProvider}</dd>
      </dl>
      <LogoutButton role={role} />
    </section>
  );
}
