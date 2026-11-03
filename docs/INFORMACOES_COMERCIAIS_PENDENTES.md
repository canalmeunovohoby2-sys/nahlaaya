# Informações comerciais pendentes

Os campos abaixo dependem de confirmação da cliente. Eles ficam centralizados em
`src/data/business-info.ts` e **não são exibidos** enquanto estiverem vazios. As
páginas usam formulações neutras, como "canal oficial de atendimento", sem
mostrar marcadores como `[INSERIR CNPJ]` ou dados fictícios.

| Campo | Situação | Onde será necessário |
| --- | --- | --- |
| `legalName` | Pendente | Identificação empresarial, se exigida na loja. |
| `cnpj` | Pendente | Identificação empresarial e documentos. |
| `commercialAddress` | Pendente | Endereço comercial, se aplicável. |
| `supportEmail` | Pendente | Atendimento, trocas, devoluções e privacidade. |
| `supportPhone` | Pendente | Atendimento e contato sobre pedidos. |
| `supportHours` | Pendente | Horário oficial de atendimento. |
| `privacyContactChannel` | Pendente | Exercício de direitos da LGPD. |
| `returnsContactChannel` | Pendente | Solicitações de troca e devolução. |
| `defaultCarrier` | Pendente | Transportadora utilizada, se houver uma definida. |
| `shippingQuoteProvider` | Pendente | Serviço de cotação de frete. |
| `postingDeadline` | Pendente | Prazo de postagem, se a loja definir um. |
| `deliveryEstimate` | Pendente | Prazo estimado por modalidade/destino, se definido. |

## Observações

- O Melhor Envio não está integrado. A página de entrega informa isso de forma
  expressa e não promete cotação automática ativa.
- O checkout atual registra o pedido com frete pendente e não realiza cobrança
  automática de frete.
- Não há e-mail, telefone, CNPJ, endereço, transportadora, prazo ou valor de
  frete inventados nas páginas.
- Quando a cliente fornecer um campo, ele deve ser preenchido em
  `src/data/business-info.ts` e, se necessário, refletido no texto público.
- O direito de arrependimento de 7 dias e os demais direitos legais não devem
  ser substituídos por regras comerciais mais restritivas.
