"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { FormError } from "@/components/FormError";
import {
  Brand,
  BrandMark,
  Column,
  Field,
  Footer,
  Form,
  Input,
  Intro,
  Label,
  Notice,
  Page,
  SectionTitle,
  SubmitButton,
  TextLink,
} from "./styles";

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
        text: "Senha redefinida. Redirecionando para o login...",
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
    <Page>
      <Column>
        <Brand>
          <BrandMark aria-hidden="true">F</BrandMark>
          Finance App
        </Brand>

        <SectionTitle>Nova senha</SectionTitle>
        <Intro>Escolha uma senha com pelo menos 8 caracteres.</Intro>

        <Form onSubmit={handleSubmit}>
          <Field>
            <Label htmlFor="password">Nova senha</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo de 8 caracteres"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isSubmitting}
              minLength={8}
              required
            />
          </Field>

          <Field>
            <Label htmlFor="confirm-password">Confirmar senha</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              placeholder="Repita a nova senha"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              disabled={isSubmitting}
              minLength={8}
              required
            />
          </Field>

          {!token && !message && (
            <Notice role="alert" $tone="error">
              Link inválido ou incompleto.{" "}
              <Link href="/forgot-password">Solicite um novo link de redefinição</Link>.
            </Notice>
          )}

          {message?.type === "error" && <FormError message={message.text} />}
          {message?.type === "success" && (
            <Notice role="status" $tone="success">
              {message.text}
            </Notice>
          )}

          <SubmitButton type="submit" disabled={isSubmitting || !token}>
            {isSubmitting ? "Redefinindo..." : "Redefinir senha"}
          </SubmitButton>
        </Form>

        <Footer>
          <TextLink href="/login">Voltar para o login</TextLink>
        </Footer>
      </Column>
    </Page>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
