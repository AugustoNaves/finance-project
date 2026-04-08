"use client";
import { useState, useContext, FormEvent } from "react";
import { TransactionsContext } from "@/contexts/TransactionsContenxt"; // Importando o contexto
import {
  Overlay,
  Modal,
  ModalHeader,
  ModalTitle,
  CloseButton,
  Form,
  FormGroup,
  Label,
  Input,
  TypeSelector,
  TypeButton,
  Select,
  SubmitButton,
} from "./styles";

interface NewTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewTransactionModal = ({
  isOpen,
  onClose,
}: NewTransactionModalProps) => {
  // Puxando a função de adicionar transação lá do nosso contexto
  const { addTransaction } = useContext(TransactionsContext);

  // Estados para cada campo do formulário
  const [type, setType] = useState<"income" | "outcome">("income");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [payer, setPayer] = useState<"Eu" | "Namorada">("Eu");

  // A FUNÇÃO DO ONSUBMIT
  function handleCreateNewTransaction(event: FormEvent) {
    event.preventDefault(); // Impede a página de recarregar!

    // Garantindo que o valor fique negativo se for saída
    const amountAsNumber =
      type === "outcome" ? -Number(amount) : Number(amount);

    // Mandando os dados para a nossa lista global
    addTransaction({
      description,
      amount: amountAsNumber,
      category,
      payer,
    });

    // Limpando os campos após salvar
    setDescription("");
    setAmount("");
    setCategory("");
    setType("income");
    setPayer("Eu");

    // Fechando o modal
    onClose();
  }

  if (!isOpen) return null;

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>Nova Transação</ModalTitle>
          <CloseButton onClick={onClose}>✕</CloseButton>
        </ModalHeader>

        {/* Aqui ligamos a função ao envio do formulário */}
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
                type="button" // Essencial para este botão não disparar o form acidentalmente
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

          {/* Como esse botão é type="submit", clicar nele aciona o form.onSubmit automaticamente */}
          <SubmitButton type="submit">Salvar Transação</SubmitButton>
        </Form>
      </Modal>
    </Overlay>
  );
};
