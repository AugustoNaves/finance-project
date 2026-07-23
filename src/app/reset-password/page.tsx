"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import {
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

const IconLock = () => (
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
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);

    if (password.length < 8) {
      setMessage({ type: "error", text: "A senha deve ter pelo menos 8 caracteres." });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "As senhas não coincidem." });
      return;
    }

    if (!token) {
      setMessage({ type: "error", text: "Token inválido ou ausente." });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({ type: "error", text: data.error || "Erro ao redefinir senha." });
        return;
      }

      setMessage({
        type: "success",
        text: "Senha redefinida com sucesso. Redirecionando para o login...",
      });

      setTimeout(() => {
        router.push("/login");
      }, 2000);
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
          <FormTitle>Nova senha</FormTitle>
          <FormSubtitle>
            Digite sua nova senha abaixo.
          </FormSubtitle>
        </FormHeader>

        <form onSubmit={handleSubmit}>
          <InputGroup>
            <InputLabel htmlFor="password">Nova senha</InputLabel>
            <InputWrapper>
              <StyledInput
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isSubmitting}
                minLength={8}
                required
              />
              <IconLock />
            </InputWrapper>
          </InputGroup>

          <InputGroup>
            <InputLabel htmlFor="confirm-password">Confirmar senha</InputLabel>
            <InputWrapper>
              <StyledInput
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={isSubmitting}
                minLength={8}
                required
              />
              <IconLock />
            </InputWrapper>
          </InputGroup>

          {message && <FormMessage $variant={message.type}>{message.text}</FormMessage>}

          <SubmitButton type="submit" disabled={isSubmitting || !token}>
            {isSubmitting ? "Redefinindo..." : "Redefinir senha"}
          </SubmitButton>
        </form>
      </FormCard>
    </Wrapper>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
