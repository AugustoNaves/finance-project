// src/components/Dashboard/index.tsx
import {
  Container,
  CardsGrid,
  Card,
  CardLabel,
  CardValue,
  CardIcon,
} from "./styled";

const CARDS = [
  {
    label: "Saldo Atual",
    value: "R$ 2.500,00",
    icon: "💰",
    type: "balance" as const,
  },
  {
    label: "Receitas do Mês",
    value: "R$ 4.000,00",
    icon: "📈",
    type: "income" as const,
  },
  {
    label: "Despesas do Mês",
    value: "R$ 1.500,00",
    icon: "📉",
    type: "expense" as const,
  },
];

export const Dashboard = () => {
  return (
    <Container>
      <CardsGrid>
        {CARDS.map((card) => (
          <Card key={card.label} $type={card.type}>
            <CardIcon>{card.icon}</CardIcon>
            <CardLabel>{card.label}</CardLabel>
            <CardValue $type={card.type}>{card.value}</CardValue>
          </Card>
        ))}
      </CardsGrid>
    </Container>
  );
};
