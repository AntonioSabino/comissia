# Módulo de vendedores

Responsável pela identidade comercial dos vendedores e pelas regras que mudam ao
longo do tempo.

## Pertence a este módulo

- cadastro e atualização de vendedor;
- ativação e inativação;
- documento, e-mail e dados de contato;
- percentuais acordados e suas vigências;
- consulta do percentual válido em uma data.

## Não pertence a este módulo

- dados da venda de consórcio;
- cálculo da comissão de uma venda;
- geração ou situação de parcelas.

Outros módulos devem usar o identificador do vendedor e contratos públicos. Não
devem importar diretamente o schema ou outros arquivos de
`infrastructure`.
