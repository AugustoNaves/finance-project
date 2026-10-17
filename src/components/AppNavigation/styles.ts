"use client";

import Link from "next/link";
import styled, { css } from "styled-components";

export const Side = styled.aside`
  display: none;

  @media (min-width: 960px) {
    display: flex;
    flex-direction: column;
    gap: 24px;
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
    padding: 28px 20px 24px;
    border-right: 1px solid var(--rule);
  }
`;

export const Brand = styled(Link)`
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-figures);
  font-size: 19px;
  font-weight: 500;
  color: var(--ink);
`;

export const BrandMark = styled.span`
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: var(--green);
  color: var(--on-green);
  font-family: var(--font-figures);
  font-size: 17px;
`;

export const RegisterButton = styled.button`
  min-height: 44px;
  border-radius: 10px;
  background: var(--green);
  color: var(--on-green);
  font-weight: 600;
`;

export const SideGroup = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 2px;

  p {
    margin: 0 0 6px 10px;
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-soft);
  }
`;

export const SideItem = styled(Link)<{ $active?: boolean }>`
  padding: 9px 10px;
  border-radius: 8px;
  font-size: 14px;
  color: ${({ $active }) => ($active ? "var(--ink)" : "var(--ink-soft)")};
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  background: ${({ $active }) => ($active ? "var(--green-wash)" : "transparent")};

  &:hover {
    color: var(--ink);
  }
`;

export const SideLogout = styled.button`
  margin-top: auto;
  align-self: flex-start;
  padding: 9px 10px;
  border-radius: 8px;
  font-size: 14px;
  color: var(--ink-soft);

  &:hover {
    color: var(--red);
  }
`;

export const TabBar = styled.nav`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  align-items: center;
  background: var(--paper);
  border-top: 1px solid var(--rule);
  padding: 6px max(8px, env(safe-area-inset-right)) calc(6px + env(safe-area-inset-bottom))
    max(8px, env(safe-area-inset-left));

  @media (min-width: 960px) {
    display: none;
  }
`;

const tabStyle = css<{ $active?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-height: 50px;
  font-size: 11px;
  color: ${({ $active }) => ($active ? "var(--ink)" : "var(--ink-soft)")};
  font-weight: ${({ $active }) => ($active ? 600 : 400)};

  svg {
    width: 22px;
    height: 22px;
  }
`;

export const Tab = styled(Link)<{ $active?: boolean }>`
  ${tabStyle}
`;

export const TabButton = styled.button<{ $active?: boolean }>`
  ${tabStyle}
`;

export const PlusTab = styled.button`
  justify-self: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--green);
  color: var(--on-green);

  svg {
    width: 24px;
    height: 24px;
  }
`;

export const MoreList = styled.ul`
  list-style: none;
  border-top: 1px solid var(--rule-strong);
`;

export const MoreLink = styled(Link)<{ $active?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 52px;
  border-bottom: 1px solid var(--rule);
  font-size: 16px;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  color: var(--ink);

  span {
    color: var(--ink-soft);
    font-size: 20px;
  }
`;

export const LogoutButton = styled.button`
  width: 100%;
  min-height: 52px;
  text-align: left;
  font-size: 16px;
  color: var(--red);
`;
