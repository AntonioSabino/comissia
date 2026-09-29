"use client";

import { Printer } from "lucide-react";
import { Button } from "@/app/_components/ui/button";

/** O PDF sai do diálogo de impressão do navegador ("Salvar como PDF"). */
export function PrintButton() {
  return (
    <Button icon={Printer} onClick={() => window.print()}>
      Imprimir ou salvar PDF
    </Button>
  );
}
