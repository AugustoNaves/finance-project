"use client";

import styled from "styled-components";

const colors = {
  textMuted: "#8892a4",
  border: "rgba(255, 255, 255, 0.07)",
};

export const ChartFrame = styled.div`
  width: 100%;
  min-height: 280px;
`;

export const ChartEmpty = styled.p`
  padding: 44px 22px;
  border: 1px dashed ${colors.border};
  border-radius: 14px;
  color: ${colors.textMuted};
  text-align: center;
`;
