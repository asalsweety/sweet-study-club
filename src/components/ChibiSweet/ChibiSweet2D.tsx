import './ChibiSweet.css'

type SceneTime =
  | 'morning'
  | 'afternoon'
  | 'evening'
  | 'night'

type Props = {
  sceneTime: SceneTime
  leaving: boolean
  onStart: () => void
}

const sceneLabels: Record<SceneTime, string> = {
  morning: 'صبح بخیر ☀️',
  afternoon: 'یه بعدازظهر آروم 🌤️',
  evening: 'عصر بخیر 🌷',
  night: 'شب بخیر 🌙',
}

export default function ChibiSweet2D({
  sceneTime,
  leaving,
  onStart,
}: Props) {
  return (
    <div
      className={`chibi-scene scene-${sceneTime} ${
        leaving ? 'scene-leaving' : ''
      }`}
    >
      <div className="scene-sky">
        <div className="window">
          <div className="window-sky" />
          <div className="window-cloud cloud-one" />
          <div className="window-cloud cloud-two" />
          <div className="window-moon" />
          <div className="window-stars">
            <span>✦</span>
            <span>·</span>
            <span>✦</span>
          </div>
        </div>
      </div>

      <div className="room">
        <div className="wall-decoration decoration-one">
          ♡
        </div>

        <div className="wall-decoration decoration-two">
          ✿
        </div>

        <div className="bookshelf">
          <div className="shelf-top">
            <span>📚</span>
            <span>📕</span>
            <span>📗</span>
            <span>📘</span>
          </div>

          <div className="shelf-bottom">
            <span>📖</span>
            <span>🌷</span>
            <span>📚</span>
          </div>
        </div>

        <div className="desk">
          <div className="desk-top">
            <div className="laptop">
              <div className="laptop-screen">
                <span>Sweet</span>
                <small>Study Club</small>
              </div>
              <div className="laptop-base" />
            </div>

            <div className="ipad">
              <div className="ipad-screen">
                ✦
              </div>
            </div>

            <div className="coffee">
              <div className="coffee-steam steam-one" />
              <div className="coffee-steam steam-two" />
              <div className="coffee-cup">
                ☕
              </div>
            </div>

            <div className="book-open">
              <div className="book-page left-page">
                <span>✎</span>
                <span>♡</span>
                <span>⌁</span>
              </div>

              <div className="book-page right-page">
                <span>⌁</span>
                <span>✦</span>
                <span>⌁</span>
              </div>
            </div>

            <div className="study-pencils">
              <span>🖊️</span>
              <span>✏️</span>
              <span>🖍️</span>
            </div>

            <div className="cat">
              <div className="cat-ear left-ear" />
              <div className="cat-ear right-ear" />

              <div className="cat-body">
                <div className="cat-face">
                  <span className="cat-eye left-eye" />
                  <span className="cat-eye right-eye" />
                  <span className="cat-nose">•</span>
                </div>
              </div>

              <div className="cat-tail" />
            </div>

            <div className="chibi">
              <div className="chibi-hair-back" />

              <div className="chibi-head">
                <div className="hair-front left-hair" />
                <div className="hair-front right-hair" />

                <div className="chibi-face">
                  <span className="chibi-eye left-eye" />
                  <span className="chibi-eye right-eye" />

                  <span className="chibi-blush left-blush" />
                  <span className="chibi-blush right-blush" />

                  <span className="chibi-mouth" />
                </div>
              </div>

              <div className="chibi-neck" />

              <div className="chibi-body">
                <div className="shirt-collar" />

                <div className="chibi-arm left-arm" />
                <div className="chibi-arm right-arm" />

                <div className="chibi-hand left-hand" />
                <div className="chibi-hand right-hand" />
              </div>

              <div className="chibi-legs">
                <span className="leg left-leg" />
                <span className="leg right-leg" />
              </div>
            </div>
          </div>

          <div className="desk-front">
            <div className="desk-drawer">
              ♡
            </div>
          </div>
        </div>

        <div className="plant">
          <div className="plant-pot" />
          <div className="plant-leaf leaf-one" />
          <div className="plant-leaf leaf-two" />
          <div className="plant-leaf leaf-three" />
        </div>

        <div className="floor-rug">
          <span>Sweet Study Club</span>
        </div>
      </div>

      <div className="scene-message">
        <span>{sceneLabels[sceneTime]}</span>
      </div>

      <div className="welcome-copy">
        <span className="welcome-small">
          🎀 خوش اومدی به
        </span>

        <h1>
          Sweet Study Club
        </h1>

        <p>
          بیا با هم درست‌تر، آروم‌تر و شیرین‌تر درس بخونیم.
        </p>

        <button
          type="button"
          className="scene-start-button"
          onClick={onStart}
          disabled={leaving}
        >
          {leaving
            ? 'داریم می‌ریم... 🐾'
            : 'بزن بریم ✨'}
        </button>

        <span className="scene-hint">
          Snow هم باهامون میاد 🐱
        </span>
      </div>

      <div className="scene-overlay" />
    </div>
  )
}
