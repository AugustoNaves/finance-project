"use client";

import styled from "styled-components";

export const Message = styled.p`
  color: var(--ink-soft);
  line-height: 1.6;
`;

export const ErrorSlot = styled.div`
  margin-top: 16px;

  &:empty {
    display: none;
  }
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
  min-height: 44px;
  padding: 0 16px;
  border-radius: 10px;
  color: var(--ink);
  font-weight: 500;

  &:hover {
    background: var(--green-wash);
  }
`;

export const ConfirmButton = styled.button`
  min-height: 44px;
  padding: 0 18px;
  border-radius: 10px;
  background: var(--red);
  color: var(--sheet);
  font-weight: 600;

  &:disabled {
    opacity: 0.6;
    cursor: progress;
  }
`;
