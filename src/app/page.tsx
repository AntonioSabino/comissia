const firstCycle = [
  "Cadastro de vendedores",
  "Cadastro de vendas",
  "Cálculo das parcelas",
  "Comissões por vendedor",
];

export default function Home() {
  return (
    <main className="page-shell">
      <section className="hero">
        <div className="brand-mark" aria-hidden="true">
          C
        </div>
        <p className="eyebrow">MVP em construção</p>
        <h1>Comissia</h1>
        <p className="subtitle">Gestão de vendas e comissões de consórcio.</p>

        <div className="cycle-card">
          <p>Primeiro ciclo</p>
          <ul>
            {firstCycle.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
