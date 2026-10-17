"use client";

import styled, { css } from "styled-components";

const WIDE = "@media (min-width: 1180px)";

const label = css`
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-soft);
`;

const figures = css`
  font-family: var(--font-figures);
  font-variant-numeric: tabular-nums;
  font-weight: 500;
`;

const control = css`
  width: 100%;
  min-height: 44px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid var(--rule-strong);
  background: var(--sheet);
  color: var(--ink);
  font-size: 15px;
`;

const inlineControl = css`
  min-width: 0;
  min-height: 44px;
  padding: 0 8px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: inherit;

  &:hover {
    border-color: var(--rule);
  }

  &:focus {
    border-color: var(--rule-strong);
    background: var(--sheet);
  }
`;

export const PageContent = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
  max-width: 1000px;
`;

export const Step = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
  padding-top: 20px;
`;

export const StepHead = styled.h2`
  ${label}
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--rule-strong);
`;

export const StepNumber = styled.span`
  ${figures}
  font-size: 15px;
  letter-spacing: 0;
  color: var(--green);
`;

export const Hint = styled.p`
  font-size: 14px;
  line-height: 1.5;
  color: var(--ink-soft);
`;

export const DropZone = styled.label<{ $active: boolean; $busy: boolean }>`
  position: relative;
  display: grid;
  gap: 4px;
  justify-items: center;
  text-align: center;
  padding: 32px 16px;
  border-radius: 10px;
  border: 1px dashed ${({ $active }) => ($active ? "var(--green)" : "var(--rule-strong)")};
  background: ${({ $active }) => ($active ? "var(--green-wash)" : "var(--sheet)")};
  cursor: ${({ $busy }) => ($busy ? "progress" : "pointer")};

  strong {
    font-weight: 600;
    color: var(--green);
  }

  span {
    font-size: 12.5px;
    color: var(--ink-soft);
  }

  input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: inherit;
  }

  &:focus-within {
    outline: 2px solid var(--green);
    outline-offset: 2px;
  }
`;

export const PasswordRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
  align-items: end;

  @media (min-width: 600px) {
    grid-template-columns: minmax(0, 320px) auto;
  }
`;

export const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;

  > span {
    ${label}
  }
`;

export const Input = styled.input`
  ${control}
`;

export const PrimaryButton = styled.button`
  min-height: 44px;
  padding: 0 18px;
  border-radius: 10px;
  background: var(--green);
  color: var(--on-green);
  font-weight: 600;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

export const QuietButton = styled.button`
  min-height: 44px;
  padding: 0 14px;
  border-radius: 10px;
  color: var(--ink-soft);
  font-weight: 500;

  &:hover:not(:disabled) {
    color: var(--ink);
    background: var(--green-wash);
  }

  &:disabled {
    opacity: 0.45;
  }
`;

export const Notice = styled.div<{ $tone: "error" | "warning" | "info" | "success" }>`
  display: grid;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 14px;
  line-height: 1.45;
  color: ${({ $tone }) => ($tone === "error" ? "var(--red)" : "var(--ink)")};
  background: ${({ $tone }) =>
    $tone === "error"
      ? "var(--red-wash)"
      : $tone === "warning"
        ? "var(--amber-wash)"
        : $tone === "success"
          ? "var(--green-wash)"
          : "var(--sheet)"};

  a {
    color: var(--green);
    font-weight: 600;
  }
`;

export const Meta = styled.dl`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;

  @media (min-width: 720px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  div {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  dt {
    font-size: 12px;
    color: var(--ink-soft);
  }

  dd {
    font-size: 15px;
    font-weight: 500;
    overflow-wrap: anywhere;
  }
`;

export const MonthRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
  align-items: center;

  @media (min-width: 600px) {
    grid-template-columns: minmax(0, 220px) minmax(0, 1fr);
    align-items: end;
  }
`;

export const Check = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  font-size: 14px;
  color: var(--ink);
  cursor: pointer;

  input {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    accent-color: var(--green);
  }
`;

export const Lines = styled.ul`
  list-style: none;
`;

const wideColumns = css`
  grid-template-columns: 36px 136px minmax(0, 1fr) 48px 120px 200px 116px;
  column-gap: 10px;
`;

export const LinesHead = styled.li`
  display: none;

  ${WIDE} {
    ${wideColumns}
    ${label}
    display: grid;
    padding: 0 0 8px;
    border-bottom: 1px solid var(--rule-strong);

    span:last-child {
      text-align: right;
    }
  }
`;

export const Line = styled.li<{ $excluded: boolean }>`
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) auto;
  grid-template-areas:
    "check desc amount"
    ". info info"
    ". cat cat"
    ". extra extra";
  column-gap: 8px;
  row-gap: 4px;
  padding: 8px 0 10px;
  border-bottom: 1px solid var(--rule);
  color: ${({ $excluded }) => ($excluded ? "var(--ink-soft)" : "var(--ink)")};

  ${WIDE} {
    ${wideColumns}
    grid-template-areas:
      "check date desc parcel type cat amount"
      ". . flags flags extra extra extra";
    align-items: center;
    row-gap: 0;
  }
`;

export const LineCheck = styled.label`
  grid-area: check;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  cursor: pointer;

  input {
    width: 18px;
    height: 18px;
    accent-color: var(--green);
  }
`;

export const DescriptionInput = styled.input`
  ${inlineControl}
  grid-area: desc;
  width: 100%;
  font-weight: 500;
  font-size: 15px;
`;

export const AmountCell = styled.span<{ $outcome: boolean }>`
  grid-area: amount;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  ${figures}
  font-size: 16px;
  color: ${({ $outcome }) => ($outcome ? "var(--red)" : "var(--ink)")};
`;

export const Info = styled.div`
  grid-area: info;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  min-width: 0;

  ${WIDE} {
    display: contents;
  }
`;

export const DateInput = styled.input`
  ${inlineControl}
  grid-area: date;
  min-height: 36px;
  font-size: 12.5px;
  color: var(--ink-soft);

  ${WIDE} {
    min-height: 44px;
    font-size: 14px;
  }
`;

export const Parcel = styled.span`
  grid-area: parcel;
  ${figures}
  font-size: 12.5px;
  color: var(--ink-soft);

  &[data-empty="true"] {
    display: none;
  }

  ${WIDE} {
    font-size: 14px;

    &[data-empty="true"] {
      display: block;
    }
  }
`;

export const Flags = styled.span`
  grid-area: flags;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
`;

export const Tag = styled.span<{ $tone: "muted" | "amber" | "red" | "green" }>`
  font-size: 12.5px;
  font-weight: ${({ $tone }) => ($tone === "red" || $tone === "amber" ? 600 : 400)};
  color: ${({ $tone }) =>
    $tone === "red"
      ? "var(--red)"
      : $tone === "amber"
        ? "var(--amber)"
        : $tone === "green"
          ? "var(--green)"
          : "var(--ink-soft)"};
`;

export const CategoryCell = styled.div`
  grid-area: cat;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 116px);
  gap: 8px;

  ${WIDE} {
    display: contents;
  }
