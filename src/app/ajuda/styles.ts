"use client";

import Link from "next/link";
import styled from "styled-components";

export const Page = styled.div`
  min-height: 100vh;
  background: var(--paper);
  color: var(--ink);
  padding: calc(12px + env(safe-area-inset-top)) max(20px, env(safe-area-inset-right)) 64px
    max(20px, env(safe-area-inset-left));
`;

export const Header = styled.header`
  max-width: 960px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  min-height: 56px;
  border-bottom: 1px solid var(--rule);
`;

export const Brand = styled(Link)`
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-figures);
  font-size: 18px;
  font-weight: 500;
`;

export const BrandMark = styled.span`
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: var(--green);
  color: var(--on-green);
  font-size: 16px;
`;

export const HeaderLink = styled(Link)`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  font-size: 14px;
  font-weight: 500;
  color: var(--green);
`;

export const Wrap = styled.main`
  max-width: 960px;
  margin: 0 auto;
`;

export const Title = styled.h1`
  margin-top: 32px;
  font-family: var(--font-figures);
  font-weight: 500;
  font-size: clamp(28px, 7vw, 40px);
  line-height: 1.15;
  text-wrap: balance;
`;

export const Lead = styled.p`
  margin-top: 12px;
  max-width: 60ch;
  font-size: 17px;
  line-height: 1.6;
  color: var(--ink-soft);
`;

export const Index = styled.nav`
  margin-top: 28px;
  padding: 18px 20px;
  border-radius: 12px;
  background: var(--sheet);
  max-width: 560px;

  p {
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-soft);
    margin-bottom: 8px;
  }

  ol {
    padding-left: 22px;
    display: grid;
    gap: 2px;
  }

  li::marker {
    font-family: var(--font-figures);
    color: var(--ink-soft);
  }

  a {
    display: inline-block;
    padding: 6px 0;
    color: var(--green);
    font-weight: 500;
  }
`;

export const Section = styled.section<{ $withImage: boolean }>`
  margin-top: 48px;
  padding-top: 24px;
  border-top: 1px solid var(--rule-strong);
  scroll-margin-top: 16px;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 24px;

  @media (min-width: 800px) {
    grid-template-columns: ${({ $withImage }) => ($withImage ? "minmax(0, 1fr) 260px" : "minmax(0, 1fr)")};
    gap: 48px;
    align-items: start;
  }
`;

export const SectionBody = styled.div`
  max-width: 62ch;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  line-height: 1.6;

  h2 {
    font-family: var(--font-figures);
    font-weight: 500;
    font-size: 24px;
    line-height: 1.25;
  }

  a {
    color: var(--green);
    font-weight: 500;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
`;

export const Steps = styled.ol`
  padding-left: 24px;
  display: grid;
  gap: 10px;

  li {
    padding-left: 4px;
  }

  li::marker {
    font-family: var(--font-figures);
    font-weight: 500;
    color: var(--green);
  }
`;

export const Note = styled.p`
  padding: 12px 14px;
  border-radius: 10px;
  background: var(--green-wash);
  font-size: 14px;
  line-height: 1.55;
`;

export const Figure = styled.figure`
  justify-self: center;
  width: min(70vw, 260px);

  img {
    display: block;
    width: 100%;
    height: auto;
    border-radius: 22px;
    border: 1px solid var(--rule-strong);
  }

  @media (min-width: 800px) {
    position: sticky;
    top: 16px;
  }
`;

export const Faq = styled.div`
  border-top: 1px solid var(--rule);

  details {
    border-bottom: 1px solid var(--rule);
  }

  summary {
    cursor: pointer;
    min-height: 52px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-weight: 500;
    list-style: none;
  }

  summary::-webkit-details-marker {
    display: none;
  }

  summary::after {
    content: "+";
    font-family: var(--font-figures);
    font-size: 20px;
    color: var(--ink-soft);
  }

  details[open] summary::after {
    content: "−";
  }

  details p {
    padding: 0 0 16px;
    color: var(--ink-soft);
  }
`;
