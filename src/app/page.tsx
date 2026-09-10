import { ArrowRight } from "lucide-react";
import { BrandMark } from "@/app/_components/shell/brand-mark";
import { ButtonLink } from "@/app/_components/ui/button";
import { Card, CardHeading } from "@/app/_components/ui/card";
import styles from "./home.module.css";

const firstCycle = [
  "Cadastro de vendedores",
  "Cadastro de vendas",
  "Cálculo das parcelas",
  "Comissões por vendedor",
];

export default function Home() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <BrandMark size="lg" />
        <p className={styles.eyebrow}>MVP em construção</p>
        <h1 className={styles.title}>Comissia</h1>
        <p className={styles.subtitle}>
          Gestão de vendas e comissões de consórcio.
        </p>
        <ButtonLink href="/login" size="lg" iconAfter={ArrowRight}>
          Acessar a Comissia
        </ButtonLink>

        <Card className={styles.cycle}>
          <CardHeading title="Primeiro ciclo" />
          <ul className={styles.cycleList}>
            {firstCycle.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
      </section>
    </main>
  );
}
