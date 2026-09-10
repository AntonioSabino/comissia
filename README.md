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

## Schema e migrações

O schema do PostgreSQL é definido em TypeScript com Drizzle ORM. Depois de
alterar o schema, gere e revise a migração SQL:

```bash
npm run db:generate
```

Com o PostgreSQL em execução, aplique as migrações pendentes:

```bash
npm run db:migrate
```

Para verificar a consistência do histórico ou abrir o explorador local:

```bash
npm run db:check
npm run db:studio
```

As migrações geradas na pasta `drizzle/` fazem parte do código e devem ser
versionadas. Alterações de produção devem usar migrações revisadas; o projeto
não utiliza `drizzle-kit push` como fluxo de implantação.

## Administrador inicial

Depois de aplicar as migrações, crie o primeiro administrador com nome e e-mail
explícitos:

```bash
npm run admin:create -- --name "Nome do administrador" --email "admin@empresa.com.br"
```

O comando solicita e confirma uma senha de pelo menos 12 caracteres sem
exibi-la no terminal. Ele grava somente o hash `scrypt` e recusa a operação
quando já existe um administrador. Não coloque a senha no comando, no código,
no arquivo de ambiente ou em logs.

## Executar localmente

```bash
npm install
npm run db:up
npm run dev
```

A aplicação estará disponível em `http://localhost:3000`.

## Validação

```bash
npm run format:check
npm run typecheck
npm run lint
npm run test
npm run db:check
npm run build
```

O GitHub Actions executa esses comandos automaticamente em pull requests e em
pushes para a `main`. Além disso, o CI aplica todas as migrações duas vezes em
um PostgreSQL novo, para garantir que o banco aceita a cadeia completa e que
uma segunda execução não altera nada. Uma alteração só deve ser integrada
quando o check `CI / Quality` estiver aprovado.

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
- [Arquitetura e convenções](docs/architecture.md)
