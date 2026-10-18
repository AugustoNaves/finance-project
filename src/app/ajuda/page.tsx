"use client";

import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";
import {
  Brand,
  BrandMark,
  Faq,
  Figure,
  Header,
  HeaderLink,
  Index,
  Lead,
  Note,
  Page,
  Section,
  SectionBody,
  Steps,
  Title,
  Wrap,
} from "./styles";

interface GuideSection {
  id: string;
  title: string;
  image?: { src: string; alt: string };
  body: ReactNode;
}

const sections: GuideSection[] = [
  {
    id: "instalar",
    title: "Instale no celular",
    body: (
      <>
        <p>O Finance App funciona no navegador, mas fica melhor instalado: abre em tela cheia, com ícone na tela inicial.</p>
        <Steps>
          <li>
            <strong>iPhone:</strong> abra o app no Safari, toque em Compartilhar e depois em <em>Adicionar à Tela de Início</em>.
          </li>
          <li>
            <strong>Android:</strong> abra no Chrome, toque no menu ⋮ e depois em <em>Instalar app</em>.
          </li>
          <li>Entre com seu e-mail e senha. A sessão fica salva por 30 dias neste aparelho.</li>
        </Steps>
        <Note>Seus dados ficam no servidor, não no aparelho. Sem internet, o app mostra um aviso de “Sem conexão”.</Note>
      </>
    ),
  },
  {
    id: "navegar",
    title: "Saiba onde fica cada coisa",
    image: { src: "/ajuda/mais.jpg", alt: "Folha “Mais” aberta, com Importar fatura, Categorias e regras, Investimentos, Relatórios, Configurações e Sair" },
    body: (
      <>
        <p>A barra no pé da tela tem o que você usa todo dia:</p>
        <Steps>
          <li>
            <strong>Mês</strong>: como está o mês.
          </li>
          <li>
            <strong>Lançamentos</strong>: todos os registros, para buscar e corrigir.
          </li>
          <li>
            <strong>+</strong> no centro: registrar um gasto, receita ou investimento.
          </li>
          <li>
            <strong>Planejar</strong>: orçamentos e metas.
          </li>
          <li>
            <strong>Mais</strong>: importar fatura, categorias, investimentos, relatórios, configurações e sair.
          </li>
        </Steps>
        <Note>No computador, tudo isso fica na coluna à esquerda.</Note>
      </>
    ),
  },
  {
    id: "registrar",
    title: "Registre um gasto em segundos",
    image: { src: "/ajuda/registrar.jpg", alt: "Folha Registrar com o valor 32,90, a categoria Alimentação escolhida e o botão Salvar" },
    body: (
      <Steps>
        <li>
          Toque no <strong>+</strong> no centro da barra (no computador, em <strong>+ Registrar</strong>).
        </li>
        <li>Digite o valor. Pode usar vírgula: 32,90.</li>
        <li>Escolha a categoria. As que você mais usa aparecem primeiro.</li>
        <li>
          Toque em <strong>Salvar</strong>.
        </li>
        <li>
          Opcional: troque <em>Gasto</em> por <em>Receita</em> ou <em>Investimento</em> no topo, escreva uma descrição, mude a data (hoje vem marcada) ou a forma de pagamento.
        </li>
      </Steps>
    ),
  },
  {
    id: "mes",
    title: "Confira como está o mês",
    image: { src: "/ajuda/mes.jpg", alt: "Tela Mês com a sobra do mês, entrou, saiu e investiu, orçamentos e últimos lançamentos" },
    body: (
      <>
        <Steps>
          <li>
            <strong>Sobra do mês</strong> é o que entrou menos o que saiu e o que você investiu no mês.
          </li>
          <li>
            <strong>Saldo acumulado</strong> soma todos os meses desde o primeiro lançamento.
          </li>
          <li>As setas ‹ › ao lado do nome do mês mostram meses anteriores e seguintes.</li>
          <li>
            Em <strong>Orçamentos</strong>, a barra fica âmbar a partir de 80% do limite e vermelha quando passa dele.
          </li>
          <li>Toque em qualquer lançamento para editar.</li>
        </Steps>
        <Note>Se a fatura do cartão do mês ainda não foi importada, aparece um lembrete com o atalho para importar.</Note>
      </>
    ),
  },
  {
    id: "lancamentos",
    title: "Encontre, corrija ou apague um lançamento",
    image: { src: "/ajuda/editar.jpg", alt: "Folha Editar lançamento aberta, com os botões Excluir e Salvar alterações" },
    body: (
      <Steps>
        <li>
          Abra <strong>Lançamentos</strong>. A lista vem agrupada por dia, com o total de cada dia.
        </li>
        <li>
          Use a busca ou os botões <em>Gastos</em>, <em>Receitas</em> e <em>Investimentos</em>. Em <strong>Filtros</strong> há categoria, período e ordem.
        </li>
        <li>Toque no lançamento para abrir a edição. Mude o que precisar e toque em Salvar alterações.</li>
        <li>
          Para apagar, toque em <strong>Excluir</strong> dentro da edição e confirme. Não dá para desfazer.
        </li>
      </Steps>
    ),
  },
  {
    id: "importar",
    title: "Importe a fatura do cartão",
    image: { src: "/ajuda/importar.jpg", alt: "Tela Importar fatura conferindo os lançamentos de uma fatura, com mês da fatura e categoria sugerida" },
    body: (
      <>
        <Steps>
          <li>
            Baixe a fatura em PDF no app do banco e abra <strong>Mais → Importar fatura</strong>.
          </li>
          <li>Escolha o arquivo. Se o PDF tiver senha, o app pede.</li>
          <li>Confira a lista: desmarque o que não quer importar e ajuste categoria ou tipo quando a sugestão não servir.</li>
          <li>
            Marque <em>Lembrar para as próximas faturas</em> para que aquele estabelecimento já venha com a categoria certa da próxima vez.
          </li>
          <li>
            Toque em <strong>Importar</strong>. Tudo entra como Cartão de crédito.
          </li>
        </Steps>
        <Note>
          <strong>Em que mês as compras entram?</strong> No mês em que a fatura vence, quando o dinheiro sai da sua conta.
          A data de cada compra fica guardada na observação. Se preferir contar pelo mês em que gastou, marque <em>Usar a data de cada compra</em> antes de importar.
        </Note>
        <Note>
          O PDF é lido no seu aparelho e não é enviado. O pagamento da fatura anterior vem desmarcado, para não contar o mesmo dinheiro duas vezes.
          Errou? Em <em>Importações anteriores</em>, toque em Desfazer.
        </Note>
      </>
    ),
  },
  {
    id: "planejar",
    title: "Planeje com orçamentos e metas",
    image: { src: "/ajuda/planejar.jpg", alt: "Tela Planejar com três orçamentos do mês, o total e uma meta" },
    body: (
      <Steps>
        <li>
          Em <strong>Planejar</strong>, toque em <em>+ Novo orçamento</em>, escolha uma categoria de gasto, o limite e o mês.
        </li>
        <li>O app soma sozinho os gastos daquela categoria no mês e mostra quanto ainda resta.</li>
        <li>
          Para guardar dinheiro para algo, toque em <em>+ Nova meta</em>: dê um nome, o valor que quer juntar e, se quiser, um prazo.
        </li>
        <li>
          Conforme for juntando, toque em <em>Atualizar progresso</em> na meta.
        </li>
      </Steps>
    ),
  },
  {
    id: "categorias",
    title: "Organize categorias e regras",
    image: { src: "/ajuda/categorias.jpg", alt: "Tela Categorias e regras com as abas Gastos, Receitas, Investimentos e Regras" },
    body: (
      <Steps>
        <li>
          Em <strong>Mais → Categorias e regras</strong> você vê quanto foi gasto em cada categoria no mês.
        </li>
        <li>
          Toque em <em>Nova categoria</em> para criar uma, ou numa categoria para mudar nome e cor.
        </li>
        <li>
          A aba <strong>Regras</strong> lista os estabelecimentos que o app já reconhece nas faturas. Apague uma regra se ela estiver errada.
        </li>
      </Steps>
    ),
  },
  {
    id: "relatorios",
    title: "Veja relatórios e investimentos",
    image: { src: "/ajuda/relatorios.jpg", alt: "Tela Relatórios com o balanço do período" },
    body: (
      <Steps>
        <li>
          <strong>Relatórios</strong> mostra o balanço de qualquer mês: receitas, despesas, saldo, taxa de economia, maior despesa e os gastos por categoria, além da evolução dos últimos 6 meses.
        </li>
        <li>
          <strong>Investimentos</strong> mostra o total investido, os aportes do mês e a divisão por tipo. Toque em <em>Novo aporte</em> para registrar.
        </li>
      </Steps>
    ),
  },
];

