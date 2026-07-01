"use client";

import styled from "styled-components";

const colors = {
  red: "#f75a68",
  textMuted: "#8892a4",
  textLight: "#c9d1e0",
  border: "rgba(255, 255, 255, 0.07)",
};

export const Message = styled.p`
  color: ${colors.textMuted};
  line-height: 1.6;
`;

export const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 24px;

  @media (max-width: 480px) {
    flex-direction: column-reverse;
  }
`;

export const CancelButton = styled.button`
  min-height: 42px;
  padding: 0 16px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid ${colors.border};
  color: ${colors.textLight};
  font-size: 0.88rem;
  font-weight: 700;
`;

export const ConfirmButton = styled.button`
  min-height: 42px;
  padding: 0 16px;
  border-radius: 10px;
  background: linear-gradient(90deg, #f75a68 0%, #ff7a7a 100%);
  color: #ffffff;
  font-family: var(--font-syne), sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  box-shadow: 0 8px 24px rgba(247, 90, 104, 0.22);
`;
