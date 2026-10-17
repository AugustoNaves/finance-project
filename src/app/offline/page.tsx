"use client";

import { Brand, BrandMark, Page, Retry, Sheet, Text, Title } from "./styles";

export default function OfflinePage() {
  return (
    <Page>
      <Sheet>
        <Brand>
          <BrandMark aria-hidden="true">F</BrandMark>
          <span>Finance-app</span>
        </Brand>
        <Title>Sem conexão</Title>
        <Text>
          Seus lançamentos ficam no servidor e não são guardados no aparelho. Assim que a internet
          voltar, é só tentar de novo.
        </Text>
        <Retry type="button" onClick={() => window.location.assign("/")}>
          Tentar de novo
        </Retry>
      </Sheet>
    </Page>
  );
}
