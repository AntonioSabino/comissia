# Módulo de vendas

Responsável pelo registro da operação comercial de consórcio e pelo estado da
venda durante seu ciclo de vida.

## Pertence a este módulo

- administradora, produto, grupo e cota;
- régua de parcelas definida pela administradora, por produto e vigência;
- snapshot da régua e do percentual usados no cálculo da venda;
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

O código interno da venda é único e gerado pelo banco no formato `V-000001`: a
sequência `sale_code_seq` numera e a função `next_sale_code()` formata. Acima de
seis dígitos o código apenas cresce (`V-1000000`), sem truncar. Grupo e cota são
indexados junto com a administradora para consulta, mas sem restrição de
unicidade: uma cota cancelada pode ser recomercializada e geraria uma segunda
venda com o mesmo par.

A situação da cota usa os termos do negócio: `adimplente`, `inadimplente`,
`cancelado` e `contemplado`. Toda venda nasce `adimplente`. A lista vive em
`domain/quota-status.ts` e é ela que define o tipo `quota_status` no banco, para
que as situações aceitas pelo domínio e pelo banco não possam divergir.

O crédito vendido é armazenado em centavos inteiros (`bigint`), nunca em ponto
flutuante. O banco recusa crédito não positivo, percentual fora de 1 a 10.000
pontos-base, quantidade de parcelas fora de 1 a 120 e primeira previsão anterior
à data da venda.

## Administradoras

A administração mantém as administradoras em `/admin/administrators`: cadastra
pelo nome, inativa e reativa. O nome é único sem diferenciar maiúsculas de
minúsculas: a aplicação confere antes de gravar, e o índice único
`administrators_name_lower_unique`, sobre `lower(name)`, garante a regra no
banco mesmo em cadastros simultâneos.
Não há exclusão, e somente administradoras ativas são oferecidas para novas
vendas (`selectActiveAdministrators`).

## Régua de parcelas da administradora

Cada administradora define como a comissão é distribuída entre as parcelas, e
essa régua vale para um produto ou plano e a partir de uma data de vigência.
`administrator_installment_rules` guarda uma linha por versão: administradora,
produto, início da vigência e a distribuição em pontos-base.

A distribuição é uma lista ordenada de inteiros, da primeira à última parcela,
gravada em `integer[]` exatamente na ordem informada. São aceitas de 1 a 120
parcelas, cada percentual entre 1 e 10.000 pontos-base, e o percentual total da
regra é a soma da lista (`installmentRuleTotalBasisPoints`). Não há ponto
flutuante em nenhuma etapa: o domínio recusa fracionários em vez de arredondar.

As restrições valem também no banco, e não apenas na aplicação:
`administrator_installment_rules_installments_check` limita a quantidade de
parcelas, `administrator_installment_rules_rates_check` limita cada percentual e
recusa elementos ausentes, e a chave estrangeira para `administrators` recusa
administradora inexistente, que o caso de uso devolve como
`AdministratorNotFoundError`.

Duas versões não podem valer ao mesmo tempo. Como cada vigência é aberta e
termina quando a próxima começa, a sobreposição seria sempre um mesmo início
repetido: o índice único
`administrator_installment_rules_effective_from_unique`, sobre administradora,
`lower(product)` e vigência, impede isso mesmo em cadastros simultâneos e mesmo
quando o produto é digitado em outra caixa. O caso de uso devolve a violação
como `DuplicateAdministratorInstallmentRuleError`.

A tabela é apenas de inclusão, como o histórico de percentuais dos vendedores:
o gatilho `administrator_installment_rules_append_only` recusa `UPDATE` e
`DELETE`. Uma nova vigência é uma nova linha, então versões históricas — e as
vendas que as usaram — não mudam. Corrigir uma régua errada é criar a vigência
seguinte.

`findAdministratorInstallmentRuleOn` responde qual régua vale em uma data: a de
maior início que não ultrapassa essa data, para a administradora e o produto
informados. A escolha é determinística e não depende da ordem devolvida pelo
banco. Sem vigência nessa data, a consulta recusa com
`MissingAdministratorInstallmentRuleError` em vez de adivinhar uma
distribuição. O produto é comparado sem diferenciar maiúsculas de minúsculas,
como no índice.

O percentual total não tem limite superior próprio: ele é o que a soma da
distribuição disser. Quem compõe a régua com o percentual do vendedor é o
módulo de comissões, que já recusa distribuição cuja soma não seja exatamente o
percentual total usado no cálculo.

A administração mantém as réguas em `/admin/installment-rules`: cadastra uma
vigência escolhendo administradora ativa, produto ou plano, data de início e a
distribuição, e vê as vigências existentes por administradora e produto, da mais
recente para a mais antiga, com a quantidade de parcelas, o percentual total e
qual delas vale hoje (`describeInstallmentRules`). Réguas longas mostram o começo
da distribuição e quantas parcelas faltam.

A distribuição é digitada em percentual — `0,75; 0,50; 0,25` — e
`parseInstallmentPercentages` a converte para pontos-base inteiros, aceitando
ponto e vírgula, espaço ou quebra de linha entre as parcelas e vírgula ou ponto
como separador decimal. A entrada em pontos-base continua aceita entre camadas,
e o erro aparece no campo que foi informado.

