"use client";

import Link from "next/link";
import styled from "styled-components";

export const Page = styled.main`
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 88px;
  padding: max(40px, env(safe-area-inset-top)) 20px max(40px, env(safe-area-inset-bottom));
  background: var(--paper);
  color: var(--ink);

  @media (max-width: 959px) {
    align-items: flex-start;
    padding-top: max(48px, env(safe-area-inset-top));
  }
`;

export const Column = styled.div`
  width: 100%;
  max-width: 400px;
  min-width: 0;
  display: flex;
  flex-direction: column;
`;

export const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-figures);
  font-size: 19px;
  font-weight: 500;
`;

export const BrandMark = styled.span`
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border-radius: 8px;
  background: var(--green);
  color: var(--on-green);
  font-family: var(--font-figures);
  font-size: 17px;
`;

export const Tagline = styled.p`
  margin-top: 28px;
  font-family: var(--font-figures);
  font-size: 24px;
  font-weight: 500;
  line-height: 1.3;
  color: var(--ink);
  text-wrap: balance;
`;

export const Intro = styled.p`
  margin-top: 14px;
  font-size: 15px;
  color: var(--ink-soft);
`;

export const SectionTitle = styled.h1`
  margin-top: 36px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--rule-strong);
  font-family: var(--font-ui);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-soft);
`;

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin-top: 20px;
`;

export const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`;

export const Label = styled.label`
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-soft);
`;

export const Input = styled.input`
  width: 100%;
  min-height: 44px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid var(--rule-strong);
  background: var(--sheet);
  color: var(--ink);
  font-size: 15px;

  &::placeholder {
    color: var(--ink-soft);
    opacity: 0.7;
  }

  &:focus-visible {
    outline: 2px solid var(--green);
    outline-offset: 0;
    border-color: var(--green);
  }

  &:disabled {
    opacity: 0.6;
  }
`;

export const ForgotLink = styled(Link)`
  align-self: flex-end;
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  margin: -12px 0 -8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--green);

  &:hover {
    text-decoration: underline;
  }
`;

export const SubmitButton = styled.button`
  width: 100%;
  min-height: 48px;
  margin-top: 4px;
  border-radius: 10px;
  background: var(--green);
  color: var(--on-green);
  font-size: 15px;
  font-weight: 600;

  &:disabled {
    opacity: 0.6;
    cursor: progress;
  }
`;

export const Notice = styled.p<{ $tone: "success" | "error" }>`
  padding: 10px 14px;
  border-radius: 10px;
  background: ${({ $tone }) => ($tone === "error" ? "var(--red-wash)" : "var(--green-wash)")};
  color: ${({ $tone }) => ($tone === "error" ? "var(--red)" : "var(--ink)")};
  font-size: 14px;
  line-height: 1.45;

  a {
    font-weight: 600;
    text-decoration: underline;
  }
`;

export const Footer = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 2px 6px;
  margin-top: 20px;
  padding-top: 12px;
  border-top: 1px solid var(--rule);
  font-size: 14px;
  color: var(--ink-soft);
`;

export const TextButton = styled.button`
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0 4px;
  font-size: 14px;
  font-weight: 600;
  color: var(--green);

  &:hover:not(:disabled) {
    text-decoration: underline;
  }

  &:disabled {
    opacity: 0.6;
  }
`;

export const TextLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0 4px;
  font-size: 14px;
  font-weight: 600;
  color: var(--green);

  &:hover {
    text-decoration: underline;
  }
`;

export const Fineprint = styled.p`
  margin-top: 12px;
  font-size: 12.5px;
  text-align: center;
  color: var(--ink-soft);
`;

export const Notebook = styled.div`
  display: none;

  @media (min-width: 960px) {
    display: block;
    width: 340px;
    flex-shrink: 0;
    padding: 24px 24px 28px;
    border: 1px solid var(--rule);
    border-radius: 16px;
    background: var(--sheet);
  }
`;

export const NotebookHeader = styled.p`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--rule-strong);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-soft);
`;

export const NotebookRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  min-height: 52px;
  border-bottom: 1px solid var(--rule);
`;

export const NotebookItem = styled.span`
  display: flex;
  flex-direction: column;
  min-width: 0;
  font-size: 14px;
  font-weight: 500;

  small {
    font-size: 12.5px;
    font-weight: 400;
    color: var(--ink-soft);
  }
`;

export const NotebookAmount = styled.span<{ $out?: boolean }>`
  font-family: var(--font-figures);
  font-variant-numeric: tabular-nums;
  font-size: 15px;
  font-weight: 500;
  text-align: right;
  white-space: nowrap;
  color: ${({ $out }) => ($out ? "var(--red)" : "var(--ink)")};
`;

export const NotebookTotal = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  margin-top: 20px;
  font-size: 14px;
  color: var(--ink-soft);

  strong {
    padding-bottom: 2px;
    border-bottom: 4px double var(--ink);
    font-family: var(--font-figures);
    font-variant-numeric: tabular-nums;
    font-size: 26px;
    font-weight: 500;
    color: var(--ink);
  }
`;

export const HelpLink = styled(Link)`
  align-self: center;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  font-size: 14px;
  font-weight: 500;
  color: var(--green);
`;
