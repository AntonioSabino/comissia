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

## Administradoras

A administração mantém as administradoras em `/admin/administrators`: cadastra
pelo nome, inativa e reativa. O nome é único sem diferenciar maiúsculas de
minúsculas, o que a aplicação confere antes de gravar; a restrição
`administrators_name_unique` do banco protege contra nomes exatamente iguais.
Não há exclusão, e somente administradoras ativas são oferecidas para novas
vendas (`listActiveAdministrators`).

## Snapshot do percentual

A venda guarda o percentual aplicado em duas colunas complementares:
`seller_rate_basis_points` é o valor usado no cálculo e
`seller_commission_rate_id` aponta para a vigência de onde ele veio. O valor
responde "quanto foi pago" sem depender de junção; a referência responde "por
qual regra", que é o que torna o histórico auditável.

As duas colunas não são fatos independentes. A chave estrangeira composta
`sales_seller_commission_snapshot_fk` referencia
`seller_commission_rates (id, seller_id, rate_basis_points)` e, com isso, o banco
garante que o percentual gravado na venda é exatamente o da vigência citada e que
essa vigência pertence ao vendedor da venda. Divergir é impossível, não apenas
desaconselhado. Do lado dos vendedores, a restrição
`seller_commission_rates_id_seller_rate_unique` existe apenas para sustentar essa
referência.

Não há chave estrangeira separada de `seller_commission_rate_id`: a composta já
garante que a vigência existe.

Cadastrar uma nova vigência para o vendedor não altera nenhuma venda existente.

## Valores monetários

O crédito é `bigint` no banco e `bigint` em TypeScript, nunca `number`. Isso
elimina qualquer perda de precisão, mas tem uma consequência na borda:
`JSON.stringify` não serializa `BigInt` e quebra com `TypeError`, o que inclui
`NextResponse.json`.

A regra do projeto é converter para string decimal nos DTOs das bordas HTTP,
descrita em `docs/architecture.md`. A serialização em si entra no SCRUM-36, junto
das primeiras rotas de venda.

## Não pertence a este módulo

- manutenção dos dados cadastrais do vendedor;
- cálculo e arredondamento da comissão;
- situação financeira das parcelas de comissão.

A venda referencia o vendedor por identificador. Regras financeiras aplicadas à
venda devem ser preservadas como snapshot para que alterações futuras não mudem
o histórico.
