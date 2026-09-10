/**
 * Indica se um item do menu corresponde à rota atual. Itens exatos, como a
 * página inicial de uma área, só ficam ativos na própria rota.
 */
export function isActivePath(
  pathname: string,
  href: string,
  exact = false,
): boolean {
  if (exact) {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return "?";
  }

  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";

  return `${first}${last}`.toUpperCase();
}
