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

## Modelo de dados

`administrators` guarda as administradoras de consórcio, com nome único e
situação de uso. `sales` guarda a venda em si, sempre ligada a uma
administradora, a um vendedor e à vigência de percentual usada no cálculo. As
três referências usam `ON DELETE restrict`: nada que já sustenta uma venda pode
ser removido.

O código interno da venda é único. Grupo e cota são indexados junto com a
administradora para consulta, mas sem restrição de unicidade: uma cota cancelada
pode ser recomercializada e geraria uma segunda venda com o mesmo par.

A situação da cota usa os termos do negócio: `adimplente`, `inadimplente`,
`cancelado` e `contemplado`. Toda venda nasce `adimplente`.

O crédito vendido é armazenado em centavos inteiros (`bigint`), nunca em ponto
flutuante. O banco recusa crédito não positivo, percentual fora de 1 a 10.000
pontos-base, quantidade de parcelas fora de 1 a 120 e primeira previsão anterior
à data da venda.

## Snapshot do percentual

A venda guarda o percentual aplicado em duas colunas complementares:
`seller_rate_basis_points` é o valor usado no cálculo e
`seller_commission_rate_id` aponta para a vigência de onde ele veio. O valor
responde "quanto foi pago" sem depender de junção; a referência responde "por
qual regra", que é o que torna o histórico auditável.

Cadastrar uma nova vigência para o vendedor não altera nenhuma venda existente.

## Não pertence a este módulo

- manutenção dos dados cadastrais do vendedor;
- cálculo e arredondamento da comissão;
- situação financeira das parcelas de comissão.

A venda referencia o vendedor por identificador. Regras financeiras aplicadas à
venda devem ser preservadas como snapshot para que alterações futuras não mudem
o histórico.
