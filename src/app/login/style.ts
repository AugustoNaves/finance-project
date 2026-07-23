import Link from "next/link";
import styled, { keyframes, createGlobalStyle } from "styled-components";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const colors = {
  navy: "#0d1117",
  navyMid: "#161b27",
  navyLight: "#1e2535",
  green: "#00c48c",
  greenDark: "#00a576",
  greenGlow: "rgba(0, 196, 140, 0.25)",
  blue: "#0ea5e9",
  blueGlow: "rgba(14, 165, 233, 0.15)",
  white: "#ffffff",
  textMuted: "#8892a4",
  textLight: "#c9d1e0",
  border: "rgba(255,255,255,0.07)",
  glass: "rgba(255,255,255,0.04)",
};

// ─── Animations ───────────────────────────────────────────────────────────────
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const floatCard = keyframes`
  0%, 100% { transform: translateY(0px) rotate(-2deg); }
  50%       { transform: translateY(-10px) rotate(-2deg); }
`;

const floatCalendar = keyframes`
  0%, 100% { transform: translateY(0px) rotate(3deg); }
  50%       { transform: translateY(-8px) rotate(3deg); }
`;

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 20px ${colors.greenGlow}; }
  50%       { box-shadow: 0 0 40px rgba(0, 196, 140, 0.45); }
`;

const shimmer = keyframes`
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
`;

// ─── Global Style (inject Google Font) ───────────────────────────────────────
export const LoginGlobalStyle = createGlobalStyle`
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
`;

// ─── Page Wrapper ─────────────────────────────────────────────────────────────
export const WrapperLogin = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: ${colors.navy};
  background-image:
    radial-gradient(
      ellipse 80% 60% at 70% 50%,
      rgba(0, 196, 140, 0.07) 0%,
      transparent 60%
    ),
    radial-gradient(
      ellipse 60% 50% at 10% 80%,
      rgba(14, 165, 233, 0.06) 0%,
      transparent 55%
    );
  font-family: var(--font-dm-sans), sans-serif;
  overflow: hidden;
  position: relative;
`;

// ─── Layout Split ─────────────────────────────────────────────────────────────
export const LoginLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  max-width: 980px;
  width: 95%;
  gap: 0;
  position: relative;
  z-index: 1;
  animation: ${fadeUp} 0.7s ease both;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

// ─── Left: Floating Decorative Panel ─────────────────────────────────────────
export const DecorativePanel = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 32px;
  position: relative;
  gap: 24px;

  @media (max-width: 720px) {
    display: none;
  }
`;

export const BrandMark = styled.div`
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: linear-gradient(135deg, ${colors.green}, ${colors.blue});
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-dm-sans), sans-serif;
  font-weight: 800;
  font-size: 22px;
  color: #fff;
  animation: ${pulseGlow} 3s ease-in-out infinite;
  margin-bottom: 8px;
