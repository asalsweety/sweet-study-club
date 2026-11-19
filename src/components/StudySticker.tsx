const stickerPaths = {
  bee: '/images/study-stickers/bee.webp',
  books: '/images/study-stickers/books.webp',
  honey: '/images/study-stickers/honey.webp',
}

type StudyStickerProps = {
  kind: keyof typeof stickerPaths
  className?: string
}

export default function StudySticker({ kind, className }: StudyStickerProps) {
  return <img src={stickerPaths[kind]} alt="" width={144} height={144} decoding="async" draggable={false} className={className} />
}
