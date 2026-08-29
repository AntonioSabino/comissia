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

- `/admin` e todas as páginas abaixo dela exigem o perfil `admin`;
- `/seller` e todas as páginas abaixo dela exigem o perfil `seller`;
- usuários sem sessão válida são redirecionados para `/login`;
- usuários autenticados no perfil incorreto são redirecionados para sua própria
  área;
- usuários já autenticados não retornam à tela de login.

Os layouts protegidos usam `requirePageRole`. Operações administrativas em
Route Handlers devem usar `authorizeCurrentUser("admin")` e responder com
`401` ou `403` quando não houver o perfil exigido. A verificação acontece no
servidor; esconder links no navegador é apenas uma melhoria de interface e não
substitui autorização.
