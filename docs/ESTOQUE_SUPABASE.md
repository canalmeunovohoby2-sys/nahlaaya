# Estoque e reservas no Supabase

Esta correção prepara a reserva de estoque sem integrar pagamento real.

## Estratégia implementada

1. **Criação**
   - `create_order` valida o payload, recalcula preços pelo banco e reserva cada
     item com `UPDATE ... WHERE stock >= quantidade`.
   - A reserva e o pedido são gravados na mesma transação.
   - Se qualquer item não tiver estoque, toda a operação é desfeita.
   - A reserva tem validade de **30 minutos** (`reservation_expires_at`).

2. **Confirmação**
   - O pedido fica com o estoque reservado desde a criação.
   - `confirm_order_payment` não desconta o estoque novamente.
   - A confirmação só prossegue com reserva ativa e não expirada.
   - Se a reserva do pedido alvo estiver expirada, a função cancela o pedido,
     libera o estoque via trigger e retorna um objeto com
     `reservationExpired = true` e `payment_status = cancelled`.
   - As Edge Functions `admin-api` e `confirm-payment` convertem esse retorno em
     HTTP 409, sem desfazer a liberação já confirmada pelo banco.
   - O evento de pagamento e a mudança para `paid` acontecem na mesma transação
     somente nos pedidos com reserva válida.
   - A mesma referência de pagamento não pode ser usada em outro pedido; a unicidade é global no banco nesta etapa.

3. **Expiração**
   - `release_expired_order_reservations()` cancela pedidos pendentes vencidos e
     libera o estoque.
   - A função é chamada pela Edge Function `create-order` em uma RPC separada,
     antes de `create_order`, e pelas ações administrativas de consulta/liberação.
     `confirm_order_payment` trata diretamente a reserva expirada do pedido alvo,
     sem chamar a liberação geral.
   - Não existe cron nem tarefa artificial nesta etapa. A liberação é oportunista:
     ocorre na próxima operação que chamar a função.

4. **Falha definitiva**
   - Falhas temporárias ou recuperáveis devem manter o pedido em `pending` e
     **não** liberar a reserva.
   - Falha definitiva é registrada com `payment_status = 'failed'` e
     `payment_failure_terminal = true`, usando
     `mark_order_payment_failed(p_order_id, true)`.
   - Nesse caso o trigger libera o estoque uma única vez.

5. **Cancelamento**
   - O trigger `orders_release_stock_on_cancel` devolve o estoque quando um pedido
     pendente passa para `cancelled` ou para falha terminal.
   - O painel administrativo que atualiza diretamente o pedido também aciona o
     trigger.
   - Cancelamento após pagamento não é tratado por esta trigger; uma eventual
     política de estorno/devolução precisa ser definida antes.

6. **Reservas vencidas no painel**
   - O administrador pode consultar pela ação autenticada
     `GET ?action=expired-reservations`.
   - A liberação é feita por `PATCH ?action=release-expired`.
   - A liberação é idempotente, usa bloqueio de linha e ignora pedidos já
     liberados.
   - Não há cron nem chamada automática de aquecimento. O administrador ou uma
     operação real decide quando consultar/liberar.

7. **Pagamento aprovado após a expiração**
   - Não marcar o pedido como pago automaticamente e não ignorar o evento.
   - Registrar o evento recebido com status `received_after_expiry` e manter o
     pedido em revisão manual.
   - Verificar disponibilidade real antes de qualquer nova reserva; se não houver
     estoque, o pagamento deve ser estornado ou tratado pelo atendimento.
   - Nenhuma integração de pagamento é implementada nesta etapa.

## Campos adicionados em `orders`

- `stock_reserved_at`: quando o estoque foi reservado.
- `reservation_expires_at`: vencimento da reserva.
- `stock_released_at`: quando a reserva foi devolvida.
- `stock_deducted_at`: mantido como marco de confirmação do pagamento.
- `payment_failure_terminal`: define falha definitiva; falhas temporárias não mudam o status.
- `payment_failure_terminal` só pode ser verdadeiro quando `payment_status = failed`.

## Concorrência

A reserva usa atualização condicional de estoque dentro da transação. Em duas
compras simultâneas do último item, apenas uma atualização encontra
`stock >= quantidade`; a outra falha e não cria pedido.

## Riscos ainda existentes

- Sem integração de pagamento, uma cobrança externa que ocorra após a expiração
  da reserva deve ser tratada por estorno/atendimento. O sistema ainda não faz
  webhook nem estorno automático.
- Pedidos com falha temporária permanecem `pending`; só falha terminal libera a reserva.
- Cancelamento ou estorno após pagamento não devolve estoque automaticamente.
- A reserva de 30 minutos é uma definição técnica inicial; pode ser ajustada
  antes da ativação em produção.
- A função de expiração geral precisa ser chamada por uma operação real ou manual. Não
  há promessa de liberação imediata sem tráfego; a confirmação de um pedido
  expirado libera apenas aquele pedido.
- O catálogo frontend continua usando os dados estáticos locais; a reserva só
  altera o banco Supabase.

## Testes pendentes no Supabase

Como o projeto remoto não foi alterado, os testes transacionais abaixo ainda
precisam ser executados em homologação:

- duas compras simultâneas do último item: uma deve falhar;
- confirmação do pedido reservado não pode deixar estoque negativo;
- reenvio do mesmo evento deve ser idempotente;
- referência de pagamento usada em outro pedido deve ser rejeitada;
- cancelamento pendente deve devolver o estoque;
- expiração deve cancelar e devolver o estoque;
- pagamento após expiração deve ser recusado.
