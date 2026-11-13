import { useState } from 'react'

type HelperCharacterProps = {
  className?: string
  play?: boolean
}

/** Registered sprite frames keep the face and body still while the hand waves. */
export default function HelperCharacter({ className = '', play = false }: HelperCharacterProps) {
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  if (failed) return <img src="/images/asal-helper-cozy.webp" alt="" className={`${className} object-contain`} draggable="false" />

  return (
    <span className={`asal-character ${className}`} aria-hidden="true">
      <img
        src="/images/asal-helper-greeting.webp"
        alt=""
        width="768"
        height="512"
        draggable="false"
        className={`asal-character-sheet${play && ready ? ' asal-character-greeting' : ''}`}
        onLoad={() => setReady(true)}
        onError={() => setFailed(true)}
      />
    </span>
  )
}
