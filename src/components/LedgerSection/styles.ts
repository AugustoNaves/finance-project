"use client";

import styled from "styled-components";

export const Root = styled.section`
  padding-top: 24px;
`;

export const Head = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--rule-strong);

  a,
  button {
    font-size: 14px;
    font-weight: 500;
    color: var(--green);
    padding: 4px 0;
  }
`;

export const Heading = styled.h2`
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-soft);
`;
