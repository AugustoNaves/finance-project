"use client";

import { useState } from "react";
import {
  GoogleReCaptchaProvider,
  useGoogleReCaptcha,
} from "react-google-recaptcha-v3";
import {
  LoginGlobalStyle,
  WrapperLogin,
  LoginLayout,
  DecorativePanel,
  BrandMark,
  DecorativeTitle,
  DecorativeSubtitle,
  FloatingCard,
  BalanceWidget,
  FloatingCalendar,
  FormCard,
  FormHeader,
  LogoMark,
  FormTitle,
  FormSubtitle,
  StyledForm,
  InputGroup,
  InputLabel,
  InputWrapper,
  StyledInput,
  ForgotLink,
  SubmitButton,
  Divider,
  FormFooter,
  FooterButton,
  FormMessage,
  SecurityBadge,
} from "./style";

// ─── Inline SVG Icons (sem deps extras) ──────────────────────────────────────
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

const IconUser = () => (
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
    <path d="M20 21a8 8 0 0 0-16 0" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const IconShield = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

// ─── Decorative floating widgets ──────────────────────────────────────────────
const days = ["S", "T", "Q", "Q", "S", "S", "D"];
const calNumbers = [
  "",
  "",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "20",
  "21",
  "22",
  "23",
  "24",
  "25",
  "26",
  "27",
  "28",
  "29",
  "30",
];

function SideWidgets() {
  return (
    <>
      <FloatingCalendar>
        <div className="cal-month">Maio 2026</div>
        <div className="cal-grid">
          {days.map((d, i) => (
            <span key={`h-${i}`} style={{ fontWeight: 600, color: "#5a6680" }}>
              {d}
            </span>
          ))}
          {calNumbers.map((n, i) => (
            <span key={`d-${i}`} className={n === "4" ? "today" : ""}>
              {n}
            </span>
          ))}
        </div>
      </FloatingCalendar>

      <FloatingCard>
        <div className="card-chip" />
        <div className="card-number">•••• 4289</div>
        <div className="card-label">Finanças Pro</div>
      </FloatingCard>

      <BalanceWidget>
        <div className="balance-label">Saldo Total</div>
        <div className="balance-value">R$ 4.850,00</div>
        <div className="balance-trend">↑ +12% este mês</div>
      </BalanceWidget>
    </>
  );
}

// ─── Form (lógica preservada integralmente) ───────────────────────────────────
function FormularioDeLogin() {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const { executeRecaptcha } = useGoogleReCaptcha();

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
          text: "Conta criada com sucesso. Agora entre com seu e-mail e senha.",
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
    <StyledForm onSubmit={handleSubmit}>
      {isRegisterMode && (
        <InputGroup>
          <InputLabel htmlFor="name">Nome</InputLabel>
          <InputWrapper>
            <StyledInput
              id="name"
              type="text"
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              required
            />
            <IconUser />
          </InputWrapper>
        </InputGroup>
      )}

      <InputGroup>
        <InputLabel htmlFor="email">E-mail</InputLabel>
        <InputWrapper>
          <StyledInput
            id="email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            required
          />
          <IconMail />
        </InputWrapper>
      </InputGroup>

      <InputGroup>
        <InputLabel htmlFor="senha">Senha</InputLabel>
        <InputWrapper>
          <StyledInput
            id="senha"
            type="password"
            placeholder="••••••••"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            disabled={isSubmitting}
            minLength={isRegisterMode ? 8 : undefined}
            required
          />
          <IconLock />
        </InputWrapper>
      </InputGroup>

      {!isRegisterMode && <ForgotLink href="/forgot-password">Esqueceu a senha?</ForgotLink>}

      {message && <FormMessage $variant={message.type}>{message.text}</FormMessage>}

      <SubmitButton type="submit" disabled={isSubmitting}>
        {isSubmitting
          ? "Aguarde..."
          : isRegisterMode
            ? "Criar conta"
            : "Entrar na conta"}
      </SubmitButton>

      <Divider>
        <span>protegido por reCAPTCHA</span>
      </Divider>

      <FormFooter>
        {isRegisterMode ? "Já tem uma conta? " : "Não tem uma conta? "}
        <FooterButton
          type="button"
          onClick={() => {
            setIsRegisterMode((current) => !current);
            setMessage(null);
          }}
          disabled={isSubmitting}
        >
          {isRegisterMode ? "Entrar" : "Cadastre-se"}
        </FooterButton>
      </FormFooter>

      <SecurityBadge>
        <IconShield />
        Conexão criptografada e segura
      </SecurityBadge>
    </StyledForm>
  );
}

// ─── Page Root ────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";

  return (
    <GoogleReCaptchaProvider reCaptchaKey={siteKey}>
      <LoginGlobalStyle />
      <WrapperLogin>
        <LoginLayout>
          {/* Painel decorativo — oculto em mobile */}
          <DecorativePanel>
            <BrandMark>F</BrandMark>
            <DecorativeTitle>
              Suas finanças,
              <br />
              <span>sob controle.</span>
            </DecorativeTitle>
            <DecorativeSubtitle>
              Gerencie receitas, despesas e saldo com clareza e segurança.
            </DecorativeSubtitle>
            <SideWidgets />
          </DecorativePanel>

          {/* Card do formulário */}
          <FormCard>
            <FormHeader>
              <LogoMark>F</LogoMark>
              <FormTitle>Bem-vindo</FormTitle>
              <FormSubtitle>
                Acesse ou crie sua conta para gerenciar suas finanças com dados isolados.
              </FormSubtitle>
            </FormHeader>

            <FormularioDeLogin />
          </FormCard>
        </LoginLayout>
      </WrapperLogin>
    </GoogleReCaptchaProvider>
  );
}
