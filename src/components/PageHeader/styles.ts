"use client";

import styled from "styled-components";

export const HeaderRoot = styled.header`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px 24px;
  padding: 12px 0 20px;

  @media (min-width: 960px) {
    padding-top: 0;
  }
`;

export const HeaderContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  max-width: 640px;
`;

export const HeaderEyebrow = styled.p`
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-soft);
`;

export const HeaderTitle = styled.h1`
  font-family: var(--font-figures);
  font-weight: 500;
  font-size: 24px;
  line-height: 1.2;
  text-wrap: balance;

  @media (min-width: 960px) {
    font-size: 28px;
  }
`;

export const HeaderSubtitle = styled.p`
  color: var(--ink-soft);
  font-size: 14px;
  line-height: 1.5;
`;

export const HeaderAction = styled.button`
  min-height: 44px;
  padding: 0 18px;
  border-radius: 10px;
  background: var(--green);
  color: var(--on-green);
  font-weight: 600;
  white-space: nowrap;

  @media (max-width: 599px) {
    width: 100%;
  }
`;
