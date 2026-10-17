"use client";

import styled from "styled-components";

export const Field = styled.div`
  display: grid;
  gap: 6px;
  min-width: 0;
`;

export const Label = styled.label`
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-soft);
`;

export const Controls = styled.div`
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 44px;
  align-items: center;
  gap: 8px;

  @media (min-width: 600px) {
    grid-template-columns: 44px minmax(0, 220px) 44px;
  }
`;

export const Display = styled.div`
  position: relative;
  min-width: 0;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 12px;
  border: 1px solid var(--rule-strong);
  border-radius: 10px;
  background: var(--sheet);

  span {
    font-family: var(--font-figures);
    font-size: 17px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  span::first-letter {
    text-transform: uppercase;
  }

  &:hover {
    border-color: var(--green);
  }

  &:focus-within {
    outline: 2px solid var(--green);
    outline-offset: 1px;
  }
`;

export const Input = styled.input`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  font-size: 16px;

  &::-webkit-calendar-picker-indicator {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    cursor: pointer;
  }
`;

export const Step = styled.button`
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: var(--ink-soft);
  font-size: 24px;
  line-height: 1;

  &:hover {
    background: var(--green-wash);
    color: var(--ink);
  }
`;