const faq: { question: string; answer: ReactNode }[] = [
  {
    question: "Esqueci minha senha",
    answer: (
      <p>
        Na tela de entrada, toque em <em>Esqueceu a senha?</em> e informe seu e-mail. O link para criar uma senha nova vale por 1 hora.
      </p>
    ),
  },
  {
    question: "Uma linha da fatura veio como Receita, mas é um gasto",
    answer: (
      <p>
        Antes de importar, troque o tipo da linha para <em>Gasto</em>. Se já importou, abra o lançamento em Lançamentos e mude o tipo, ou desfaça a importação e importe de novo.
      </p>
    ),
  },
  {
    question: "Como baixo uma cópia dos meus dados?",
    answer: (
      <p>
        Em <strong>Mais → Configurações → Exportar dados</strong>, escolha CSV (abre em planilhas) ou JSON.
      </p>
    ),
  },
  {
    question: "Meus dados estão seguros?",
    answer: (
      <p>
        Cada conta só enxerga os próprios lançamentos. A senha é guardada criptografada, o PDF da fatura não sai do seu aparelho e o app não guarda dados financeiros no celular.
      </p>
    ),
  },
  {
    question: "Como saio da conta?",
    answer: (
      <p>
        Em <strong>Mais → Sair</strong> (no computador, <em>Sair</em> no pé da coluna à esquerda).
      </p>
    ),
  },
];

