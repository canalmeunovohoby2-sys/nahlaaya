import { LegalPage } from '../components/legal/LegalPage'
import type { LegalPageContent } from '../data/legal'

const termsAndConditions: LegalPageContent = {
  eyebrow: 'Relação clara e transparente',
  title: 'Termos e Condições',
  description:
    'As regras gerais de uso da loja, formação de pedidos, disponibilidade, preços, pagamentos e responsabilidades.',
  intro:
    'Estes termos se aplicam ao uso da loja virtual Nahla Aya e à realização de pedidos pelo site. Ao navegar ou comprar, você declara ter lido estas condições e as demais páginas de políticas da loja.',
  sections: [
    {
      id: 'sobre-a-loja',
      title: 'Sobre a loja',
      paragraphs: [
        'A Nahla Aya é uma loja virtual de perfumaria. O catálogo apresenta os produtos disponíveis, suas informações e os valores vigentes no momento da consulta.',
        'A loja pode atualizar o catálogo, as informações dos produtos e estas condições. O pedido será regido pelas condições exibidas no momento da sua realização, sem prejuízo dos direitos previstos na legislação.',
      ],
    },
    {
      id: 'produtos-e-estoque',
      title: 'Produtos e disponibilidade',
      paragraphs: [
        'A disponibilidade dos produtos depende do estoque existente. A quantidade máxima permitida na sacola considera o estoque cadastrado, mas o estoque não fica reservado enquanto o pagamento está pendente.',
        'A baixa definitiva do estoque ocorre após a confirmação do pagamento. Se o estoque se esgotar antes da confirmação, a loja entrará em contato para tratar a situação e os direitos do comprador serão preservados.',
        'As informações de marca, volume, concentração e imagem são as apresentadas na página de cada produto. Caso exista divergência relevante, o comprador poderá solicitar esclarecimentos pelo atendimento.',
      ],
    },
    {
      id: 'precos-e-pagamento',
      title: 'Preços e formas de pagamento',
      paragraphs: [
        'Os preços são exibidos em reais. A loja oferece as modalidades de pagamento mostradas no checkout: Pix, débito e crédito em 3x. O valor do Pix corresponde a 90% do total exibido para o crédito em 3x, conforme o cálculo apresentado no site.',
        'O valor final é confirmado a partir dos itens, da modalidade escolhida e das condições vigentes no momento do pedido. Nesta etapa, o site registra o pedido com pagamento pendente e não realiza cobrança automática.',
        'O checkout não solicita número de cartão nem dados bancários. A escolha da modalidade não representa, por si só, a aprovação ou a captura do pagamento.',
      ],
    },
    {
      id: 'pedido-e-confirmacao',
      title: 'Formação e registro do pedido',
      paragraphs: [
        'O pedido é formado quando o comprador envia o formulário de checkout com os dados solicitados. Após o envio, o sistema gera um número de pedido e registra a solicitação com status de pagamento pendente.',
        'A loja confere a disponibilidade dos itens e os dados informados. A confirmação do pedido e a baixa de estoque dependem da confirmação do pagamento, conforme o procedimento aplicável a cada modalidade.',
        'O comprador é responsável por revisar os itens, o endereço e os dados de contato antes de enviar o pedido. Divergências devem ser comunicadas ao atendimento o quanto antes.',
      ],
    },
    {
      id: 'entrega',
      title: 'Entrega',
      paragraphs: [
        'A loja atende todo o Brasil. A cotação, o prazo, a modalidade e o rastreamento seguem a Política de Entrega.',
        'Como a integração automática de frete ainda não foi implementada, o pedido pode ser registrado com o frete pendente de definição. O valor do frete não está incluído automaticamente no total nesta etapa.',
      ],
    },
    {
      id: 'trocas-e-cancelamento',
      title: 'Trocas, devoluções e cancelamento',
      paragraphs: [
        'O direito de arrependimento de 7 dias nas compras online, a análise de produtos com defeito e as solicitações de troca ou devolução seguem a página de Trocas e Devoluções e a legislação brasileira.',
        'Solicitações de cancelamento serão tratadas conforme o estágio do pedido, o meio de pagamento e os direitos assegurados ao consumidor. A loja não cria restrições incompatíveis com o Código de Defesa do Consumidor.',
      ],
    },
    {
      id: 'responsabilidades',
      title: 'Responsabilidades da loja e do comprador',
      paragraphs: ['A loja se compromete a:'],
      bullets: [
        'Apresentar informações sobre os produtos e as condições de compra.',
        'Registrar e acompanhar os pedidos realizados pelo site.',
        'Tratar os dados pessoais conforme a Política de Privacidade e a LGPD.',
        'Prestar atendimento sobre pedidos, entrega, trocas e devoluções.',
        'Observar os direitos do consumidor previstos na legislação brasileira.',
      ],
      note:
        'O comprador se compromete a fornecer dados verdadeiros e completos, manter o endereço atualizado, revisar o pedido antes do envio e utilizar a loja de forma lícita. O uso indevido do site ou de seus conteúdos é de responsabilidade de quem o pratica.',
    },
    {
      id: 'atendimento-e-legislacao',
      title: 'Atendimento e legislação aplicável',
      paragraphs: [
        'O atendimento é realizado pelo canal oficial disponibilizado pela Nahla Aya. Para agilizar a análise, informe o número do pedido e descreva sua solicitação com o máximo de detalhes possível.',
        'Estes termos são interpretados de acordo com a legislação brasileira, incluindo o Código de Defesa do Consumidor, a LGPD e as demais normas aplicáveis. Nenhuma disposição deste documento afasta direitos irrenunciáveis do consumidor.',
      ],
    },
  ],
}

export function TermsPage() {
  return <LegalPage content={termsAndConditions} />
}
