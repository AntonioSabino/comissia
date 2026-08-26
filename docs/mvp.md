# Escopo inicial do MVP

## Perfis

### Administração

- Cadastra e edita vendedores.
- Define o percentual de comissão de cada vendedor diretamente sobre o crédito vendido.
- Cadastra e edita vendas.
- Define o plano de parcelas e as datas previstas de pagamento.
- Atualiza a situação da venda e das parcelas.

### Vendedor

- Visualiza somente as próprias vendas.
- Visualiza seu percentual de comissão, sem acesso ao percentual recebido pela corretora.
- Consulta as parcelas no formato `1/x`, `2/x` e assim por diante.
- Consulta os valores previstos para cada mês.
- Identifica parcelas previstas, canceladas e pagas.

## Dados mínimos do vendedor

- Nome.
- CPF ou CNPJ.
- E-mail.
- Telefone.
- Percentual de comissão acordado.
- Data de vigência do percentual.
- Situação: ativo ou inativo.

Alterações futuras no percentual não devem modificar vendas anteriores.

## Dados mínimos da venda

- Código interno.
- Cliente.
- Administradora.
- Produto.
- Grupo e cota.
- Data da venda.
- Crédito vendido.
- Vendedor responsável.
- Percentual do vendedor aplicado à venda.
- Quantidade de parcelas da comissão.
- Datas previstas das parcelas.
- Situação do cliente: adimplente, inadimplente, cancelado ou contemplado.

## Regra principal de cálculo

```text
comissão total do vendedor = crédito vendido × percentual acordado
valor da parcela = comissão total do vendedor ÷ quantidade de parcelas
```

O sistema deve preservar os centavos na distribuição. Quando a divisão não for exata, o ajuste será aplicado na última parcela.

## Critérios do primeiro incremento

1. A administração consegue cadastrar um vendedor e seu percentual.
2. A administração consegue cadastrar uma venda vinculada ao vendedor.
3. O sistema calcula e persiste todas as parcelas previstas.
4. O vendedor consegue consultar suas vendas e comissões por competência mensal.
5. O percentual recebido pela corretora não aparece na visão do vendedor.
