// src/app/styles.ts
"use client";
import styled from "styled-components";

export const PageWrapper = styled.div`
  min-height: 100vh;
  background: #f0f2f5;
`;

export const HeaderWrapper = styled.div`
  background: #1a1a2e;
  padding-bottom: 80px;
`;

export const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 32px;
  transform: translateY(50%);

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    transform: none;
    padding: 24px 16px;
  }
`;

export const ContentWrapper = styled.main`
  max-width: 1100px;
  margin: 0 auto;
  padding: 80px 32px 40px;

  @media (max-width: 768px) {
    padding: 24px 16px;
  }
`;
