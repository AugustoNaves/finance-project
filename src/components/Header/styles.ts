"use client";
import styled from "styled-components";

export const Nav = styled.header`
  background: #1a1a2e;
  padding: 0 32px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;

  @media (max-width: 768px) {
    padding: 0 16px;
  }
`;

export const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.3px;
`;

export const BrandDot = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #00b37e;
`;

export const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

export const NewTransactionButton = styled.button`
  padding: 12px 20px;
  background: transparent;
  border: 1px solid #00b37e;
  border-radius: 8px;
  color: #00b37e;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #00b37e;
    color: #1a1a2e;
  }

  @media (max-width: 768px) {
    padding: 10px 16px;
    font-size: 13px;
  }
`;
