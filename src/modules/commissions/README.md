# Módulo de comissões

Responsável por transformar os dados consolidados da venda em valores de
comissão e parcelas previstas.

## Pertence a este módulo

- percentual aplicado e snapshot da regra;
- valor total da comissão do vendedor;
- divisão e arredondamento das parcelas;
- competências, datas previstas e valores;
- situação e ajustes das parcelas;
- consultas mensais de valores previstos.

## Comissão total do vendedor

`calculateSellerCommissionTotal` recebe o crédito em centavos e o percentual do
vendedor em pontos-base que a venda preservou como snapshot. O cálculo permanece
em `bigint` e devolve o total em centavos, sem converter valores monetários para
`number`.

Quando o percentual produz uma fração de centavo, o valor é arredondado para o
centavo mais próximo; exatamente meio centavo é arredondado para cima.

## Distribuição entre parcelas

`allocateSellerCommissionInstallments` recebe o crédito, o percentual do
vendedor e a régua de parcelas da administradora: a lista ordenada, em
pontos-base, do que a administradora paga à corretora em cada parcela. São
aceitas de 1 a 120 parcelas, cada percentual inteiro entre 1 e 10.000
pontos-base.

A régua define a **proporção** de cada parcela, não o valor do vendedor. A
comissão do vendedor continua sendo o percentual dele sobre o crédito
(`calculateSellerCommissionTotal`) e é dividida entre as parcelas nessa
proporção. Como o dinheiro do vendedor sai de dentro do que a corretora recebe,
o total da régua é o teto: percentual do vendedor acima dele é recusado com
`SellerCommissionInstallmentAllocationError`.

Por exemplo, com a administradora pagando 4% à corretora em 2% + 1% + 1% e um
crédito de R$ 200.000: um vendedor com 2% recebe R$ 4.000 em parcelas de
R$ 2.000, R$ 1.000 e R$ 1.000; um vendedor com 2,5% recebe R$ 5.000 em
R$ 2.500, R$ 1.250 e R$ 1.250. A diferença entre a régua e o percentual do
vendedor fica com a corretora.

Os valores anteriores à última parcela são calculados em centavos sem
arredondamento para cima. A última parcela recebe toda a diferença necessária
para que a soma seja igual à comissão total arredondada. Assim, nenhum centavo é
criado ou perdido.

Este módulo recebe a régua pronta. Ela é mantida pelo módulo de vendas, por
administradora, produto ou plano e vigência, e a venda grava como snapshot a
versão aplicada.

Campanhas da administradora — percentual diferente em um período, condicionado a
meta de volume — ainda não existem no modelo e não afetam este cálculo.

## Competências e datas previstas

`buildCommissionInstallmentSchedule` recebe a data prevista da primeira parcela
e a quantidade contratada e devolve a agenda das parcelas, com número,
competência (`AAAA-MM`) e data prevista (`AAAA-MM-DD`), avançando um mês por
parcela.

O dia informado na primeira parcela é o dia de vencimento do contrato e vale
para todas as competências. Meses mais curtos encurtam apenas a própria data
prevista: uma primeira parcela em 31/01 vence em 28/02 e volta a vencer em
31/03. Anos bissextos são respeitados e a virada de dezembro para janeiro avança
o ano.

A competência acompanha o mês da data prevista mesmo quando o dia é encurtado.
Datas fora do calendário, quantidades fora de 1 a 120 parcelas e agendas que
passariam do ano 9999 são recusadas com `CommissionInstallmentScheduleError`.

A agenda continua responsável somente pelo calendário; ela não contém valores.

## Geração das parcelas previstas

`generateSellerCommissionInstallments` compõe a agenda com a distribuição
financeira. Cada item contém o número sequencial, a identificação `1/N`, o
percentual da parcela, a competência, a data prevista, o valor em centavos e o
histórico de situação iniciado como `prevista`.

A ordem dos percentuais recebidos é preservada e o resultado completo é
imutável. A função recebe também o instante de criação para que o primeiro
registro do histórico seja explícito e auditável.

