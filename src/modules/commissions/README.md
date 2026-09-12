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

## Situações da parcela

Uma parcela nasce como `prevista` e pode assumir as situações `programada`,
`paga`, `cancelada` e `ajustada`. Cada mudança gera uma nova entrada de histórico
com a situação anterior, a nova situação e o instante da alteração.

O histórico é imutável e cronológico: registrar uma transição devolve um novo
estado, sem alterar os registros anteriores, e mudanças retroativas são
recusadas. As restrições entre situações poderão ser adicionadas quando o fluxo
operacional for definido; neste incremento, qualquer mudança entre situações
distintas é aceita e rastreada.

## Não pertence a este módulo

- cadastro do vendedor;
- edição dos dados comerciais da venda;
- regras de autenticação e autorização.

O cálculo recebe dados explícitos e deve ser determinístico. Consultar o
percentual atual do vendedor para recalcular uma venda antiga é proibido.
Diferenças de centavos são corrigidas na última parcela para preservar o total.
