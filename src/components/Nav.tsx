import { Link, useLocation } from 'react-router-dom'
import { Trophy, Clock, User } from 'lucide-react'

export function Nav() {
  const { pathname } = useLocation()
  const link = (to: string) =>
    `flex flex-col items-center gap-0.5 text-xs py-2 px-3 transition-colors ${
      pathname === to ? 'text-accent-primary' : 'text-text-secondary hover:text-text-primary'
    }`

  return (
    <nav className="border-t border-black/5 bg-bg-card flex justify-around sticky bottom-0">
      <Link to="/" className={link('/')}>
        <span className="text-lg">🦕</span>
        <span>Home</span>
      </Link>
      <Link to="/leaderboard" className={link('/leaderboard')}>
        <Trophy size={20} />
        <span>Scores</span>
      </Link>
      <Link to="/past" className={link('/past')}>
        <Clock size={20} />
        <span>Past</span>
      </Link>
      <Link to="/me" className={link('/me')}>
        <User size={20} />
        <span>Me</span>
      </Link>
    </nav>
  )
}