A distribuição vem da régua da administradora vigente na data da venda, que o
cadastro seleciona e grava como snapshot. As parcelas geradas são persistidas na
mesma transação da venda.

## Situações da parcela

Uma parcela nasce como `prevista` e pode assumir as situações `programada`,
`paga`, `cancelada` e `ajustada`. Cada mudança gera uma nova entrada de histórico
com a situação anterior, a nova situação e o instante da alteração.

O histórico é a própria sequência de mudanças, e a situação atual é sempre a da
última entrada: `currentCommissionInstallmentStatus` a deriva, então não existe
um campo separado que possa divergir do que foi registrado. Esse histórico é
imutável e cronológico: registrar uma transição devolve um novo estado, sem
alterar os registros anteriores, e mudanças retroativas são recusadas. As
restrições entre situações poderão ser adicionadas quando o fluxo operacional
for definido; neste incremento, qualquer mudança entre situações distintas é
aceita e rastreada.

Repetir a situação atual não representa uma transição e é recusado.
Reagendamentos, pagamentos parciais e ajustes sucessivos são eventos de negócio
com dados próprios, como datas, valores e motivos, e deverão ser registrados por
operações específicas. Com as situações deste incremento, uma parcela passa
para `paga` somente quando estiver integralmente quitada.

## Parcelas persistidas

As tabelas das parcelas são definidas no módulo de vendas, porque a parcela
referencia a venda e nasce dentro da transação dela; assim `sales` depende de
`commissions` e não o contrário. As regras continuam aqui: quem calcula,
distribui, agenda e define situação é este módulo.

`commission_installments` guarda as parcelas geradas no cadastro da venda:
número, competência (`AAAA-MM`), data prevista, o pedaço da régua que originou a
parcela (`rule_rate_basis_points`) e o valor do vendedor em centavos inteiros. O
par venda e número é único, e o banco recusa competência fora do formato, número
fora de 1 a 120 e valor negativo. Zero centavos é aceito: com comissão de poucos
centavos, as primeiras parcelas podem ser zero e a última leva o resto.

A situação vive em `commission_installment_status_events`, uma linha por
mudança, com a situação anterior, a nova e o instante. A situação atual é a do
último evento, como o domínio define: não existe coluna de situação que possa
divergir do histórico. A tabela é apenas de inclusão, garantida pelo gatilho
`commission_installment_status_events_append_only`, e o banco recusa um evento
cuja situação anterior seja igual à nova. Toda parcela nasce com um evento
`prevista` de situação anterior nula.

A consulta administrativa das parcelas e o fechamento mensal dos repasses já
existem (ver o README de `sales`); a conciliação de pagamentos é um incremento
posterior.

## Fechamento mensal

`commission-payout.ts` define o fluxo operacional dos repasses sobre as
situações acima:

- `PAYOUT_REVIEW`: a conferência do mês leva `prevista` para `programada`;
- `PAYOUT_PAYMENT`: o registro do pagamento leva `programada` para `paga`.

`planPayoutTransition` recebe o histórico de cada parcela e devolve os eventos a
gravar, com a posição de cada um no histórico, somente para as parcelas que
estão na situação de origem. As demais são ignoradas, para que repetir a ação
não falhe. Parcela sem histórico continua sendo recusada.

Só `prevista`, `programada` e `paga` compõem o fechamento (`isInPayoutClosing`).
`cancelada` não é paga, e `ajustada` depende de uma operação com valor e motivo
que ainda não existe. `payoutStageOf` resume um conjunto de parcelas, de um
vendedor ou do mês, em `em-conferencia` (há alguma prevista), `programado`,
`pago` ou `vazio`.

## Não pertence a este módulo

- cadastro do vendedor;
- edição dos dados comerciais da venda;
- regras de autenticação e autorização.

O cálculo recebe dados explícitos e deve ser determinístico. Consultar o
percentual atual do vendedor para recalcular uma venda antiga é proibido.
Diferenças de centavos são corrigidas na última parcela para preservar o total.
