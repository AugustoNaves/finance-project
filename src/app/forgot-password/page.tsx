"use client";

import { useState } from "react";
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
        text: "Se este e-mail estiver cadastrado, você vai receber um link para redefinir a senha.",
      });
      setEmail("");
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
          Finance-app
        </Brand>

        <SectionTitle>Recuperar senha</SectionTitle>
        <Intro>Informe seu e-mail e enviaremos um link para criar uma nova senha.</Intro>

        <Form onSubmit={handleSubmit}>
          <Field>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isSubmitting}
              required
            />
          </Field>

          {message?.type === "error" && <FormError message={message.text} />}
          {message?.type === "success" && (
            <Notice role="status" $tone="success">
              {message.text}
            </Notice>
          )}

          <SubmitButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Enviando..." : "Enviar link"}
          </SubmitButton>
        </Form>

        <Footer>
          <TextLink href="/login">Voltar para o login</TextLink>
        </Footer>
      </Column>
    </Page>
  );
}
