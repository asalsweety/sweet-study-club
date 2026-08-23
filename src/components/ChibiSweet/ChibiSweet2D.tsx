import "./ChibiSweet.css"

export default function ChibiSweet2D() {
  return (
    <div className="chibi-wrapper">

      <div className="chibi-character">

        <div className="chibi-head">
          <div className="chibi-hair" />

          <div className="chibi-face">
            <span className="eye left" />
            <span className="eye right" />
            <span className="smile" />
          </div>
        </div>

        <div className="chibi-body">
          <div className="book" />
        </div>

      </div>

      <div className="chibi-cat">
        🐈
      </div>

    </div>
  )
}
