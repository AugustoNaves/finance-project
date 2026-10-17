"use client";

import styled, { css } from "styled-components";

const fieldControl = css`
  width: 100%;
  min-height: 44px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid var(--rule-strong);
  background: var(--paper);
  color: var(--ink);
  font-size: 15px;

  &::placeholder {
    color: var(--ink-soft);
    opacity: 0.7;
  }
`;

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

export const Segmented = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 3px;
  padding: 3px;
  border: 1px solid var(--rule-strong);
  border-radius: 10px;
`;

export const Segment = styled.button<{ $active: boolean }>`
  min-height: 40px;
  border-radius: 7px;
  font-size: 14px;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  background: ${({ $active }) => ($active ? "var(--green)" : "transparent")};
  color: ${({ $active }) => ($active ? "var(--on-green)" : "var(--ink)")};
`;

export const AmountField = styled.div`
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding-bottom: 6px;
  border-bottom: 4px double var(--rule-strong);

  &:focus-within {
    border-bottom-color: var(--green);
  }

  span {
    font-family: var(--font-figures);
    font-size: 22px;
    color: var(--ink-soft);
  }

  input {
    width: 100%;
    min-width: 0;
    border: 0;
    background: transparent;
    font-family: var(--font-figures);
    font-variant-numeric: tabular-nums;
    font-size: 44px;
    font-weight: 500;
    line-height: 1.15;
    color: var(--ink);
  }

  input:focus-visible {
    outline: none;
  }

  input::placeholder {
    color: var(--rule-strong);
  }
`;

export const Legend = styled.p`
  margin-bottom: 8px;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-soft);
`;

export const CategoryChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;

  > span {
    color: var(--ink-soft);
    font-size: 14px;
  }
`;

export const CategoryChip = styled.button<{ $active?: boolean; $dashed?: boolean }>`
  min-height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  font-size: 14px;
  border: 1px ${({ $dashed }) => ($dashed ? "dashed" : "solid")}
    ${({ $active }) => ($active ? "var(--green)" : "var(--rule-strong)")};
  background: ${({ $active }) => ($active ? "var(--green)" : "transparent")};
  color: ${({ $active, $dashed }) =>
    $active ? "var(--on-green)" : $dashed ? "var(--green)" : "var(--ink)"};
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
`;

export const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 0;
`;

export const FieldRow = styled.div`
  display: flex;
  gap: 10px;

  @media (max-width: 359px) {
    flex-direction: column;
  }
`;

export const Label = styled.label`
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-soft);
`;

export const Input = styled.input`
  ${fieldControl}
`;

export const Select = styled.select`
  ${fieldControl}
`;

export const Textarea = styled.textarea`
  ${fieldControl}
  min-height: 64px;
  padding: 10px 12px;
  resize: vertical;
`;

export const Actions = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
`;

export const SubmitButton = styled.button`
  flex: 1;
  min-height: 48px;
  border-radius: 10px;
  background: var(--green);
  color: var(--on-green);
  font-weight: 600;
  font-size: 15px;

  &:disabled {
    opacity: 0.6;
    cursor: progress;
  }
`;

export const DeleteButton = styled.button`
  min-height: 48px;
  padding: 0 16px;
  border-radius: 10px;
  color: var(--red);
  font-weight: 500;

  &:hover {
    background: var(--red-wash);
  }
`;
