import { LegalPage } from '../components/legal/LegalPage'
import type { LegalPageContent } from '../data/legal'

const privacyPolicy: LegalPageContent = {
  eyebrow: 'Privacidade e confiança',
  title: 'Política de Privacidade',
  description:
    'Entenda quais dados são informados no checkout, por que a Nahla Aya os utiliza e como você pode exercer seus direitos.',
  intro:
    'Esta política descreve o tratamento de dados pessoais na loja virtual Nahla Aya. Nesta versão, não há criação de conta de cliente: os dados são coletados quando você preenche o checkout ou mantém itens na sacola.',
  sections: [
    {
      id: 'dados-coletados',
      title: 'Quais dados coletamos',
      paragraphs: [
        'No checkout, solicitamos nome completo, CPF, e-mail, telefone e endereço de entrega. Também registramos os itens escolhidos, a forma de pagamento selecionada e o número gerado para o pedido.',
        'Nesta etapa, o checkout não solicita número de cartão nem dados bancários. A forma de pagamento é registrada apenas como Pix, débito ou crédito em 3x, conforme a opção escolhida.',
        'Os itens da sacola podem ser gravados no armazenamento local do seu navegador para preservar a seleção enquanto você navega. Esses dados permanecem no dispositivo e podem ser apagados ao limpar os dados do navegador ou esvaziar a sacola.',
      ],
    },
    {
      id: 'finalidades',
      title: 'Para que utilizamos seus dados',
      paragraphs: [
        'Os dados informados são utilizados para viabilizar a compra e o relacionamento com você. O tratamento observa a legislação aplicável, incluindo a Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018).',
      ],
      bullets: [
        'Identificar o comprador e localizar o pedido.',
        'Registrar, organizar e acompanhar o pedido.',
        'Calcular a entrega e confirmar o endereço de destino.',
        'Entrar em contato sobre o pedido, pagamento, entrega ou atendimento.',
        'Receber e analisar solicitações de troca, devolução ou defeito.',
        'Cumprir obrigações legais, regulatórias e o exercício regular de direitos.',
      ],
      note:
        'As bases legais podem incluir a execução de contrato e procedimentos preliminares, o cumprimento de obrigação legal ou regulatória, o exercício regular de direitos e, quando aplicável, o consentimento.',
    },
    {
      id: 'protecao',
      title: 'Como os dados são utilizados e protegidos',
      paragraphs: [
        'O acesso às áreas administrativas da loja é protegido por autenticação. As informações são mantidas no banco de dados utilizado pela operação e tratadas apenas pelas pessoas envolvidas no atendimento e na gestão da loja.',
        'A Nahla Aya adota medidas técnicas e administrativas compatíveis com o estágio atual da operação para reduzir riscos de acesso não autorizado, perda ou uso indevido. Não afirmamos certificações ou padrões de segurança específicos que ainda não tenham sido implementados.',
        'Nenhum ambiente digital é completamente imune a incidentes. Caso ocorra um incidente relevante, a loja adotará as providências cabíveis e comunicará os titulares e autoridades quando a legislação exigir.',
      ],
    },
    {
      id: 'compartilhamento',
      title: 'Compartilhamento e tempo de guarda',
      paragraphs: [
        'A Nahla Aya não vende dados pessoais. O compartilhamento pode ocorrer com prestadores necessários à operação, como serviços de infraestrutura, pagamento ou entrega, quando contratados, sempre limitado às finalidades descritas nesta política.',
        'Também poderemos fornecer dados a autoridades públicas quando houver obrigação legal, ordem judicial ou necessidade de exercício regular de direitos. Os dados são mantidos pelo tempo necessário ao cumprimento das finalidades e dos prazos legais aplicáveis.',
      ],
    },
    {
      id: 'direitos-lgpd',
      title: 'Seus direitos como titular',
      paragraphs: [
        'Nos termos da LGPD, você pode solicitar, conforme o caso e observados os limites legais:',
      ],
      bullets: [
        'Confirmação da existência de tratamento e acesso aos dados.',
        'Correção de dados incompletos, inexatos ou desatualizados.',
        'Anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade com a lei.',
        'Portabilidade, quando aplicável e regulamentada.',
        'Eliminação dos dados tratados com consentimento, ressalvadas as hipóteses de conservação legal.',
        'Informação sobre compartilhamentos e sobre a possibilidade de não consentir.',
        'Revogação do consentimento, quando essa for a base legal utilizada.',
      ],
      note:
        'Algumas solicitações podem ser atendidas parcialmente quando houver obrigação legal de conservar o dado ou necessidade de preservar direitos. Você será informado sobre o motivo, quando aplicável.',
    },
    {
      id: 'atendimento-privacidade',
      title: 'Como exercer seus direitos',
      paragraphs: [
        'Para solicitar acesso, correção, eliminação ou esclarecimentos sobre seus dados, utilize o canal oficial de atendimento disponibilizado pela Nahla Aya. A loja poderá pedir informações adicionais para confirmar sua identidade e evitar acesso indevido.',
        'Esta política pode ser atualizada para refletir mudanças na operação ou na legislação. A versão publicada nesta página é a que está vigente.',
      ],
    },
  ],
}

export function PrivacyPolicyPage() {
  return <LegalPage content={privacyPolicy} />
}
