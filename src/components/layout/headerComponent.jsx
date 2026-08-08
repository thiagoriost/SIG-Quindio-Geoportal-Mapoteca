export default function HeaderComponent({ children, sectionClassName = 'home-hero', contentClassName = 'home-hero-content' }) {
  return (
    <section className={sectionClassName}>
      <div className={contentClassName}>{children}</div>
    </section>
  )
}