Antes de gravar, o repositório bloqueia a linha da administradora com
`FOR UPDATE` e confirma que ela existe e está ativa, para que uma inativação
concorrente não caia entre a conferência e a inclusão. Administradora
inexistente volta como `AdministratorNotFoundError` e inativa como erro no campo
da administradora.

A venda ainda não seleciona a régua automaticamente e nenhum snapshot da régua é
gravado na venda. Esse é o incremento seguinte.

## Cadastro de venda

A administração registra vendas em `/admin/sales`. O caso de uso `createSale`:

- valida cliente, produto, grupo e cota, datas e crédito;
- recusa venda com data futura e primeira previsão anterior à data da venda;
- confere se a administradora e o vendedor estão ativos no momento do cadastro;
- busca o percentual vigente na data da venda com `findCommissionRateOn`, do
  módulo de vendedores, e recusa a venda quando não há vigência nessa data;
- busca a régua da administradora vigente na data para o produto vendido e
  recusa a venda quando não existe régua, apontando o campo do produto;
- recusa a venda quando o percentual do vendedor excede o total da régua,
  apontando o campo do vendedor;
- grava a venda com o snapshot do percentual e da régua, e persiste as parcelas
  previstas geradas pelo módulo de comissões.

A quantidade de parcelas não é informada no formulário: ela é a da régua. Quem
define quantas parcelas a comissão tem é a administradora, não quem digita a
venda.

Falhas dessas regras voltam como `SaleValidationError`, apontando o campo
responsável, para que o formulário mostre o erro no lugar certo.

O repositório executa a confirmação dos participantes, a seleção do percentual e
da régua, a geração e a inserção da venda e das parcelas em uma única transação.
As linhas da administradora e do vendedor são bloqueadas com `FOR UPDATE` até o
fim da gravação. Assim, uma inativação ou uma nova vigência concorrente é
serializada antes ou depois da venda, sem permitir um snapshot incoerente. A
mesma operação faz uma única leitura do histórico de percentuais e uma única
leitura das vigências da régua.

## Listagem de vendas

A mesma tela `/admin/sales` lista as vendas registradas, da mais recente para a
mais antiga. A listagem exibe código, data, vendedor, administradora,
grupo/cota, crédito e situação da cota; cliente e produto participam da busca e
aparecerão na consulta detalhada.

Os filtros são combináveis: busca livre, vendedor, administradora, situação da
cota e período da venda, com os dois extremos inclusive. Eles viajam na query
string, então uma listagem filtrada pode ser compartilhada por link e o botão
voltar do navegador funciona.

`parseSaleListFilters` lê essa query string descartando o que não faz sentido:
identificador que não é UUID, situação desconhecida e data fora do calendário
são ignorados, e um período informado ao contrário é ordenado em vez de devolver
lista vazia. Assim uma URL editada à mão não derruba a página nem filtra por
engano. Os selects de vendedor e de administradora mostram também os inativos,
porque vendas antigas continuam apontando para eles.

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

## Snapshot da régua

A régua aplicada é gravada do mesmo jeito, em duas colunas que são um único
fato: `administrator_installment_rule_id` aponta a versão usada e
`installment_rates_basis_points` guarda a distribuição aplicada. A chave
estrangeira composta `sales_installment_rule_snapshot_fk` referencia
`administrator_installment_rules (id, administrator_id,
installment_rates_basis_points)`, então o banco recusa uma distribuição
diferente da régua citada e uma régua que pertença a outra administradora.

`commission_installments` da venda é a quantidade da própria distribuição, e o
banco confere isso em `sales_commission_installments_snapshot_check`.

As duas colunas aceitam nulo somente em par, para as vendas registradas antes de
a régua existir: elas não têm snapshot nem parcelas, e nenhuma régua foi
inventada para elas na migração. Toda venda nova grava as duas.

Uma nova vigência da régua não altera nenhuma venda existente nem as parcelas
já geradas.

## Valores monetários

O crédito é `bigint` no banco e `bigint` em TypeScript, nunca `number`. Isso
elimina qualquer perda de precisão, mas tem uma consequência na borda:
`JSON.stringify` não serializa `BigInt` e quebra com `TypeError`, o que inclui
`NextResponse.json`.

O crédito digitado no padrão brasileiro (`R$ 200.000,00`) vira centavos em
`BigInt` por `parseBrlToCents`, em `src/shared/money.ts`. Na saída, os DTOs das
bordas HTTP convertem para string decimal com `centsToDecimalString`, regra
descrita em `docs/architecture.md`: a resposta de `POST /api/admin/sales` devolve
o crédito como `"200000.00"`.

## Não pertence a este módulo

- manutenção dos dados cadastrais do vendedor;
- cálculo e arredondamento da comissão;
- situação financeira das parcelas de comissão.

A venda referencia o vendedor por identificador. Regras financeiras aplicadas à
venda devem ser preservadas como snapshot para que alterações futuras não mudem
o histórico.
