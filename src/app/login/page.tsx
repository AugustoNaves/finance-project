"use client";

import { useState } from "react";
import {
  GoogleReCaptchaProvider,
  useGoogleReCaptcha,
} from "react-google-recaptcha-v3";
import { FormError } from "@/components/FormError";
import { formatPlainAmount, formatSignedAmount } from "@/utils/formatters";
import {
  Brand,
  BrandMark,
  Column,
  Field,
  Fineprint,
  Footer,
  ForgotLink,
  Form,
  HelpLink,
  Input,
  Label,
  Notebook,
  NotebookAmount,
  NotebookHeader,
  NotebookItem,
  NotebookRow,
  NotebookTotal,
  Notice,
  Page,
  SectionTitle,
  SubmitButton,
  Tagline,
  TextButton,
} from "./style";

const sampleEntries = [
  { description: "Salário", detail: "Receita · 5 out", amount: 4200 },
  { description: "Mercado", detail: "Alimentação · 7 out", amount: -312.4 },
  { description: "Conta de luz", detail: "Moradia · 10 out", amount: -148.9 },
  { description: "Farmácia", detail: "Saúde · 12 out", amount: -56.3 },
];

const sampleBalance = sampleEntries.reduce((total, entry) => total + entry.amount, 0);

function NotebookSample() {
  return (
    <Notebook aria-hidden="true">
      <NotebookHeader>
        <span>Outubro</span>
        <span>Exemplo</span>
      </NotebookHeader>
      {sampleEntries.map((entry) => (
        <NotebookRow key={entry.description}>
          <NotebookItem>
            {entry.description}
            <small>{entry.detail}</small>
          </NotebookItem>
          <NotebookAmount $out={entry.amount < 0}>{formatSignedAmount(entry.amount)}</NotebookAmount>
        </NotebookRow>
      ))}
      <NotebookTotal>
        <span>Sobra do mês</span>
        <strong>{formatPlainAmount(sampleBalance)}</strong>
      </NotebookTotal>
    </Notebook>
  );
}

function FormularioDeLogin() {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const { executeRecaptcha } = useGoogleReCaptcha();

  const title = isRegisterMode ? "Criar conta" : "Entrar";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsSubmitting(true);

    try {
      if (isRegisterMode) {
        const response = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, senha }),
        });
        const data = await response.json();

        if (!response.ok) {
          setMessage({ type: "error", text: data.error || "Não foi possível criar a conta." });
          return;
        }

        setIsRegisterMode(false);
        setSenha("");
        setMessage({
          type: "success",
          text: "Conta criada. Agora entre com seu e-mail e senha.",
        });
        return;
      }

      if (!executeRecaptcha) {
        setMessage({ type: "error", text: "reCAPTCHA ainda não carregou. Tente novamente." });
        return;
      }

      const token = await executeRecaptcha("login");

      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha, recaptchaToken: token }),
      });

      const data = await response.json();

      if (response.ok) {
        window.location.href = "/";
      } else {
        setMessage({ type: "error", text: data.error || "Não foi possível entrar." });
      }
    } catch (error) {
      console.error("Erro ao gerar o token do reCAPTCHA:", error);
      setMessage({ type: "error", text: "Erro inesperado. Tente novamente." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SectionTitle id="auth-title">{title}</SectionTitle>

      <Form onSubmit={handleSubmit} aria-labelledby="auth-title">
        {isRegisterMode && (
          <Field>
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </Field>
        )}

        <Field>
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </Field>

        <Field>
          <Label htmlFor="senha">Senha</Label>
          <Input
            id="senha"
            type="password"
            autoComplete={isRegisterMode ? "new-password" : "current-password"}
            placeholder={isRegisterMode ? "Mínimo de 8 caracteres" : "Sua senha"}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            disabled={isSubmitting}
            minLength={isRegisterMode ? 8 : undefined}
            required
          />
        </Field>

        {!isRegisterMode && <ForgotLink href="/forgot-password">Esqueceu a senha?</ForgotLink>}

        {message?.type === "error" && <FormError message={message.text} />}
        {message?.type === "success" && (
          <Notice role="status" $tone="success">
            {message.text}
          </Notice>
        )}

        <SubmitButton type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Aguarde..." : title}
        </SubmitButton>
      </Form>

      <Footer>
        <span>{isRegisterMode ? "Já tem conta?" : "Não tem conta?"}</span>
        <TextButton
          type="button"
          onClick={() => {
            setIsRegisterMode((current) => !current);
            setMessage(null);
          }}
          disabled={isSubmitting}
        >
          {isRegisterMode ? "Entrar" : "Criar conta"}
        </TextButton>
      </Footer>

      <Fineprint>Login protegido por reCAPTCHA.</Fineprint>
      <HelpLink href="/ajuda" target="_blank" rel="noopener noreferrer">
        Como funciona o Finance App?
        {" "}
        <span className="sr-only">(abre em nova aba)</span>
      </HelpLink>
    </>
  );
}

export default function LoginPage() {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";

  return (
    <GoogleReCaptchaProvider reCaptchaKey={siteKey}>
      <Page>
        <Column>
          <Brand>
            <BrandMark aria-hidden="true">F</BrandMark>
            Finance App
          </Brand>
          <Tagline>Suas contas do mês, num caderno que cabe no bolso.</Tagline>

          <FormularioDeLogin />
        </Column>

        <NotebookSample />
      </Page>
    </GoogleReCaptchaProvider>
  );
}
