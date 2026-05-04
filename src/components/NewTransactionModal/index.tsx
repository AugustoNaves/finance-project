"use client";
import { useState, useContext, FormEvent } from "react";
import { TransactionsContext } from "@/contexts/TransactionsContenxt";
import {
  Form,
  FormGroup,
  Label,
  Input,
  TypeSelector,
  TypeButton,
  Select,
  SubmitButton,
} from "./styles";

import { Modal } from "@/components/CustomModal/index";

interface NewTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewTransactionModal = ({
  isOpen,
  onClose,
}: NewTransactionModalProps) => {
  const { addTransaction } = useContext(TransactionsContext);
  const [type, setType] = useState<"income" | "outcome">("income");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [payer, setPayer] = useState<"Eu" | "Namorada">("Eu");

  function handleCreateNewTransaction(event: FormEvent) {
    event.preventDefault();
    const amountAsNumber =
      type === "outcome" ? -Number(amount) : Number(amount);

    addTransaction({
      description,
      amount: amountAsNumber,
      category,
      payer,
    });
    setDescription("");
    setAmount("");
    setCategory("");
    setType("income");
    setPayer("Eu");
    onClose();
  }

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nova Transação">
      <Form onSubmit={handleCreateNewTransaction}>
        <FormGroup>
          <Label>Descrição</Label>
          <Input
            type="text"
            placeholder="Ex: Salário, Aluguel..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </FormGroup>

        <FormGroup>
          <Label>Valor</Label>
          <Input
            type="number"
            placeholder="R$ 0,00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </FormGroup>

        <FormGroup>
          <Label>Tipo</Label>
          <TypeSelector>
            <TypeButton
              $active={type === "income"}
              $variant="income"
              onClick={() => setType("income")}
              type="button"
            >
              📈 Entrada
            </TypeButton>
            <TypeButton
              $active={type === "outcome"}
              $variant="outcome"
              onClick={() => setType("outcome")}
              type="button"
            >
              📉 Saída
            </TypeButton>
          </TypeSelector>
        </FormGroup>

        <FormGroup>
          <Label>Quem pagou?</Label>
          <Select
            value={payer}
            onChange={(e) => setPayer(e.target.value as "Eu" | "Namorada")}
          >
            <option value="Eu">Eu</option>
            <option value="Namorada">Minha Namorada</option>
          </Select>
        </FormGroup>

        <FormGroup>
          <Label>Categoria</Label>
          <Input
            type="text"
            placeholder="Ex: Alimentação, Moradia..."
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
          />
        </FormGroup>
        <SubmitButton type="submit">Salvar Transação</SubmitButton>
      </Form>
    </Modal>
  );
};
