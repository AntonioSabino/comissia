# Homologação no Railway

Este procedimento publica o Comissia em um ambiente de homologação com uma
aplicação Next.js e um PostgreSQL no mesmo projeto do Railway. Use somente dados
fictícios ou anonimizados neste ambiente.

## Arquitetura

- O serviço `comissia` é criado a partir do repositório do GitHub e acompanha a
  branch `main`.
- O serviço `Postgres` armazena os dados em volume persistente.
- A aplicação acessa o banco pela rede privada do Railway usando uma variável de
  referência. O PostgreSQL não precisa de um domínio público.
- O Railway fornece um domínio HTTPS para a aplicação.
- `railway.json` executa o build, aplica as migrações antes de cada implantação,
  inicia o Next.js e valida `/api/health` antes de liberar a nova versão.

## 1. Criar o projeto

1. Entre em [railway.com](https://railway.com/) usando a conta do GitHub.
2. Crie um projeto com **Deploy from GitHub repo**.
3. Autorize o repositório privado `AntonioSabino/comissia` e selecione-o.
4. Dê ao projeto o nome `comissia-homologacao`.
5. No mesmo projeto, escolha **New > Database > Add PostgreSQL**.

O banco e a aplicação devem permanecer no mesmo ambiente para que a conexão
privada funcione durante as migrações e em tempo de execução.

## 2. Configurar as variáveis

No serviço da aplicação, abra **Variables** e cadastre:

| Variável               | Valor                        |
| ---------------------- | ---------------------------- |
| `DATABASE_URL`         | `${{Postgres.DATABASE_URL}}` |
| `NEXT_PUBLIC_APP_NAME` | `Comissia — Homologação`     |
| `BUSINESS_TIME_ZONE`   | `America/Sao_Paulo`          |
| `DEPLOYMENT_ENV`       | `staging`                    |

`DATABASE_URL` é uma referência ao segredo mantido pelo serviço PostgreSQL. Não
copie seu valor para o repositório, para a descrição da PR ou para capturas de
tela. `DEPLOYMENT_ENV=staging` marca este projeto como homologação e é uma das
duas autorizações exigidas pelo seed remoto. `NODE_ENV` e `PORT` são definidos
pela plataforma e não devem ser sobrescritos.

## 3. Publicar a aplicação

1. Em **Settings > Source**, confirme a branch `main`.
2. Em **Settings > Networking**, gere um domínio do Railway.
3. Inicie ou repita a implantação.
4. Nos logs, confirme que `npm run db:migrate` terminou antes da inicialização.
5. Aguarde o health check ficar saudável.

O domínio público deve abrir a tela de login por HTTPS. O endpoint
`/api/health` responde `{"status":"ok"}` quando a aplicação consegue consultar
o banco. Ele não divulga endereço, credenciais ou detalhes de falhas.

## 4. Carregar os dados fictícios

O seed recusa bancos remotos por padrão. Para a primeira homologação, execute-o
uma única vez em um shell do serviço da aplicação, com a autorização explícita
abaixo:

```bash
npm run db:seed -- --allow-remote
```

A execução remota somente é aceita quando o comando inclui `--allow-remote` e o
serviço possui `DEPLOYMENT_ENV=staging`. Não altere `NODE_ENV`: o Next.js deve
continuar executando com `NODE_ENV=production`.

Anote a senha sorteada do administrador exibida nessa primeira execução. O
e-mail é `admin@exemplo.test`. Uma nova execução mantém os registros existentes
e não mostra novamente a senha.

Nunca rode esse comando em produção nem carregue dados reais no ambiente de
homologação.

## 5. Validar

1. Abra o domínio do Railway e confirme o cadeado HTTPS.
2. Acesse `/api/health` e confirme a resposta `{"status":"ok"}`.
3. Entre com o administrador fictício.
4. Confira administradoras, vendedores, vendas e parcelas.
5. Abra uma venda e altere a situação da cota para validar escrita e histórico.
6. Saia da conta e confirme que as páginas administrativas exigem autenticação.

## Novas versões

Depois do primeiro deploy, cada merge na `main` inicia uma nova implantação. As
migrações pendentes rodam no pre-deploy; se uma migração falhar, a versão nova
não substitui a que já está disponível.

Não inclua o seed no pre-deploy. Ele é uma operação deliberada e separada das
migrações.

## Diagnóstico e recuperação

- **Health check 503:** confira se `DATABASE_URL` referencia o serviço
  PostgreSQL e se o banco está ativo.
- **Migração falhou:** leia o log do pre-deploy. Corrija a migração no código;
  não use `drizzle-kit push` no ambiente remoto.
- **Aplicação não inicia:** confira os logs do serviço e se o comando inicial é
  `npm run start`.
- **Nova versão apresentou erro:** faça rollback para a implantação anterior no
  Railway. Migrações já aplicadas não são desfeitas automaticamente.
- **Senha inicial foi perdida:** não rode o seed esperando outra senha. Crie um
  procedimento explícito de recuperação antes de expor o ambiente a usuários
  externos.

## Encerrar o ambiente

Antes de remover o serviço PostgreSQL, exporte qualquer dado fictício que ainda
seja necessário. Excluir o banco ou o volume é uma operação destrutiva e não é
equivalente a apenas parar a aplicação.