export default function HelpPage() {
  return (
    <Page>
      <Header>
        <Brand href="/" aria-label="Finance App, abrir o app">
          <BrandMark aria-hidden="true">F</BrandMark>
          <span>Finance App</span>
        </Brand>
        <HeaderLink href="/">Abrir o app</HeaderLink>
      </Header>

      <Wrap>
        <Title>Como usar o Finance App</Title>
        <Lead>Registre o que gasta, confira o mês e importe a fatura do cartão. Cada parte abaixo leva menos de um minuto para ler.</Lead>

        <Index aria-label="Nesta página">
          <p>Nesta página</p>
          <ol>
            {sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`}>{section.title}</a>
              </li>
            ))}
            <li>
              <a href="#duvidas">Dúvidas comuns</a>
            </li>
          </ol>
        </Index>

        {sections.map((section) => (
          <Section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} $withImage={!!section.image}>
            <SectionBody>
              <h2 id={`${section.id}-title`}>{section.title}</h2>
              {section.body}
            </SectionBody>
            {section.image && (
              <Figure>
                <Image src={section.image.src} alt={section.image.alt} width={390} height={780} sizes="(min-width: 960px) 260px, 70vw" />
              </Figure>
            )}
          </Section>
        ))}

        <Section id="duvidas" aria-labelledby="duvidas-title" $withImage={false}>
          <SectionBody>
            <h2 id="duvidas-title">Dúvidas comuns</h2>
            <Faq>
              {faq.map((item) => (
                <details key={item.question}>
                  <summary>{item.question}</summary>
                  {item.answer}
                </details>
              ))}
            </Faq>
            <Note>
              Pronto para começar? <Link href="/">Abrir o Finance App</Link>
            </Note>
          </SectionBody>
        </Section>
      </Wrap>
    </Page>
  );
}
