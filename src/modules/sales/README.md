# Módulo de vendas

Responsável pelo registro da operação comercial de consórcio e pelo estado da
venda durante seu ciclo de vida.

## Pertence a este módulo

- administradora, produto, grupo e cota;
- cliente e vendedor associados;
- data da venda e valor do crédito;
- quantidade de parcelas e primeira data prevista informadas na venda;
- situação da cota ou da venda;
- dados imutáveis necessários para auditoria.

## Não pertence a este módulo

- manutenção dos dados cadastrais do vendedor;
- cálculo e arredondamento da comissão;
- situação financeira das parcelas de comissão.

A venda referencia o vendedor por identificador. Regras financeiras aplicadas à
venda devem ser preservadas como snapshot para que alterações futuras não mudem
o histórico.
