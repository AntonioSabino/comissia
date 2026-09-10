import type { ReactNode } from "react";
import styles from "./app-shell.module.css";
import type { ShellArea } from "./navigation";
import { ShellNavigation } from "./shell-navigation";

type AppShellProps = {
  area: ShellArea;
  userName: string;
  roleLabel: string;
  children: ReactNode;
};

export function AppShell({
  area,
  userName,
  roleLabel,
  children,
}: AppShellProps) {
  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#conteudo">
        Pular para o conteúdo
      </a>
      <ShellNavigation area={area} userName={userName} roleLabel={roleLabel} />
      <main id="conteudo" className={styles.main} tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
