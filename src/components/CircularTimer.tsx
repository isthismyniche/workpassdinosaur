interface CircularTimerProps {
  timeLeft: number
  total: number
}

export function CircularTimer({ timeLeft, total }: CircularTimerProps) {
  const radius = 28
  const stroke = 4
  const size = (radius + stroke) * 2
  const circumference = 2 * Math.PI * radius
  const progress = timeLeft / total
  const dashOffset = circumference * (1 - progress)
  const isUrgent = timeLeft <= 5

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="currentColor"
          strokeWidth={stroke}
          className="text-border opacity-40"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className={`transition-all duration-1000 ease-linear ${isUrgent ? 'text-error' : 'text-accent-primary'}`}
        />
      </svg>
      <span className={`absolute font-bold text-base tabular-nums transition-colors ${isUrgent ? 'text-error animate-pulse' : 'text-text-primary'}`}>
        {timeLeft}
      </span>
    </div>
  )
}
