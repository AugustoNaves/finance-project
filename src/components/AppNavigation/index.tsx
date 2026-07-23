"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Brand,
  BrandMark,
  CloseButton,
  DesktopNavList,
  DrawerHeader,
  DrawerOverlay,
  DrawerPanel,
  MenuButton,
  MenuIcon,
  MobileNavItem,
  MobileNavList,
  Nav,
  NavContainer,
  NavItem,
} from "./styles";

const navItems = [
  { label: "Início", href: "/" },
  { label: "Transações", href: "/transactions" },
  { label: "Categorias", href: "/categories" },
  { label: "Investimentos", href: "/investments" },
  { label: "Planejamento", href: "/planning" },
  { label: "Relatórios", href: "/reports" },
  { label: "Configurações", href: "/settings" },
];

function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === href : pathname.startsWith(href);
}

export function AppNavigation() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <Nav>
      <NavContainer>
        <Brand href="/" aria-label="Ir para o início">
          <BrandMark>F</BrandMark>
          <span>Finanças</span>
        </Brand>

        <DesktopNavList aria-label="Navegação principal">
          {navItems.map((item) => {
            const active = isActivePath(pathname, item.href);

            return (
              <NavItem key={item.href} $active={active}>
                <Link href={item.href}>{item.label}</Link>
              </NavItem>
            );
          })}
        </DesktopNavList>

        <MenuButton
          type="button"
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen(true)}
        >
          <MenuIcon aria-hidden="true">
            <span />
            <span />
            <span />
          </MenuIcon>
          Menu
        </MenuButton>
      </NavContainer>

      <DrawerOverlay $open={menuOpen} onClick={closeMenu} aria-hidden={!menuOpen}>
        <DrawerPanel
          id="mobile-navigation"
          $open={menuOpen}
          role="dialog"
          aria-modal="true"
          aria-label="Navegação principal"
          onClick={(event) => event.stopPropagation()}
        >
          <DrawerHeader>
            <Brand href="/" aria-label="Ir para o início" onClick={closeMenu}>
              <BrandMark>F</BrandMark>
              <span>Finanças</span>
            </Brand>
            <CloseButton type="button" onClick={closeMenu}>
              Fechar
            </CloseButton>
          </DrawerHeader>

          <MobileNavList>
            {navItems.map((item) => {
              const active = isActivePath(pathname, item.href);

              return (
                <MobileNavItem key={item.href} $active={active}>
                  <Link href={item.href} onClick={closeMenu}>
                    {item.label}
                  </Link>
                </MobileNavItem>
              );
            })}
          </MobileNavList>
        </DrawerPanel>
      </DrawerOverlay>
    </Nav>
  );
}
