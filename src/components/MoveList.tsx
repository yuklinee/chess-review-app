import { useEffect, useMemo, useRef } from 'react'
import type { MoveNode } from '../lib/pgn'

interface MoveListProps {
  moves: MoveNode[]
  ply: number
  variationFrom: number | null
  onSelect: (ply: number) => void
}

interface MoveRow {
  key: string
  number: number
  white?: { node: MoveNode; index: number }
  black?: { node: MoveNode; index: number }
}

function groupMoves(moves: MoveNode[]): MoveRow[] {
  const rows: MoveRow[] = []

  moves.forEach((node, index) => {
    if (node.color === 'w') {
      rows.push({
        key: `w-${index}`,
        number: node.moveNumber,
        white: { node, index },
      })
      return
    }

    const last = rows[rows.length - 1]
    if (last && last.white && !last.black) {
      last.black = { node, index }
      return
    }

    rows.push({
      key: `b-${index}`,
      number: node.moveNumber,
      black: { node, index },
    })
  })

  return rows
}

interface MoveButtonProps {
  node: MoveNode
  index: number
  active: boolean
  variation: boolean
  onSelect: (ply: number) => void
}

function MoveButton({
  node,
  index,
  active,
  variation,
  onSelect,
}: MoveButtonProps) {
  return (
    <button
      type="button"
      className={`move${active ? ' move--active' : ''}${
        variation ? ' move--variation' : ''
      }`}
      data-active={active ? 'true' : undefined}
      onClick={() => onSelect(index + 1)}
      title={`Ход ${index + 1}: ${node.san}`}
    >
      {node.san}
    </button>
  )
}

export function MoveList({
  moves,
  ply,
  variationFrom,
  onSelect,
}: MoveListProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const rows = useMemo(() => groupMoves(moves), [moves])

  useEffect(() => {
    const container = listRef.current
    if (!container) return
    const active = container.querySelector<HTMLElement>('[data-active="true"]')
    if (!active) return
    const containerRect = container.getBoundingClientRect()
    const activeRect = active.getBoundingClientRect()
    const target =
      activeRect.top -
      containerRect.top +
      container.scrollTop -
      container.clientHeight / 2 +
      activeRect.height / 2
    container.scrollTo({
      top: Math.max(0, target),
      behavior: 'auto',
    })
  }, [ply, moves])

  return (
    <div className="move-list" ref={listRef} role="list" aria-label="Ходы партии">
      {rows.map((row) => (
        <div className="move-row" role="listitem" key={row.key}>
          <span className="move-row__number">{row.number}.</span>
          {row.white ? (
            <MoveButton
              node={row.white.node}
              index={row.white.index}
              active={ply === row.white.index + 1}
              variation={
                variationFrom !== null && row.white.index >= variationFrom
              }
              onSelect={onSelect}
            />
          ) : (
            <span className="move-row__empty" />
          )}
          {row.black ? (
            <MoveButton
              node={row.black.node}
              index={row.black.index}
              active={ply === row.black.index + 1}
              variation={
                variationFrom !== null && row.black.index >= variationFrom
              }
              onSelect={onSelect}
            />
          ) : (
            <span className="move-row__empty" />
          )}
        </div>
      ))}
    </div>
  )
}
