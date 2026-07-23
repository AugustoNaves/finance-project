"use client";

import { useState } from "react";
import {
  ForgotLink,
  FormCard,
  FormHeader,
  FormMessage,
  FormSubtitle,
  FormTitle,
  InputGroup,
  InputLabel,
  InputWrapper,
  LogoMark,
  StyledInput,
  SubmitButton,
  Wrapper,
} from "./styles";

const IconMail = () => (
  <svg
    className="input-icon"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M2 7l10 7 10-7" />
  </svg>
);

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({ type: "error", text: data.error || "Erro ao enviar solicitação." });
        return;
      }

      setMessage({
        type: "success",
        text: "Se este email estiver cadastrado, você receberá um link de recuperação em breve.",
      });
      setEmail("");
    } catch {
      setMessage({ type: "error", text: "Erro inesperado. Tente novamente." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Wrapper>
      <FormCard>
        <FormHeader>
          <LogoMark>F</LogoMark>
          <FormTitle>Recuperar senha</FormTitle>
          <FormSubtitle>
            Informe seu email e enviaremos um link para redefinir sua senha.
          </FormSubtitle>
        </FormHeader>

        <form onSubmit={handleSubmit}>
          <InputGroup>
            <InputLabel htmlFor="email">E-mail</InputLabel>
            <InputWrapper>
              <StyledInput
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isSubmitting}
                required
              />
              <IconMail />
            </InputWrapper>
          </InputGroup>

          {message && <FormMessage $variant={message.type}>{message.text}</FormMessage>}

          <SubmitButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Enviando..." : "Enviar link"}
          </SubmitButton>
        </form>

        <ForgotLink href="/login">Voltar para o login</ForgotLink>
      </FormCard>
    </Wrapper>
  );
}
