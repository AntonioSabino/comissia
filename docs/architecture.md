# Arquitetura do projeto

## Decisão principal

A Comissia é um **monólito modular** em Next.js. Interface, casos de uso e
acesso ao PostgreSQL são publicados como uma única aplicação, mas as regras são
organizadas por capacidade de negócio.

Essa estrutura mantém a operação simples e barata para o MVP sem misturar as
regras de vendedores, vendas e comissões.

## Estrutura

```text
src/
├── app/                         # rotas, páginas e endpoints Next.js
│   ├── _components/             # componentes de interface (ui/ e shell/)
│   └── styles/                  # tokens do Design System
├── db/
│   ├── schema.ts                # registro dos schemas Drizzle
│   └── ...                      # conexão e infraestrutura compartilhada
├── modules/
│   ├── sellers/                 # vendedores e vigências de comissão
│   ├── sales/                   # vendas de consórcio
│   └── commissions/             # cálculo e parcelas de comissão
└── shared/                      # código técnico reutilizável e sem regra de negócio
```

Cada módulo pode crescer internamente conforme a necessidade:

```text
<module>/
├── domain/                      # entidades, valores e regras puras
├── application/                 # casos de uso e contratos
├── infrastructure/             # Drizzle e integrações externas
└── README.md                    # responsabilidade e dependências permitidas
```

Pastas internas só devem ser criadas quando houver código para elas. Não
manteremos arquivos vazios apenas para reproduzir a árvore acima.

## Responsabilidade das áreas

### `src/app`

É a camada de entrada da aplicação. Recebe dados HTTP, executa validações de
formato, chama um caso de uso e converte o resultado em resposta ou interface.
Não contém cálculo de comissão nem consultas Drizzle diretamente.

### `src/modules`

Contém o comportamento do negócio. Cada módulo controla seus próprios conceitos,
casos de uso e persistência.

- `sellers`: cadastro, situação e histórico de percentuais dos vendedores.
- `sales`: registro e situação das vendas de consórcio, administradoras e a
  régua de parcelas que cada uma define por produto e vigência.
- `commissions`: snapshot da regra aplicada, cálculo e geração de parcelas.

### `src/db`

Mantém a conexão compartilhada e o registro de schemas usado pelo Drizzle. A
definição de uma tabela pertence ao módulo responsável e é reexportada por
`src/db/schema.ts` para geração de migrações.

### `src/shared`

Aceita somente recursos técnicos realmente compartilhados, como tipos de
resultado, erros base e utilitários de validação. Regras de vendedores, vendas ou
comissões nunca devem ser movidas para `shared`.

## Dependências entre módulos

1. `app` pode importar a API pública dos módulos.
2. Um módulo não importa arquivos internos de outro módulo.
3. Comunicação entre módulos ocorre por contratos ou pela API pública do módulo.
4. `domain` não depende de Next.js, Drizzle ou detalhes HTTP.
5. `application` pode depender de `domain` e de contratos.
6. `infrastructure` implementa contratos e pode depender de Drizzle.
7. Dependências circulares não são permitidas.

No primeiro fluxo, uma venda referencia um vendedor por identificador. O módulo
de comissões recebe os dados necessários para calcular e persiste o percentual
usado na venda. Ele não deve consultar silenciosamente o percentual atual para
recalcular vendas antigas.

## Validação

A validação acontece em dois níveis:

- **entrada**: formato, campos obrigatórios e limites de tamanho;
- **domínio**: regras que precisam ser verdadeiras independentemente da origem
  dos dados.

Dados externos não chegam diretamente ao Drizzle. A camada de entrada valida e
normaliza os dados antes de chamar o caso de uso.

## Tratamento de erros

Erros esperados de negócio devem ser representados por erros tipados, por
exemplo: vendedor não encontrado, documento duplicado ou percentual inválido.
A camada de entrada converte esses erros em mensagens e códigos adequados.

Erros inesperados não devem ser ocultados nem enviados integralmente ao usuário.
Eles são registrados com contexto técnico e retornam uma mensagem segura.

## Banco e transações

- Valores monetários são armazenados em centavos inteiros ou em `numeric` com
  escala explícita; nunca em ponto flutuante.
- Centavos em colunas `bigint` chegam ao TypeScript como `BigInt` e permanecem
  assim em todo o núcleo da aplicação. Converter para `number` é proibido: acima
  de 2^53 o valor deixa de ser exato.
- Como `JSON.stringify` não serializa `BigInt`, os DTOs das bordas HTTP
  convertem esses valores para string decimal. A conversão acontece na borda, no
  momento de montar a resposta, e nunca no domínio.
- Datas de negócio e instantes devem ter significados distintos e explícitos.
- Alterações que precisam ocorrer juntas usam uma única transação.
- Migrações são geradas, revisadas e versionadas.
- Alterar uma regra atual não modifica snapshots de vendas antigas.

## Interface

A interface segue o Comissia Design System, entregue pelo Claude Design. O
pacote é especificação, não código de produção: os componentes dele usam estilo
inline e são reescritos aqui.

- Os tokens de cor, tipografia, espaçamento, bordas, sombras e movimento ficam
  em `src/app/styles/tokens.css` e são a fonte de cores e medidas das telas.
- Componentes reutilizáveis ficam em `src/app/_components/`: `ui/` para os
  primitivos e `shell/` para o menu lateral e a estrutura das áreas.
- Cada componente tem o seu CSS Module ao lado. Não há estilo inline.
- Ícones vêm do `lucide-react`; Inter e JetBrains Mono vêm do `next/font`.
- Valores, percentuais, datas e códigos usam a classe `num`, com algarismos
  tabulares.
- Verde marca dinheiro, comissão e situações positivas nos badges (como
  vendedor ativo ou vigência atual); cobalto marca ação e navegação. Um controle
  nunca é verde.
- Um componente do Design System entra quando uma história precisa dele, não por
  antecipação.

## Convenções

- Arquivos e diretórios: `kebab-case`.
- Componentes React, tipos e classes: `PascalCase`.
- Funções, variáveis e casos de uso: `camelCase`.
- Tabelas e colunas PostgreSQL: `snake_case`.
- Casos de uso usam verbo no infinitivo, como `createSeller`.
- Imports internos usam o alias `@/` quando isso melhora a leitura.
- A API pública de um módulo deve ser pequena e explícita.
- Código específico de framework fica nas bordas, não no domínio.

## Testes

- Regras de domínio têm testes unitários sem banco.
- Casos de uso usam contratos substituíveis em testes.
- Persistência tem testes de integração com PostgreSQL.
- O fluxo principal terá teste de ponta a ponta quando suas partes estiverem
  implementadas.

Testes ficam próximos do código testado usando o sufixo `.test.ts` ou
`.test.tsx`.

## Critério para novas abstrações

Uma abstração só será criada quando houver uma necessidade concreta ou repetição
real. O MVP não terá repositórios genéricos, barramento de eventos ou camadas
adicionais apenas por antecipação.
