const phrases = [
  'Descubra sua essência.',
  'Fragrâncias que expressam personalidade.',
  'Encontre seu próximo perfume favorito.',
  'Elegância em cada fragrância.',
]

function MarqueeGroup({ duplicate = false }: { duplicate?: boolean }) {
  return (
    <ul
      className="editorial-marquee__group"
      aria-hidden={duplicate ? 'true' : undefined}
    >
      {phrases.map((phrase) => (
        <li className="editorial-marquee__item" key={phrase}>
          <span>{phrase}</span>
          <span className="editorial-marquee__separator" aria-hidden="true" />
        </li>
      ))}
    </ul>
  )
}

export function BenefitsBar() {
  return (
    <section
      className="editorial-marquee"
      aria-label="Nahla Aya — Fragrâncias"
    >
      <div className="editorial-marquee__viewport">
        <div className="editorial-marquee__track">
          <MarqueeGroup />
          <MarqueeGroup duplicate />
        </div>
      </div>
    </section>
  )
}
