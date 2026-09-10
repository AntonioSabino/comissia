import { Card } from "@/app/_components/ui/card";
import { PageBody } from "@/app/_components/ui/page-layout";
import { LoadingRows } from "@/app/_components/ui/state-block";

export default function AdminLoading() {
  return (
    <PageBody>
      <Card flush>
        <LoadingRows rows={5} columns={5} label="Carregando a página" />
      </Card>
    </PageBody>
  );
}
