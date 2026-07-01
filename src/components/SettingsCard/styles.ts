"use client";

import styled from "styled-components";

const colors = {
  navyMid: "#161b27",
  textMuted: "#8892a4",
  border: "rgba(255, 255, 255, 0.07)",
};

export const Card = styled.article`
  position: relative;
  overflow: hidden;
  padding: 22px;
  background: ${colors.navyMid};
  border: 1px solid ${colors.border};
  border-radius: 18px;
  box-shadow: 0 22px 60px rgba(0, 0, 0, 0.24);

  &::after {
    content: "";
    position: absolute;
    width: 130px;
    height: 130px;
    right: -68px;
    top: -78px;
    border-radius: 50%;
    background: #00c48c;
    opacity: 0.07;
  }
`;

export const Header = styled.header`
  position: relative;
  z-index: 1;
  display: grid;
  gap: 8px;
  margin-bottom: 18px;
`;

export const Title = styled.h2`
  color: #ffffff;
  font-family: var(--font-syne), sans-serif;
  font-size: 1.22rem;
  font-weight: 700;
  letter-spacing: -0.04em;
`;

export const Description = styled.p`
  color: ${colors.textMuted};
  font-size: 0.9rem;
  line-height: 1.55;
`;
