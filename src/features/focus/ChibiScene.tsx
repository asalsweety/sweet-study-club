import type { ChibiScene as SceneId } from './scenes'
import { sceneThemes } from './scenes'

type ChibiSceneProps = {
  scene: SceneId
  isNight: boolean
  state: 'studying' | 'break' | 'paused'
  className?: string
}

// Pure SVG + CSS so it scales crisply, themes cheaply and needs no assets.
export default function ChibiScene({ scene, isNight, state, className }: ChibiSceneProps) {
  const theme = sceneThemes[scene]
  const sky = isNight ? theme.nightSky : theme.daySky
  const drops = Array.from({ length: 26 }, (_, index) => index)

  return (
    <svg viewBox="0 0 400 300" className={className} role="img" aria-label="Chibi Asal در اتاق مطالعه">
      <style>{`
        .c-blink { animation: c-blink 5s infinite; transform-origin: center; transform-box: fill-box; }
        @keyframes c-blink { 0%, 92%, 100% { transform: scaleY(1) } 95% { transform: scaleY(0.1) } }
        .c-write { animation: c-write 0.9s ease-in-out infinite alternate; transform-origin: 250px 205px; }
        @keyframes c-write { from { transform: rotate(-4deg) } to { transform: rotate(5deg) translateX(3px) } }
        .c-breathe { animation: c-breathe 4s ease-in-out infinite; transform-origin: 200px 230px; }
        @keyframes c-breathe { 50% { transform: scale(1.012) } }
        .c-steam { animation: c-steam 3s ease-in-out infinite; opacity: 0.6 }
        @keyframes c-steam { 0% { transform: translateY(0); opacity: 0 } 40% { opacity: .6 } 100% { transform: translateY(-18px); opacity: 0 } }
        .c-tail { animation: c-tail 2.6s ease-in-out infinite; transform-origin: 92px 236px; }
        @keyframes c-tail { 50% { transform: rotate(14deg) } }
        .c-drop { animation: c-fall linear infinite; }
        @keyframes c-fall { from { transform: translateY(-40px) } to { transform: translateY(150px) } }
        .c-twinkle { animation: c-twinkle 3s ease-in-out infinite; }
        @keyframes c-twinkle { 50% { opacity: .2 } }
        @media (prefers-reduced-motion: reduce) { .c-blink, .c-write, .c-breathe, .c-steam, .c-tail, .c-drop, .c-twinkle { animation: none } }
      `}</style>

      <rect width="400" height="300" fill={theme.wall} />
      {/* Window */}
      <g>
        <rect x="236" y="28" width="136" height="118" rx="14" fill={sky} />
        <clipPath id={`c-win-${scene}`}>
          <rect x="236" y="28" width="136" height="118" rx="14" />
        </clipPath>
        <g clipPath={`url(#c-win-${scene})`}>
          {isNight ? (
            <>
              <circle cx="340" cy="56" r="13" fill="#fdf4c4" />
              {[[262, 50], [290, 70], [318, 44], [356, 96], [276, 104]].map(([x, y], i) => (
                <circle key={i} className="c-twinkle" style={{ animationDelay: `${i * 0.6}s` }} cx={x} cy={y} r="1.8" fill="#fff" />
              ))}
            </>
          ) : (
            <circle cx="338" cy="58" r="16" fill="#ffd96b" />
          )}
          {theme.weather !== 'clear' &&
            drops.map((index) => (
              <rect
                key={index}
                className="c-drop"
                x={238 + ((index * 37) % 134)}
                y={20 + ((index * 53) % 60)}
                width={theme.weather === 'snow' ? 3.5 : 1.4}
                height={theme.weather === 'snow' ? 3.5 : 9}
                rx="2"
                fill={theme.weather === 'snow' ? '#ffffff' : '#bcd7ff'}
                style={{ animationDuration: `${theme.weather === 'snow' ? 4 + (index % 4) : 0.8 + (index % 3) * 0.2}s`, animationDelay: `${(index % 7) * -0.4}s` }}
              />
            ))}
        </g>
        <rect x="236" y="28" width="136" height="118" rx="14" fill="none" stroke={theme.frame} strokeWidth="7" />
        <line x1="304" y1="28" x2="304" y2="146" stroke={theme.frame} strokeWidth="5" />
        <line x1="236" y1="87" x2="372" y2="87" stroke={theme.frame} strokeWidth="5" />
      </g>

      {/* Shelf + lamp glow */}
      <rect x="28" y="70" width="120" height="8" rx="4" fill={theme.wood} />
      {['#f9a8d4', '#a5b4fc', '#fcd34d', '#86efac'].map((color, i) => (
        <rect key={color} x={36 + i * 18} y={38 + (i % 2) * 4} width="13" height={32 - (i % 2) * 4} rx="3" fill={color} />
      ))}
      {isNight && <ellipse cx="96" cy="190" rx="120" ry="70" fill="#ffe7a3" opacity="0.18" />}

      {/* Chibi Asal */}
      <g className="c-breathe">
        <path d="M150 262 Q200 196 252 262 Z" fill={theme.sweater} />
        <circle cx="200" cy="160" r="52" fill="#3b2a3f" />
        <circle cx="200" cy="108" r="20" fill="#3b2a3f" />
        <circle cx="200" cy="168" r="42" fill="#ffe1cf" />
        <path d="M158 160 Q170 116 200 122 Q232 116 242 160 Q232 136 200 140 Q170 136 158 160 Z" fill="#3b2a3f" />
        <circle cx="216" cy="114" r="6" fill={theme.accent} />
        {state === 'break' ? (
          <>
            <path d="M178 170 Q184 176 190 170" stroke="#3b2a3f" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M210 170 Q216 176 222 170" stroke="#3b2a3f" strokeWidth="3" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <ellipse className="c-blink" cx="184" cy="172" rx="5" ry="6.5" fill="#3b2a3f" />
            <ellipse className="c-blink" cx="216" cy="172" rx="5" ry="6.5" fill="#3b2a3f" />
          </>
        )}
        <ellipse cx="174" cy="186" rx="7" ry="4" fill="#ffadc6" opacity="0.8" />
        <ellipse cx="226" cy="186" rx="7" ry="4" fill="#ffadc6" opacity="0.8" />
        <path d="M194 192 Q200 197 206 192" stroke="#c2566f" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </g>

      {/* Desk */}
      <rect x="0" y="236" width="400" height="64" fill={theme.wood} />
      <rect x="0" y="232" width="400" height="8" fill={theme.woodLight} />
      <rect x="150" y="214" width="76" height="22" rx="4" fill="#fffaf2" />
      <line x1="188" y1="214" x2="188" y2="236" stroke="#e8dccb" strokeWidth="2" />
      {state === 'studying' && (
        <g className="c-write">
          <circle cx="246" cy="222" r="9" fill="#ffe1cf" />
          <rect x="236" y="196" width="4" height="30" rx="2" fill={theme.accent} transform="rotate(25 238 211)" />
        </g>
      )}
      {/* Mug */}
      <rect x="292" y="206" width="26" height="28" rx="6" fill={theme.accent} />
      <path d="M318 214 q10 0 10 8 q0 8 -10 8" stroke={theme.accent} strokeWidth="4" fill="none" />
      {[0, 1].map((i) => (
        <path key={i} className="c-steam" style={{ animationDelay: `${i * 1.4}s` }} d={`M${300 + i * 9} 200 q-5 -8 0 -14 q5 -6 0 -12`} stroke="#ffffff" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      ))}
      {/* Sleeping cat */}
      <g>
        <ellipse cx="72" cy="228" rx="34" ry="14" fill="#f4b183" />
        <circle cx="46" cy="220" r="12" fill="#f4b183" />
        <path d="M37 212 l3 -10 l6 7 z M48 210 l5 -9 l4 9 z" fill="#f4b183" />
        <path d="M41 221 q3 2 6 0" stroke="#7a4a2b" strokeWidth="1.6" fill="none" />
        <path className="c-tail" d="M104 230 q20 -2 16 -20" stroke="#f4b183" strokeWidth="8" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  )
}
