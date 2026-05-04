"use client";

import { useState } from "react";
import {
  GoogleReCaptchaProvider,
  useGoogleReCaptcha,
} from "react-google-recaptcha-v3";

function FormularioDeLogin() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const { executeRecaptcha } = useGoogleReCaptcha();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!executeRecaptcha) {
      console.log("Aguarde, reCAPTCHA carregando...");
      return;
    }

    try {
      const token = await executeRecaptcha("login");
      console.log("Token gerado com sucesso:", token);

      const dadosParaEnviar = {
        email: email,
        senha: senha,
        recaptchaToken: token,
      };

      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dadosParaEnviar),
      });

      const data = await response.json();

      if (response.ok) {
        window.location.href = "/";
      } else {
        alert(`Bloqueado: ${data.error}`);
      }
    } catch (error) {
      console.error("Erro ao gerar o token do reCAPTCHA:", error);
    }
  };

  return (
    <form
      onSubmit={handleLogin}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        maxWidth: "300px",
      }}
    >
      <input
        type="email"
        placeholder="E-mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Senha"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        required
      />
      <button type="submit">Entrar</button>
    </form>
  );
}
export default function LoginPage() {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";

  return (
    <GoogleReCaptchaProvider reCaptchaKey={siteKey} useEnterprise={true}>
      <div style={{ padding: "50px" }}>
        <h1>Login Seguro</h1>
        <FormularioDeLogin />
      </div>
    </GoogleReCaptchaProvider>
  );
}
