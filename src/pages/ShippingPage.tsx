import { LegalPage } from '../components/legal/LegalPage'
import type { LegalPageContent } from '../data/legal'

const shippingPolicy: LegalPageContent = {
  eyebrow: 'Do nosso ateliê até você',
  title: 'Política de Entrega',
  description:
    'Saiba como funciona a cotação, quais fatores influenciam o prazo e como acompanhar o envio do seu pedido.',
  intro:
    'A Nahla Aya atende todo o Brasil. Esta página reúne as informações gerais sobre cotação, envio e rastreamento, sem fixar transportadoras, preços ou prazos que ainda não foram definidos pela loja.',
  sections: [
    {
      id: 'cobertura',
      title: 'Onde entregamos',
      paragraphs: [
        'A loja atende pedidos para todo o território brasileiro. A disponibilidade de entrega e as opções de envio são confirmadas a partir do endereço informado no checkout.',
        'O endereço deve estar completo e correto. Se houver divergência ou impossibilidade de entrega, a loja entrará em contato pelos dados informados no pedido.',
      ],
    },
    {
      id: 'cotacao',
      title: 'Como funciona a cotação de frete',
      paragraphs: [
        'A cotação considera o CEP de destino, os itens do pedido e a modalidade de envio disponível. O valor e as opções aplicáveis devem ser apresentados antes da contratação do transporte.',
        'Nesta etapa, a integração automática com o Melhor Envio ainda não foi implementada. Por isso, o checkout registra o pedido com o frete pendente de definição e não realiza cobrança automática de frete. A loja não afirma que o serviço esteja integrado ou ativo.',
        'A loja não publica uma tabela fixa de frete nem promete frete grátis. O valor aplicável será o da cotação vigente para o destino e a modalidade escolhida.',
      ],
      note:
        'Enquanto a cotação automática não estiver disponível, o valor do frete não deve ser considerado incluído no total do pedido.',
    },
    {
      id: 'prazo',
      title: 'Prazo de entrega',
      paragraphs: [
        'O prazo depende do destino, da modalidade de envio, do prazo de postagem e da transportadora responsável. Por isso, não há um prazo único para todo o Brasil.',
        'Quando a cotação estiver disponível, o prazo estimado será informado junto com a opção de envio. A contagem e eventuais particularidades logísticas seguem as condições apresentadas naquele momento.',
      ],
    },
    {
      id: 'rastreamento',
      title: 'Rastreamento do pedido',
      paragraphs: [
        'Quando a transportadora disponibilizar um código de rastreamento, ele será repassado à cliente pelo canal oficial de atendimento ou pelo meio de acompanhamento informado pela loja.',
        'A atualização do rastreio é feita pela transportadora e pode levar algum tempo para refletir o deslocamento do pedido.',
      ],
    },
    {
      id: 'recebimento',
      title: 'Recebimento e conferência',
      paragraphs: [
        'No recebimento, confira se a embalagem está íntegra e se o produto corresponde ao pedido. Se identificar avaria ou divergência, registre a ocorrência e procure o atendimento da loja com o número do pedido.',
        'As condições para troca, devolução ou análise de defeito estão descritas na página de Trocas e Devoluções e seguem a legislação brasileira.',
      ],
    },
  ],
}

export function ShippingPage() {
  return <LegalPage content={shippingPolicy} />
}
