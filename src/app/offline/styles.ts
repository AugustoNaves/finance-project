"use client";

import styled from "styled-components";

export const Page = styled.main`
  min-height: 100vh;
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 24px max(20px, env(safe-area-inset-right)) 24px max(20px, env(safe-area-inset-left));
  background: var(--paper);
`;

export const Sheet = styled.div`
  width: 100%;
  max-width: 380px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

export const Brand = styled.p`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
  font-family: var(--font-figures);
  font-size: 19px;
  font-weight: 500;
`;

export const BrandMark = styled.span`
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: var(--green);
  color: var(--on-green);
  font-size: 17px;
`;

export const Title = styled.h1`
  font-family: var(--font-figures);
  font-weight: 500;
  font-size: 28px;
  padding-bottom: 8px;
  border-bottom: 4px double var(--rule-strong);
`;

export const Text = styled.p`
  color: var(--ink-soft);
  line-height: 1.6;
`;

export const Retry = styled.button`
  align-self: flex-start;
  min-height: 44px;
  padding: 0 18px;
  border-radius: 10px;
  background: var(--green);
  color: var(--on-green);
  font-weight: 600;
`;
