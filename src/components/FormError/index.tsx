"use client";

import { Message } from "./styles";

interface FormErrorProps {
  message?: string;
}

export function FormError({ message }: FormErrorProps) {
  if (!message) return null;

  return <Message role="alert">{message}</Message>;
}
