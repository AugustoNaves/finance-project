# Uphill — SPEC NNN

**Estado:** 🔼 subindo | ⛰️ no topo

## 1. Guarda de escopo

O que esta spec pede, em uma frase: <…>

| Tentação | Por que fica de fora |
|---|---|
| <algo que seria "legal" fazer junto> | <não é exigido por nenhum CA / pertence à spec X / está em "Fora de escopo" da visão geral> |

## 2. Incógnitas

Toda dúvida técnica entra aqui e só sai com evidência.

| # | Pergunta | Como foi resolvida | Evidência | Status |
|---|---|---|---|---|
| I1 | <dúvida> | <doc lida / código inspecionado / experimento> | <URL, caminho ou comando + saída resumida> | ✅ resolvida / ⚠️ risco aceito (plano B: …) |

## 3. Decisões de implementação

| # | Decisão | Motivo |
|---|---|---|
| U1 | <escolha concreta> | <por quê> |

## 4. Plano por task

### T1 — <título>

**Arquivos**

| Arquivo | Ação |
|---|---|
| `<caminho>` | criar / alterar |

**Passo a passo**

1. <passo concreto>

**Assinaturas e trechos-chave**

```ts
// o que não pode ser deixado para adivinhar na descida
```

**Casos de erro**

| Situação | Comportamento esperado |
|---|---|
| <entrada inválida / falha externa> | <o que o código faz> |

**Testes**

| ID | Caso | Entrada | Esperado |
|---|---|---|---|
| T1.1 | <caminho feliz> | <…> | <…> |
| T1.2 | <erro> | <…> | <…> |

**Pronto quando**

- `<comando>` passa

## 5. Cobertura dos critérios de aceite

| CA | Testes que o provam |
|---|---|
| CA1 | T1.1, T1.2 |

## 6. Fora de escopo (anotado)

Ideias que surgiram na subida e **não** serão feitas nesta spec.

- <ideia> — <para onde vai, se for o caso>

## 7. Questões para o orquestrador

Mudanças de contrato, de protocolo ou de escopo que esta spec não pode decidir sozinha.

- <questão> — ou "nenhuma"

## 8. Checklist do topo

- [ ] Nenhuma incógnita aberta (todas ✅ ou ⚠️ com plano B)
- [ ] Toda task tem arquivos, passo a passo, casos de erro e testes
- [ ] Todo CA tem pelo menos um teste automático
- [ ] Nada do plano contraria `docs/specs/contratos.md`, `docs/specs/visao-geral.md` nem as regras de `AGENTS.md`
- [ ] Nada do plano está na lista "Fora de escopo" da spec ou da visão geral
