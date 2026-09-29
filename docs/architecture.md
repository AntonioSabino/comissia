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
- `sales`: registro e situação das vendas de consórcio, administradoras, a régua
  de parcelas que cada uma define por produto e vigência e a persistência das
  parcelas geradas junto com a venda.
- `commissions`: cálculo, distribuição, agenda e situações das parcelas.

As parcelas são geradas e gravadas dentro da transação da venda, e a tabela
referencia a venda. Manter a definição dela em `sales` é o que impede a
dependência circular: `sales` usa as regras de `commissions`, e `commissions`
não conhece `sales`. As regras continuam inteiras em `commissions` — quem
calcula, distribui e decide situação é ele, sem saber onde os dados moram.

### `src/db`

Mantém a conexão compartilhada e o registro de schemas usado pelo Drizzle. A
definição de uma tabela pertence ao módulo responsável e é reexportada por
`src/db/schema.ts` para geração de migrações.

### `src/shared`

Aceita somente recursos técnicos realmente compartilhados, como tipos de
resultado, erros base e utilitários de validação. Regras de vendedores, vendas ou
comissões nunca devem ser movidas para `shared`.

A escolha da versão vigente em uma data (`findRuleValidOn`) é o limite desse
critério: ela apenas ordena registros por `effectiveFrom` e não conhece
percentual, venda nem comissão. O significado de negócio continua em cada
módulo, em `findCommissionRateOn` e em `findAdministratorInstallmentRuleOn`, que
decidem o que fazer quando não existe versão vigente. Um utilitário assim só é
promovido para `shared` quando já tem dois usos reais e nenhum conceito de
negócio no corpo.

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
- CPF, telefone, percentual e valores em reais usam `MaskedInput`, que formata
  enquanto se digita sem virar campo controlado (o formulário continua lendo o
  `FormData`). A máscara é só de interface: o servidor aceita e valida o valor
  com ou sem formatação. Datas usam o campo nativo do navegador.

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
- O fluxo principal tem teste de ponta a ponta em `src/main-flow.db.test.ts`,
  do cadastro do vendedor até ele ver a própria comissão autenticado.

Os testes de integração ficam em arquivos `.db.test.ts` e têm comando próprio
(`npm run test:db`), para que `npm run test` continue sem depender de banco.
Eles rodam em um banco descartável, recriado a cada execução.

Testes ficam próximos do código testado usando o sufixo `.test.ts` ou
`.test.tsx`.

## Critério para novas abstrações

Uma abstração só será criada quando houver uma necessidade concreta ou repetição
real. O MVP não terá repositórios genéricos, barramento de eventos ou camadas
adicionais apenas por antecipação.
