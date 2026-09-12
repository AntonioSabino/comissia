# Autenticação e acesso

O módulo `auth` controla as contas que acessam a Comissia, seus perfis e o
vínculo entre uma conta de vendedor e o cadastro comercial correspondente.

## Perfis

- `admin`: administra a operação e não possui vínculo com vendedor.
- `seller`: acessa apenas sua área e deve possuir um vínculo com vendedor.

O perfil é persistido pelo enum PostgreSQL `user_role`. A restrição
`users_role_seller_link_check` garante que contas `seller` possuam
`seller_id` e que contas `admin` não possuam esse vínculo.

`seller_id` é único: um cadastro de vendedor não pode ser associado a mais de
uma conta de acesso.

## Administrador inicial

O primeiro administrador é criado uma única vez pelo comando
`npm run admin:create`. Nome e e-mail são argumentos obrigatórios, enquanto a
senha é lida e confirmada de forma oculta em um terminal interativo.

O fluxo normaliza nome e e-mail, exige ao menos 12 caracteres na senha, impede
e-mail duplicado e recusa a criação se já houver um administrador. Nenhuma senha
padrão existe no código ou na configuração.

## Acesso do vendedor

A administração cria e controla o acesso de cada vendedor na página do próprio
cadastro, em `/admin/sellers/{id}`. O acesso reaproveita o que já existe: o
e-mail do cadastro vira o e-mail de login, e a conta nasce com perfil `seller`
vinculada àquele vendedor.

A senha do primeiro acesso é sorteada por `generateTemporaryPassword` e
devolvida uma única vez, na resposta que cria o acesso, para o administrador
repassar ao vendedor. A interface a mantém visível, inclusive depois de atualizar
os dados da página, até o administrador confirmar que a copiou. Depois dessa
confirmação ela não pode ser recuperada: não é gravada em lugar nenhum além do
hash e não vai para log. Nenhum administrador escolhe a senha de outra pessoa.

Criar o acesso duas vezes é recusado pelo banco antes de qualquer duplicação:
`users_seller_id_unique` impede o segundo vínculo e `users_email_unique` impede
o e-mail repetido. Como o e-mail vem do próprio cadastro, a segunda tentativa
esbarra primeiro na unicidade do e-mail; o repositório distingue os dois casos
para que a mensagem aponte o vínculo existente, e não um e-mail de terceiros.

Alterações posteriores no nome ou no e-mail cadastral também atualizam a conta
vinculada. As duas tabelas são gravadas na mesma transação; se o novo e-mail já
pertencer a outro usuário, nenhuma das alterações é mantida.

`changeSellerAccess` libera e bloqueia. Bloquear não apaga nada: a conta
continua vinculada e as vendas, vigências e histórico seguem intactos. O
bloqueio encerra as sessões abertas do vendedor na mesma transação. A criação de
sessão bloqueia a linha do usuário e confere novamente `users.active`, de modo
que login e bloqueio concorrentes são serializados: nenhuma sessão sobrevive e
nenhum login novo é aceito.

## Senhas

A tabela armazena somente `password_hash`. Senhas usam `scrypt` com salt
aleatório e comparação em tempo constante. Os parâmetros usados na derivação
fazem parte do hash e são validados contra limites seguros antes da verificação.
Senhas em texto puro nunca devem ser persistidas.

## Login e sessões

- Credenciais inválidas retornam sempre a mesma mensagem.
- A sessão dura sete dias e usa um token aleatório de 256 bits.
- Somente o SHA-256 do token é persistido na tabela `sessions`.
- O navegador recebe o token em cookie `HttpOnly`, `SameSite=Lax` e
  `Secure` em produção.
- O logout apaga a sessão do PostgreSQL antes de expirar o cookie.

## Limite de tentativas

Antes de executar o `scrypt`, o login limita tentativas em janelas de 15
minutos:

- até 5 tentativas por e-mail;
- até 50 tentativas por endereço IP.

O limite por e-mail é reiniciado após um login válido. Os contadores permanecem
na memória do processo para evitar infraestrutura adicional no MVP de instância
única. Antes de executar múltiplas instâncias, esse estado deve migrar para um
armazenamento compartilhado.

## Autorização por perfil

A autenticação de uma requisição consulta o hash do cookie na tabela
`sessions` e só retorna usuários ativos com sessão ainda válida. O hash da
senha nunca faz parte desse resultado.

- `/admin` e cada página abaixo dela exigem o perfil `admin`;
- `/seller` e cada página abaixo dela exigem o perfil `seller`;
- usuários sem sessão válida são redirecionados para `/login`;
- usuários autenticados no perfil incorreto são redirecionados para sua própria
  área;
- usuários já autenticados não retornam à tela de login.

Os layouts e cada página protegida usam `requirePageRole`. A repetição é
intencional: layouts compartilhados podem ser reutilizados durante navegações
no cliente, enquanto a página ou sua camada de dados deve revalidar a sessão.

Operações administrativas em Route Handlers devem usar
`authorizeCurrentUser("admin")`. O resultado `unauthenticated` corresponde a
`401`, `forbidden` a `403` e `authorized` contém o usuário permitido. A
verificação acontece no servidor; esconder links no navegador é apenas uma
melhoria de interface e não substitui autorização.
