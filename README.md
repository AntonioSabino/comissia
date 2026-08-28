# Comissia

Sistema de gestão de vendas e comissões de consórcio.

## Requisitos

- Node.js 20.9 ou superior.
- npm 10 ou superior.
- Docker Desktop.

## Configurar o ambiente

Crie o arquivo local de variáveis a partir do exemplo:

```bash
cp .env.example .env.local
```

O `.env.local` contém as credenciais usadas pelo PostgreSQL e pela aplicação e
não deve ser versionado.

## Banco de dados local

Inicie o PostgreSQL:

```bash
npm run db:up
```

O banco ficará disponível em `localhost:5432`. Para conferir a inicialização:

```bash
docker compose ps
npm run db:logs
```

Para encerrar o banco sem apagar os dados:

```bash
npm run db:down
```

Os dados ficam armazenados no volume Docker `comissia_postgres_data`. O comando
`docker compose down -v` também remove esse volume e deve ser usado somente
quando for necessário recriar o banco do zero.

## Executar localmente

```bash
npm install
npm run db:up
npm run dev
```

A aplicação estará disponível em `http://localhost:3000`.

## Validação

```bash
npm run lint
npm run test
npm run build
```

## Objetivo do MVP

Permitir que a corretora cadastre as vendas efetuadas, calcule as parcelas de comissão e mostre ao vendedor quanto ele tem a receber em cada mês.

## Primeiro ciclo

- Cadastro e edição de vendedores.
- Configuração do percentual de comissão acordado com cada vendedor.
- Cadastro de vendas efetuadas.
- Cálculo das parcelas de comissão.
- Data prevista de pagamento de cada parcela.
- Situação da venda: adimplente, inadimplente, cancelada ou contemplada.
- Visão mensal das comissões do vendedor.
- Separação entre o percentual da corretora e o percentual visível ao vendedor.

## Fora do primeiro ciclo

- Conciliação automática de extratos das administradoras.
- Gestão completa de parceiros e indicadores.
- Importação de arquivos das administradoras.
- Metas e classificações comerciais.
- Repasse financeiro e demonstrativos definitivos.

Esses módulos serão adicionados depois que o fluxo principal de vendas e comissões estiver validado com dados reais.

## Documentação

- [Escopo inicial do MVP](docs/mvp.md)
