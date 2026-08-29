# Módulo de vendedores

Responsável pela identidade comercial dos vendedores e pelas regras que mudam ao
longo do tempo.

## Pertence a este módulo

- cadastro e atualização de vendedor;
- ativação e inativação;
- documento, e-mail e dados de contato;
- percentuais acordados e suas vigências;
- consulta do percentual válido em uma data.

## Histórico de percentuais

Cada novo acordo gera um registro em `seller_commission_rates`; registros
anteriores não são atualizados nem removidos. O percentual válido em uma data é
o registro do vendedor com a maior `effective_from` que não ultrapasse a data
consultada.

O percentual é armazenado em pontos-base para evitar arredondamentos de ponto
flutuante: `200` representa 2% e `250` representa 2,5%. São aceitos valores
entre 1 e 10.000 pontos-base. Um vendedor pode ter somente uma regra iniciando
na mesma data.

## Não pertence a este módulo

- dados da venda de consórcio;
- cálculo da comissão de uma venda;
- geração ou situação de parcelas.

Outros módulos devem usar o identificador do vendedor e contratos públicos. Não
devem importar diretamente o schema ou outros arquivos de
`infrastructure`.
