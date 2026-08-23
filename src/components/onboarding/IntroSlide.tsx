type Props = {
  title: string
  text: string
  icon: string
}

export default function IntroSlide({
  title,
  text,
  icon,
}: Props) {
  return (
    <section className="intro-slide">

      <div className="intro-icon">
        {icon}
      </div>

      <h1>
        {title}
      </h1>

      <p>
        {text}
      </p>

    </section>
  )
}