`;

export const CategoryPick = styled.span`
  position: relative;
  display: flex;
  align-items: center;
  min-width: 0;

  ${WIDE} {
    grid-area: cat;
  }
`;

export const Dot = styled.span<{ $color: string | null }>`
  position: absolute;
  left: 10px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color ?? "var(--rule-strong)"};
  pointer-events: none;
`;

export const Select = styled.select<{ $missing?: boolean }>`
  ${control}
  min-width: 0;
  padding: 0 8px;
  font-size: 14px;
  border-color: ${({ $missing }) => ($missing ? "var(--red)" : "var(--rule-strong)")};
`;

export const CategorySelect = styled(Select)`
  padding-left: 26px;
`;

export const TypeSelect = styled(Select)`
  ${WIDE} {
    grid-area: type;
  }
`;

export const Extra = styled.div`
  grid-area: extra;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0 16px;

  &:empty {
    display: none;
  }

  ${Check} {
    font-size: 13px;
    color: var(--ink-soft);
  }
`;

export const LinkButton = styled.button`
  min-height: 44px;
  font-size: 13px;
  font-weight: 500;
  color: var(--green);
  text-align: left;
`;

export const Totals = styled.dl`
  display: grid;
  gap: 2px;
  padding-top: 4px;

  div {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: baseline;
    gap: 12px;
    min-height: 36px;
    padding: 6px 0;
  }

  dt {
    font-size: 14px;
    color: var(--ink-soft);
  }

  dd {
    ${figures}
    font-size: 17px;
    text-align: right;
  }

  div[data-total] dt {
    color: var(--ink);
    font-weight: 500;
  }

  div[data-total] dd {
    font-size: 22px;
    padding-bottom: 4px;
    border-bottom: 4px double currentColor;
  }

  dd[data-tone="red"] {
    color: var(--red);
  }

  @media (min-width: 720px) {
    margin-left: auto;
    width: min(100%, 380px);
  }
`;

export const Footer = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
  padding-top: 8px;

  p {
    font-size: 13px;
    color: var(--ink-soft);
  }

  p[data-pending] {
    color: var(--red);
    font-weight: 500;
  }

  div {
    display: flex;
    flex-direction: column-reverse;
    gap: 8px;
  }

  @media (min-width: 600px) {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;

    div {
      flex-direction: row;
    }
  }
`;

export const Quiet = styled.p`
  padding: 14px 0;
  font-size: 14px;
  color: var(--ink-soft);
`;

export const Batches = styled.ul`
  list-style: none;
`;

export const Batch = styled.li`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas:
    "main total"
    "main undo";
  column-gap: 12px;
  align-items: center;
  min-height: 58px;
  padding: 8px 0;
  border-bottom: 1px solid var(--rule);

  @media (min-width: 720px) {
    grid-template-columns: minmax(0, 1fr) auto auto;
    grid-template-areas: "main total undo";
    column-gap: 20px;
  }
`;

export const BatchMain = styled.div`
  grid-area: main;
  display: flex;
  flex-direction: column;
  min-width: 0;

  strong {
    font-weight: 500;
  }

  strong::first-letter {
    text-transform: uppercase;
  }

  span {
    font-size: 12.5px;
    color: var(--ink-soft);
    overflow-wrap: anywhere;
  }
`;

export const BatchTotal = styled.span`
  grid-area: total;
  ${figures}
  font-size: 16px;
  text-align: right;
  color: var(--red);
`;

export const UndoButton = styled.button`
  grid-area: undo;
  justify-self: end;
  min-height: 44px;
  padding: 0 4px;
  font-size: 14px;
  font-weight: 500;
  color: var(--red);
`;
