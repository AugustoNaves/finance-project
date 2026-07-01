"use client";

import { HeaderAction, HeaderContent, HeaderEyebrow, HeaderRoot, HeaderSubtitle, HeaderTitle } from "./styles";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actionLabel,
  onAction,
}: PageHeaderProps) {
  return (
    <HeaderRoot>
      <HeaderContent>
        {eyebrow && <HeaderEyebrow>{eyebrow}</HeaderEyebrow>}
        <HeaderTitle>{title}</HeaderTitle>
        {subtitle && <HeaderSubtitle>{subtitle}</HeaderSubtitle>}
      </HeaderContent>

      {actionLabel && onAction && (
        <HeaderAction type="button" onClick={onAction}>
          {actionLabel}
        </HeaderAction>
      )}
    </HeaderRoot>
  );
}
