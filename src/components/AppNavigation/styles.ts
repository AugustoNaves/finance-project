"use client";

import Link from "next/link";
import styled from "styled-components";

const colors = {
  navy: "#0d1117",
  navyMid: "#161b27",
  navyLight: "#1e2535",
  green: "#00c48c",
  blue: "#0ea5e9",
  textMuted: "#8892a4",
  textLight: "#c9d1e0",
  border: "rgba(255, 255, 255, 0.07)",
};

export const Nav = styled.header`
  position: relative;
  z-index: 2;
  padding: 28px 32px 0;

  @media (max-width: 768px) {
    padding: 20px 16px 0;
  }
`;

export const NavContainer = styled.div`
  max-width: 1120px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 12px;
  background: rgba(22, 27, 39, 0.72);
  border: 1px solid ${colors.border};
  border-radius: 20px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.24);
  backdrop-filter: blur(18px);

  @media (max-width: 768px) {
    padding: 10px 12px;
    border-radius: 18px;
  }
`;

export const Brand = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: #ffffff;
  font-family: var(--font-syne), sans-serif;
  font-size: 1.2rem;
  font-weight: 800;
  letter-spacing: -0.04em;
`;

export const BrandMark = styled.span`
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: linear-gradient(135deg, ${colors.green}, ${colors.blue});
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 18px;
  font-weight: 800;
  box-shadow: 0 0 26px rgba(0, 196, 140, 0.28);
`;

export const DesktopNavList = styled.nav`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  overflow-x: auto;

  &::-webkit-scrollbar {
    display: none;
  }

  @media (max-width: 768px) {
    display: none;
  }
`;

export const NavItem = styled.span<{ $active: boolean }>`
  flex: 0 0 auto;

  a {
    position: relative;
    display: inline-flex;
    align-items: center;
    min-height: 40px;
    padding: 0 13px;
    border-radius: 999px;
    color: ${({ $active }) => ($active ? "#ffffff" : colors.textMuted)};
    background: ${({ $active }) =>
      $active
        ? "linear-gradient(135deg, rgba(0, 196, 140, 0.18), rgba(14, 165, 233, 0.12))"
        : "transparent"};
    border: 1px solid transparent;
    font-size: 0.84rem;
    font-weight: 700;
    isolation: isolate;
    overflow: hidden;
    transition:
      background 0.2s,
      color 0.2s,
      border-color 0.2s,
      transform 0.15s,
      box-shadow 0.2s;
  }

  a::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    border-radius: inherit;
    background:
      radial-gradient(circle at 30% 0%, rgba(0, 196, 140, 0.2), transparent 52%),
      rgba(255, 255, 255, 0.055);
    opacity: ${({ $active }) => ($active ? 1 : 0)};
    transition: opacity 0.2s;
  }

  a::after {
    content: "";
    position: absolute;
    left: 50%;
    bottom: 5px;
    width: ${({ $active }) => ($active ? "18px" : "0")};
    height: 2px;
    border-radius: 999px;
    background: linear-gradient(90deg, ${colors.green}, ${colors.blue});
    box-shadow: 0 0 14px rgba(0, 196, 140, 0.45);
    transform: translateX(-50%);
    transition: width 0.2s;
  }

  a:hover {
    color: #ffffff;
    border-color: rgba(255, 255, 255, 0.08);
    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);
    transform: translateY(-1px);
  }

  a:hover::before {
    opacity: 1;
  }

  a:hover::after {
    width: 18px;
  }
`;

export const MenuButton = styled.button`
  display: none;
  align-items: center;
  gap: 10px;
  min-height: 42px;
  padding: 0 13px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid ${colors.border};
  color: #ffffff;
  font-size: 0.86rem;
  font-weight: 700;
  transition:
    background 0.2s,
    border-color 0.2s,
    transform 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.14);
    transform: translateY(-1px);
  }

  @media (max-width: 768px) {
    display: inline-flex;
  }
`;

export const MenuIcon = styled.span`
  display: grid;
  gap: 4px;
  width: 18px;

  span {
    display: block;
    height: 2px;
    border-radius: 999px;
    background: linear-gradient(90deg, ${colors.green}, ${colors.blue});
  }
`;

export const DrawerOverlay = styled.div<{ $open: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 10;
  display: none;
  background: rgba(4, 8, 14, 0.68);
  backdrop-filter: blur(8px);
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  pointer-events: ${({ $open }) => ($open ? "auto" : "none")};
  transition: opacity 0.2s ease;

  @media (max-width: 768px) {
    display: block;
  }
`;

export const DrawerPanel = styled.aside<{ $open: boolean }>`
  position: absolute;
  inset: 0 0 0 auto;
  width: min(86vw, 340px);
  min-height: 100%;
  padding: 18px;
  background:
    radial-gradient(circle at 100% 0%, rgba(0, 196, 140, 0.12), transparent 34%),
    linear-gradient(180deg, ${colors.navyMid}, ${colors.navy});
  border-left: 1px solid ${colors.border};
  box-shadow: -24px 0 70px rgba(0, 0, 0, 0.42);
  transform: translateX(${({ $open }) => ($open ? "0" : "100%")});
  transition: transform 0.24s ease;
`;

export const DrawerHeader = styled.header`
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 16px;
  padding-bottom: 18px;
  border-bottom: 1px solid ${colors.border};
`;

export const CloseButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(247, 90, 104, 0.1);
  border: 1px solid rgba(247, 90, 104, 0.22);
  color: #f75a68;
  font-size: 0.78rem;
  font-weight: 700;
`;

export const MobileNavList = styled.nav`
  display: grid;
  gap: 10px;
  margin-top: 20px;
`;

export const MobileNavItem = styled.span<{ $active: boolean }>`
  a {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 48px;
    padding: 0 14px;
    border-radius: 14px;
    background: ${({ $active }) =>
      $active ? "rgba(0, 196, 140, 0.12)" : "rgba(255, 255, 255, 0.04)"};
    border: 1px solid
      ${({ $active }) =>
        $active ? "rgba(0, 196, 140, 0.28)" : "rgba(255, 255, 255, 0.07)"};
    color: ${({ $active }) => ($active ? "#ffffff" : colors.textLight)};
    font-size: 0.96rem;
    font-weight: 700;
  }

  a::after {
    content: "";
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ $active }) => ($active ? colors.green : colors.textMuted)};
    box-shadow: ${({ $active }) =>
      $active ? `0 0 16px ${colors.green}` : "none"};
    opacity: ${({ $active }) => ($active ? 1 : 0.36)};
  }
`;