`;

export const DecorativeTitle = styled.h2`
  font-family: var(--font-dm-sans), sans-serif;
  font-size: 1.75rem;
  font-weight: 700;
  color: ${colors.white};
  text-align: center;
  line-height: 1.3;

  span {
    background: linear-gradient(90deg, ${colors.green}, ${colors.blue});
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
`;

export const DecorativeSubtitle = styled.p`
  color: ${colors.textMuted};
  font-size: 0.875rem;
  text-align: center;
  line-height: 1.6;
  max-width: 220px;
`;

// ─── Floating credit card widget ──────────────────────────────────────────────
export const FloatingCard = styled.div`
  background: linear-gradient(135deg, ${colors.green}, #00a5c8);
  border-radius: 16px;
  padding: 20px 24px;
  width: 200px;
  animation: ${floatCard} 5s ease-in-out infinite;
  box-shadow: 0 20px 60px rgba(0, 196, 140, 0.3);
  position: relative;
  overflow: hidden;

  &::after {
    content: "";
    position: absolute;
    width: 120px;
    height: 120px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.07);
    top: -30px;
    right: -30px;
  }

  .card-chip {
    width: 28px;
    height: 20px;
    background: rgba(255, 255, 255, 0.35);
    border-radius: 4px;
    margin-bottom: 20px;
  }

  .card-number {
    font-family: var(--font-dm-sans), sans-serif;
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.8);
    letter-spacing: 3px;
  }

  .card-label {
    font-size: 0.65rem;
    color: rgba(255, 255, 255, 0.6);
    margin-top: 8px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
`;

// ─── Floating balance widget ──────────────────────────────────────────────────
export const BalanceWidget = styled.div`
  background: ${colors.navyLight};
  border: 1px solid ${colors.border};
  border-radius: 14px;
  padding: 16px 20px;
  width: 180px;
  align-self: flex-end;

  .balance-label {
    font-size: 0.7rem;
    color: ${colors.textMuted};
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 6px;
  }

  .balance-value {
    font-family: var(--font-dm-sans), sans-serif;
    font-size: 1.2rem;
    font-weight: 700;
    color: ${colors.green};
  }

  .balance-trend {
    font-size: 0.72rem;
    color: ${colors.green};
    margin-top: 4px;
  }
`;

export const FloatingCalendar = styled.div`
  background: ${colors.navyLight};
  border: 1px solid ${colors.border};
  border-radius: 14px;
  padding: 12px 16px;
  width: 150px;
  align-self: flex-start;
  animation: ${floatCalendar} 6s ease-in-out infinite;

  .cal-month {
    font-size: 0.7rem;
    color: ${colors.green};
    font-weight: 600;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .cal-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 3px;

    span {
      font-size: 0.6rem;
      color: ${colors.textMuted};
      text-align: center;
      line-height: 1.8;
      border-radius: 50%;

      &.today {
        background: ${colors.green};
        color: #fff;
        font-weight: 700;
      }
    }
  }
`;

// ─── Right: Form Card ─────────────────────────────────────────────────────────
export const FormCard = styled.div`
  background: ${colors.navyMid};
  border: 1px solid ${colors.border};
  border-radius: 24px;
  padding: 48px 40px;
  display: flex;
  flex-direction: column;
  gap: 0;
  backdrop-filter: blur(20px);
  box-shadow:
    0 0 0 1px ${colors.border},
    0 40px 80px rgba(0, 0, 0, 0.5);
  animation: ${fadeUp} 0.7s 0.1s ease both;

  @media (max-width: 480px) {
    padding: 36px 24px;
    border-radius: 16px;
  }
`;

// ─── Form Header ──────────────────────────────────────────────────────────────
export const FormHeader = styled.div`
  margin-bottom: 32px;
`;

export const LogoMark = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, ${colors.green}, ${colors.blue});
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-dm-sans), sans-serif;
  font-weight: 800;
  font-size: 18px;
  color: #fff;
  margin-bottom: 20px;
`;

export const FormTitle = styled.h1`
  font-family: var(--font-dm-sans), sans-serif;
  font-size: 1.75rem;
  font-weight: 700;
  color: ${colors.white};
  margin-bottom: 6px;
  letter-spacing: -0.02em;
`;

export const FormSubtitle = styled.p`
  color: ${colors.textMuted};
  font-size: 0.875rem;
  line-height: 1.5;
`;

// ─── Form Element ─────────────────────────────────────────────────────────────
export const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 100% !important;
`;

// ─── Input Group ─────────────────────────────────────────────────────────────
export const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

export const InputLabel = styled.label`
  font-size: 0.78rem;
  font-weight: 500;
  color: ${colors.textLight};
  letter-spacing: 0.03em;
  text-transform: uppercase;
`;

export const InputWrapper = styled.div`
  position: relative;

  svg.input-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: ${colors.textMuted};
    width: 16px;
    height: 16px;
    pointer-events: none;
    transition: color 0.2s;
  }
