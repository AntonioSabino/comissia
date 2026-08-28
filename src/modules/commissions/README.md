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

## Não pertence a este módulo

- cadastro do vendedor;
- edição dos dados comerciais da venda;
- regras de autenticação e autorização.

O cálculo recebe dados explícitos e deve ser determinístico. Consultar o
percentual atual do vendedor para recalcular uma venda antiga é proibido.
Diferenças de centavos são corrigidas na última parcela para preservar o total.
