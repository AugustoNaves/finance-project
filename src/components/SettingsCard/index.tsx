"use client";

import { ReactNode } from "react";
import { Card, Description, Header, Title } from "./styles";

interface SettingsCardProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function SettingsCard({ title, description, children }: SettingsCardProps) {
  return (
    <Card>
      <Header>
        <Title>{title}</Title>
        <Description>{description}</Description>
      </Header>
      {children}
    </Card>
  );
}
