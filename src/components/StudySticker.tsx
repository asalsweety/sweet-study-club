type Sticker = 'bee' | 'books' | 'honey' | 'library' | 'cottage'
  | `bee-sticker-${1 | 2 | 3 | 4}` | `cute-${"bee" | "flower" | "heart" | "strip"}-${number}` | `cute-strip-${number}-v`

type StudyStickerProps = {
  kind: Sticker
  className?: string
}

export default function StudySticker({ kind, className }: StudyStickerProps) {
  return <img src={`/images/study-stickers/${kind}.webp`} alt="" width={144} height={144} decoding="async" draggable={false} className={className} />
}
