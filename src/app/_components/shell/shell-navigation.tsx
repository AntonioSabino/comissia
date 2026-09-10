"use client";

import { LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { classNames } from "../ui/class-names";
import styles from "./app-shell.module.css";
import { BrandMark } from "./brand-mark";
import { getInitials, isActivePath } from "./nav-path";
import { navigationByArea, type ShellArea } from "./navigation";

const NAVIGATION_ID = "navegacao-principal";

type ShellNavigationProps = {
  area: ShellArea;
  userName: string;
  roleLabel: string;
};

export function ShellNavigation({
  area,
  userName,
  roleLabel,
}: ShellNavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const items = navigationByArea[area];

  useEffect(() => {
    if (!open) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);

    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  async function handleLogout() {
    setLogoutError(null);
    setIsLeaving(true);

    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });

      if (!response.ok) {
        setLogoutError("Não foi possível sair");
        return;
      }

      router.replace("/login");
      router.refresh();
    } catch {
      setLogoutError("Não foi possível conectar ao sistema");
    } finally {
      setIsLeaving(false);
    }
  }

  return (
    <>
      <div className={styles.mobileBar}>
        <Link href={items[0].href} className={styles.mobileBrand}>
          <BrandMark size="sm" />
          Comissia
        </Link>
        <button
          type="button"
          className={styles.menuButton}
          aria-expanded={open}
          aria-controls={NAVIGATION_ID}
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? (
            <X size={20} strokeWidth={1.8} aria-hidden="true" />
          ) : (
            <Menu size={20} strokeWidth={1.8} aria-hidden="true" />
          )}
        </button>
      </div>

      <aside
        id={NAVIGATION_ID}
        className={classNames(styles.sidebar, open && styles.sidebarOpen)}
      >
        <div className={styles.brand}>
          <BrandMark className={styles.brandMark} />
          <div className={styles.brandText}>
            <strong>Comissia</strong>
            <span>Gestão de comissões</span>
          </div>
        </div>

        <nav aria-label="Navegação principal" className={styles.nav}>
          {items.map(({ href, label, icon: Icon, exact }) => {
            const active = isActivePath(pathname, href, exact);

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={classNames(
                  styles.navItem,
                  active && styles.navItemActive,
                )}
                onClick={() => setOpen(false)}
              >
                <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.user}>
          <span className={styles.avatar} aria-hidden="true">
            {getInitials(userName)}
          </span>
          <span className={styles.userText}>
            <strong>{userName}</strong>
            <span>{roleLabel}</span>
          </span>
          <button
            type="button"
            className={styles.logout}
            onClick={handleLogout}
            disabled={isLeaving}
            aria-label="Sair"
            title="Sair"
          >
            <LogOut size={17} strokeWidth={1.8} aria-hidden="true" />
          </button>
          {logoutError ? (
            <p role="alert" className={styles.logoutError}>
              {logoutError}
            </p>
          ) : null}
        </div>
      </aside>

      {open ? (
        <button
          type="button"
          className={styles.scrim}
          aria-label="Fechar menu"
          tabIndex={-1}
          onClick={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
