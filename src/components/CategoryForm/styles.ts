"use client";

import styled, { css } from "styled-components";

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 18px;
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

export const Legend = styled.p`
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-soft);
`;

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

export const Input = styled.input`
  ${fieldControl}
`;

export const Select = styled.select`
  ${fieldControl}
`;

export const FieldRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 359px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

export const Segmented = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 3px;
  padding: 3px;
  border: 1px solid var(--rule-strong);
  border-radius: 10px;
`;

export const Segment = styled.label`
  position: relative;
  min-height: 40px;
  display: grid;
  place-items: center;
  padding: 0 4px;
  border-radius: 7px;
  font-size: 14px;
  text-align: center;
  color: var(--ink);
  cursor: pointer;

  input {
    position: absolute;
    inset: 0;
    margin: 0;
    opacity: 0;
    cursor: pointer;
  }

  &:has(input:checked) {
    background: var(--green);
    color: var(--on-green);
    font-weight: 600;
  }

  &:has(input:focus-visible) {
    outline: 2px solid var(--green);
    outline-offset: 2px;
  }
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
