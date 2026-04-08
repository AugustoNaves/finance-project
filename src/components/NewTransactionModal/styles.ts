"use client";
import styled from "styled-components";

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
`;

export const Modal = styled.div`
  background: #ffffff;
  border-radius: 12px;
  padding: 32px;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
`;

export const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
`;

export const ModalTitle = styled.h2`
  font-size: 20px;
  font-weight: 700;
  color: #1a1a2e;
`;

export const CloseButton = styled.button`
  background: transparent;
  border: none;
  font-size: 18px;
  color: #6b6b6b;
  cursor: pointer;
  padding: 4px;
  line-height: 1;

  &:hover {
    color: #1a1a2e;
  }
`;

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

export const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

export const Label = styled.label`
  font-size: 13px;
  font-weight: 600;
  color: #6b6b6b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

export const Input = styled.input`
  padding: 12px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  color: #1a1a2e;
  outline: none;
  transition: border-color 0.2s;

  &:focus {
    border-color: #00b37e;
  }
  &::placeholder {
    color: #b0b0b0;
  }
`;

export const TypeSelector = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
`;

export const TypeButton = styled.button<{
  $active: boolean;
  $variant: "income" | "outcome";
}>`
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: 1.5px solid
    ${({ $active, $variant }) =>
      $active ? ($variant === "income" ? "#00b37e" : "#f75a68") : "#e0e0e0"};
  background: ${({ $active, $variant }) =>
    $active ? ($variant === "income" ? "#e6faf3" : "#fdecea") : "transparent"};
  color: ${({ $active, $variant }) =>
    $active ? ($variant === "income" ? "#00b37e" : "#f75a68") : "#6b6b6b"};
`;

export const Select = styled.select`
  padding: 12px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  color: #1a1a2e;
  background: #ffffff;
  outline: none;

  &:focus {
    border-color: #00b37e;
  }
`;

export const SubmitButton = styled.button`
  margin-top: 8px;
  padding: 14px;
  background: #00b37e;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 700;
  color: #ffffff;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #009e6e;
  }
`;
