import confetti from 'canvas-confetti'

export const celebrateSeries = () => {
  confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.65 },
    colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'],
  })
}
