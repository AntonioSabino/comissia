import { describe, expect, it } from "vitest";
import { getInitials, isActivePath } from "./nav-path";

describe("isActivePath", () => {
  it("ativa um item exato somente na própria rota", () => {
    expect(isActivePath("/admin", "/admin", true)).toBe(true);
    expect(isActivePath("/admin/sellers", "/admin", true)).toBe(false);
  });

  it("mantém a seção ativa nas rotas internas", () => {
    expect(isActivePath("/admin/sellers", "/admin/sellers")).toBe(true);
    expect(isActivePath("/admin/sellers/abc", "/admin/sellers")).toBe(true);
  });

  it("não confunde rotas com o mesmo prefixo", () => {
    expect(isActivePath("/admin/sellers-report", "/admin/sellers")).toBe(false);
  });
});

describe("getInitials", () => {
  it("usa a primeira letra do primeiro e do último nome", () => {
    expect(getInitials("Maria da Silva")).toBe("MS");
    expect(getInitials("  érica   souza ")).toBe("ÉS");
  });

  it("usa uma letra quando há um único nome", () => {
    expect(getInitials("Bruno")).toBe("B");
  });

  it("devolve um marcador quando o nome está vazio", () => {
    expect(getInitials("   ")).toBe("?");
  });
});
