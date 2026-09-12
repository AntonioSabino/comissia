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

`allocateSellerCommissionInstallments` recebe o crédito, o percentual total do
vendedor e a lista ordenada dos percentuais das parcelas em pontos-base. Cada
parcela pode ter um percentual diferente, desde que todos sejam inteiros
positivos e a soma seja exatamente igual ao percentual total do vendedor. São
aceitas de 1 a 120 parcelas.

Os valores anteriores à última parcela são calculados em centavos sem
arredondamento para cima. A última parcela recebe toda a diferença necessária
para que a soma seja igual à comissão total arredondada. Assim, nenhum centavo é
criado ou perdido.

Por exemplo, uma comissão total de 2% pode ser distribuída entre oito parcelas
com os percentuais 0,15%, 0,15%, 0,20%, 0,20%, 0,25%, 0,25%, 0,30% e 0,50%.
Este módulo recebe essa distribuição pronta. A origem dela é a régua de
parcelas da administradora, modelada no módulo de vendas por produto ou plano e
por vigência.

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

A distribuição vem da régua da administradora, guardada pelo módulo de vendas.
Selecionar a régua ao cadastrar a venda, gravar o snapshot dela e persistir as
parcelas geradas são incrementos posteriores.

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

## Não pertence a este módulo

- cadastro do vendedor;
- edição dos dados comerciais da venda;
- regras de autenticação e autorização.

O cálculo recebe dados explícitos e deve ser determinístico. Consultar o
percentual atual do vendedor para recalcular uma venda antiga é proibido.
Diferenças de centavos são corrigidas na última parcela para preservar o total.
