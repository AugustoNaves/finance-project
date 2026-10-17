"use client";

import styled from "styled-components";

export const Bar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 4px 0;

  @media (min-width: 960px) {
    justify-content: flex-start;
  }
`;

export const Title = styled.h1`
  font-family: var(--font-figures);
  font-weight: 500;
  font-size: 21px;
  line-height: 1.2;
  text-align: center;

  &::first-letter {
    text-transform: uppercase;
  }

  @media (min-width: 960px) {
    font-size: 28px;
    order: -1;
    margin-right: 12px;
  }
`;

export const Step = styled.button`
  width: 44px;
  height: 44px;
  flex-shrink: 0;
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
