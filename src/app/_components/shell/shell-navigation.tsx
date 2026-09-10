"use client";

import { LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const mobileBarRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const items = navigationByArea[area];

  const closeMenu = useCallback((restoreFocus = true) => {
    setOpen(false);

    if (restoreFocus) {
      requestAnimationFrame(() => menuButtonRef.current?.focus());
    }
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const sidebar = sidebarRef.current;
    const main = document.getElementById("conteudo");
    const mobileBar = mobileBarRef.current;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    main?.setAttribute("inert", "");
    mobileBar?.setAttribute("inert", "");
    closeButtonRef.current?.focus();

    function keepFocusInside(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }

      if (event.key !== "Tab" || !sidebar) {
        return;
      }

      const focusableElements = Array.from(
        sidebar.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );

      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", keepFocusInside);

    return () => {
      window.removeEventListener("keydown", keepFocusInside);
      document.body.style.overflow = previousOverflow;
      main?.removeAttribute("inert");
      mobileBar?.removeAttribute("inert");
    };
  }, [closeMenu, open]);

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
      <div ref={mobileBarRef} className={styles.mobileBar}>
        <Link href={items[0].href} className={styles.mobileBrand}>
          <BrandMark size="sm" />
          Comissia
        </Link>
        <button
          ref={menuButtonRef}
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
        ref={sidebarRef}
        id={NAVIGATION_ID}
        className={classNames(styles.sidebar, open && styles.sidebarOpen)}
        role={open ? "dialog" : undefined}
        aria-modal={open || undefined}
        aria-label={open ? "Menu principal" : undefined}
      >
        <button
          ref={closeButtonRef}
          type="button"
          className={styles.drawerClose}
          aria-label="Fechar menu"
          onClick={() => closeMenu()}
        >
          <X size={20} strokeWidth={1.8} aria-hidden="true" />
        </button>

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
          onClick={() => closeMenu()}
        />
      ) : null}
    </>
  );
}
