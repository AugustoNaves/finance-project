// src/components/Header/index.tsx
"use client";
import { Nav, Brand, BrandDot, Actions, NewTransactionButton } from "./styles";

interface HeaderProps {
  onNewTransaction?: () => void;
}

export const Header = ({ onNewTransaction }: HeaderProps) => {
  return (
    <Nav>
      <Brand>
        <BrandDot />
        Finanças
      </Brand>
      <Actions>
        <NewTransactionButton onClick={onNewTransaction}>
          + Nova Transação
        </NewTransactionButton>
      </Actions>
    </Nav>
  );
};
