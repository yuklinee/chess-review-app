import { useState } from 'react'
import {
  CalendarDays,
  ExternalLink,
  MapPin,
  Users,
} from 'lucide-react'
import type { PlayerProfile, PlayerStats } from '../types/chesscom'
import { formatCount, formatDateTime, formatJoined } from '../lib/format'

interface PlayerProfileCardProps {
  username: string
  profile: PlayerProfile | null
  stats: PlayerStats | null
}

const RATING_SLOTS = [
  { key: 'chess_bullet', label: 'Пуля' },
  { key: 'chess_blitz', label: 'Блиц' },
  { key: 'chess_rapid', label: 'Рапид' },
  { key: 'chess_daily', label: 'По дням' },
] as const

export function PlayerProfileCard({
  username,
  profile,
  stats,
}: PlayerProfileCardProps) {
  const [avatarFailed, setAvatarFailed] = useState(false)

  const displayName = profile?.name?.trim() || profile?.username || username
  const handle = profile?.username ?? username
  const initial = handle.slice(0, 1).toUpperCase()
  const profileUrl =
    profile?.url ?? `https://www.chess.com/member/${encodeURIComponent(handle)}`

  return (
    <aside className="profile-card" aria-label={`Профиль ${handle}`}>
      <div className="profile-card__top">
        <div className="profile-avatar" aria-hidden="true">
          {profile?.avatar && !avatarFailed ? (
            <img
              src={profile.avatar}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setAvatarFailed(true)}
            />
          ) : (
            <span>{initial}</span>
          )}
        </div>
        <div className="profile-card__identity">
          <div className="profile-card__name-row">
            <h2 className="profile-card__name">{displayName}</h2>
            {profile?.title ? (
              <span className="title-badge" title="Титул Chess.com">
                {profile.title}
              </span>
            ) : null}
          </div>
          <p className="profile-card__handle">@{handle}</p>
          {profile?.league ? (
            <span className="league-badge">{profile.league}</span>
          ) : null}
        </div>
      </div>

      <dl className="rating-grid">
        {RATING_SLOTS.map((slot) => {
          const rating = stats?.[slot.key]?.last?.rating
          return (
            <div className="rating" key={slot.key}>
              <dt>{slot.label}</dt>
              <dd>{typeof rating === 'number' ? rating : '—'}</dd>
            </div>
          )
        })}
      </dl>

      <ul className="profile-meta">
        {profile?.location ? (
          <li>
            <MapPin size={15} aria-hidden="true" />
            <span>{profile.location}</span>
          </li>
        ) : null}
        {profile?.joined ? (
          <li>
            <CalendarDays size={15} aria-hidden="true" />
            <span>На Chess.com с {formatJoined(profile.joined)}</span>
          </li>
        ) : null}
        {typeof profile?.followers === 'number' ? (
          <li>
            <Users size={15} aria-hidden="true" />
            <span>{formatCount(profile.followers)} подписчиков</span>
          </li>
        ) : null}
        {profile?.last_online ? (
          <li className="profile-meta__muted">
            <span className="profile-meta__dot" aria-hidden="true" />
            <span>Последний онлайн: {formatDateTime(profile.last_online)}</span>
          </li>
        ) : null}
      </ul>

      <a
        className="profile-card__link"
        href={profileUrl}
        target="_blank"
        rel="noreferrer noopener"
      >
        Профиль на Chess.com
        <ExternalLink size={15} aria-hidden="true" />
      </a>
    </aside>
  )
}