`;

export const StyledInput = styled.input`
  width: 100%;
  padding: 13px 14px 13px 42px;
  background: ${colors.navyLight};
  border: 1px solid ${colors.border};
  border-radius: 10px;
  color: ${colors.white};
  font-family: var(--font-dm-sans), sans-serif;
  font-size: 0.9rem;
  outline: none;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;

  &::placeholder {
    color: ${colors.textMuted};
  }

  &:hover {
    border-color: rgba(255, 255, 255, 0.15);
  }

  &:focus {
    border-color: ${colors.green};
    box-shadow: 0 0 0 3px ${colors.greenGlow};

    ~ svg.input-icon,
    & + svg.input-icon {
      color: ${colors.green};
    }
  }

  /* Fix autofill bg */
  &:-webkit-autofill {
    -webkit-box-shadow: 0 0 0 40px ${colors.navyLight} inset;
    -webkit-text-fill-color: ${colors.white};
  }
`;

// ─── Forgot Password ─────────────────────────────────────────────────────────
export const ForgotLink = styled(Link)`
  font-size: 0.78rem;
  color: ${colors.green};
  text-decoration: none;
  align-self: flex-end;
  margin-top: -8px;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.75;
  }
`;

// ─── Submit Button ────────────────────────────────────────────────────────────
export const SubmitButton = styled.button`
  margin-top: 8px;
  padding: 14px;
  background: linear-gradient(90deg, ${colors.green} 0%, #00b8d9 100%);
  background-size: 200% auto;
  border: none;
  border-radius: 10px;
  color: #fff;
  font-family: var(--font-dm-sans), sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  cursor: pointer;
  transition:
    background-position 0.4s,
    transform 0.15s,
    box-shadow 0.2s;
  box-shadow: 0 4px 20px rgba(0, 196, 140, 0.3);

  &:hover {
    background-position: right center;
    box-shadow: 0 6px 28px rgba(0, 196, 140, 0.45);
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.65;
    transform: none;
    box-shadow: none;
  }

  /* shimmer on hover via pseudo */
  position: relative;
  overflow: hidden;

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      100deg,
      transparent 20%,
      rgba(255, 255, 255, 0.15) 50%,
      transparent 80%
    );
    background-size: 200% auto;
    opacity: 0;
    transition: opacity 0.2s;
  }

  &:hover::after {
    opacity: 1;
    animation: ${shimmer} 1s linear infinite;
  }
`;

// ─── Divider ─────────────────────────────────────────────────────────────────
export const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 8px 0;

  &::before,
  &::after {
    content: "";
    flex: 1;
    height: 1px;
    background: ${colors.border};
  }

  span {
    font-size: 0.72rem;
    color: ${colors.textMuted};
    white-space: nowrap;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
`;

// ─── Footer Note ──────────────────────────────────────────────────────────────
export const FormFooter = styled.p`
  text-align: center;
  font-size: 0.8rem;
  color: ${colors.textMuted};
  margin-top: 4px;

  a {
    color: ${colors.green};
    text-decoration: none;
    font-weight: 500;

    &:hover {
      text-decoration: underline;
    }
  }
`;

export const FooterButton = styled.button`
  border: 0;
  background: transparent;
  color: ${colors.green};
  cursor: pointer;
  font: inherit;
  font-weight: 500;
  padding: 0;

  &:hover {
    text-decoration: underline;
  }
`;

export const FormMessage = styled.p<{ $variant: "error" | "success" }>`
  border: 1px solid
    ${({ $variant }) =>
      $variant === "error" ? "rgba(248, 113, 113, 0.35)" : "rgba(0, 196, 140, 0.35)"};
  border-radius: 10px;
  background: ${({ $variant }) =>
    $variant === "error" ? "rgba(248, 113, 113, 0.09)" : "rgba(0, 196, 140, 0.09)"};
  color: ${({ $variant }) => ($variant === "error" ? "#fecaca" : colors.textLight)};
  font-size: 0.82rem;
  line-height: 1.4;
  padding: 10px 12px;
`;

// ─── Security Badge ───────────────────────────────────────────────────────────
export const SecurityBadge = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 16px;
  font-size: 0.72rem;
  color: ${colors.textMuted};

  svg {
    width: 13px;
    height: 13px;
    color: ${colors.green};
  }
`;
