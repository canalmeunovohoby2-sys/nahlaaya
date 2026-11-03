import { useEffect } from 'react'
import { registerVisitIfNeeded } from '../../services/visits'

export function VisitTracker() {
  useEffect(() => {
    void registerVisitIfNeeded()
  }, [])

  return null
}
