import { LegalPage } from '../components/legal/LegalPage'
import type { LegalPageContent } from '../data/legal'

const exchangesPolicy: LegalPageContent = {
  eyebrow: 'Compre com segurança',
  title: 'Trocas e Devoluções',
  description:
    'Informações sobre o direito de arrependimento, produtos com defeito e o canal para solicitar troca ou devolução.',
  intro:
    'A Nahla Aya respeita os direitos previstos no Código de Defesa do Consumidor. Esta página explica como solicitar uma troca ou devolução e quais direitos permanecem garantidos pela legislação.',
  sections: [
    {
      id: 'direito-de-arrependimento',
      title: 'Direito de arrependimento em compras online',
      paragraphs: [
        'Nas compras realizadas fora do estabelecimento comercial, o consumidor pode desistir da compra em até 7 dias corridos a contar do recebimento do produto, sem necessidade de justificativa. Esse direito está previsto no artigo 49 do Código de Defesa do Consumidor.',
        'Exercido o direito de arrependimento, o produto deve ser devolvido e os valores pagos serão restituídos nos termos da legislação. A Nahla Aya não cria condições que reduzam ou eliminem esse direito.',
      ],
      note:
        'O prazo de 7 dias é o mínimo legal para compras online. Ele não substitui os direitos relacionados a produtos com defeito.',
    },
    {
      id: 'como-solicitar',
      title: 'Como solicitar uma troca ou devolução',
      paragraphs: [
        'Entre em contato pelo canal oficial de atendimento da Nahla Aya e informe o número do pedido, o produto e o motivo da solicitação. Se o pedido tiver mais de um item, indique quais produtos deseja devolver ou trocar.',
        'A loja confirmará o recebimento da solicitação e informará os próximos passos, incluindo a forma de envio do produto.',
        'Sempre que possível, conserve a embalagem, os acessórios e o comprovante do pedido. Essa recomendação ajuda na conferência, mas não é usada para restringir direitos garantidos por lei.',
      ],
    },
    {
      id: 'produtos-com-defeito',
      title: 'Produtos com defeito',
      paragraphs: [
        'Se o produto apresentar defeito aparente ou vício de qualidade, entre em contato pelo canal oficial de atendimento e descreva o problema. Se possível, envie fotos ou vídeos que ajudem na identificação.',
        'A loja fará a análise necessária e adotará a solução cabível conforme o Código de Defesa do Consumidor e a garantia legal. Os direitos do consumidor não dependem de uma garantia comercial adicional.',
      ],
    },
    {
      id: 'restituicao',
      title: 'Análise e restituição',
      paragraphs: [
        'Após o recebimento e a conferência do produto devolvido, a loja dará andamento à solicitação. A restituição será feita pelo meio adequado ao pagamento realizado, observadas as regras da legislação e da instituição financeira envolvida.',
        'O prazo para o valor aparecer na sua conta ou fatura depende do meio de pagamento e da instituição financeira. A loja informará o andamento da restituição pelo canal de atendimento.',
      ],
    },
    {
      id: 'direitos-preservados',
      title: 'Seus direitos permanecem garantidos',
      paragraphs: [
        'Nenhuma regra desta página tem o objetivo de limitar o direito de arrependimento, a garantia legal, o direito à informação ou qualquer outro direito assegurado ao consumidor pela legislação brasileira.',
        'Em caso de dúvida sobre o seu pedido ou sobre o procedimento aplicável, procure o atendimento oficial da loja antes de enviar o produto.',
      ],
    },
  ],
}

export function ExchangesPage() {
  return <LegalPage content={exchangesPolicy} />
}
