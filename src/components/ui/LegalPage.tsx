import { Container } from "./primitives";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <section className="pt-14 pb-8 sm:pt-20">
      <Container>
        <h1 className="text-display-lg">{title}</h1>
        <p className="mt-4 text-sm text-muted">Last updated {updated}</p>
        <div className="prose-rcl mt-10">{children}</div>
      </Container>
    </section>
  );
}
