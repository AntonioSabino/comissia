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

## Senhas

A tabela armazena somente `password_hash`. A geração e a verificação segura do
hash pertencem aos casos de uso de autenticação e serão implementadas junto ao
login. Senhas em texto puro nunca devem ser persistidas.

## Login e sessões

- Senhas usam `scrypt` com salt aleatório e comparação em tempo constante.
- Credenciais inválidas retornam sempre a mesma mensagem.
- A sessão dura sete dias e usa um token aleatório de 256 bits.
- Somente o SHA-256 do token é persistido na tabela `sessions`.
- O navegador recebe o token em cookie `HttpOnly`, `SameSite=Lax` e
  `Secure` em produção.
- O logout apaga a sessão do PostgreSQL antes de expirar o cookie.

A autorização de páginas e operações de acordo com o perfil é responsabilidade
da etapa de proteção de rotas.
