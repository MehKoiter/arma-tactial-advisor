import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useOwnership } from '@/state/OwnershipContext'
import {
  scoreCandidates,
  scoreAttackCandidates,
  scoreStrikeTargets,
  scoreResupplyTargets,
  scoreReinforceTargets,
} from '@/scoring/scoringEngine'
import type { ScoredCAP, AttackScoredCAP, StrikeScoredCAP, ResupplyScoredCAP, ReinforceScoredCAP } from '@/scoring/scoringEngine'
import {
  DEFAULT_SCORING_CONFIG,
  DEFAULT_ATTACK_CONFIG,
  DEFAULT_ATTACK_HELO_CONFIG,
  DEFAULT_TRANSPORT_HELO_CONFIG,
  DEFAULT_REINFORCE_CONFIG,
} from '@/scoring/scoringConfig'
import { usePositionNotesContext } from '@/providers/PositionNotesContext'
import everonCAPs from '@/data/everonCAPs'
import everonSupplyPoints from '@/data/everonSupplyPoints'

// Tab labels per vehicle type
export const VEHICLE_TABS: Record<string, { primary: string; secondary: string | null }> = {
  LAV:            { primary: '🛡 Defend', secondary: '⚔ Attack' },
  ATTACK_HELO:    { primary: '🎯 Strike', secondary: null },
  TRANSPORT_HELO: { primary: '🚁 Resupply', secondary: '⚔ Reinforce' },
}

export type RecommendTab = 'primary' | 'secondary'

// Union type for all scored CAP variants
export type AnyScored = ScoredCAP | AttackScoredCAP | StrikeScoredCAP | ResupplyScoredCAP | ReinforceScoredCAP

interface RecommendationContextValue {
  tab: RecommendTab
  setTab: (tab: RecommendTab) => void
  primaryList: AnyScored[]
  secondaryList: AnyScored[]
  primaryLabel: string
  secondaryLabel: string | null
  showSupplies: boolean
  setShowSupplies: (v: boolean) => void
}

const RecommendationContext = createContext<RecommendationContextValue | null>(null)

export function RecommendationProvider({ children }: { children: ReactNode }) {
  const { state } = useOwnership()
  const { notes } = usePositionNotesContext()
  const [tab, setTab] = useState<RecommendTab>('primary')
  const [showSupplies, setShowSupplies] = useState(false)

  const { vehicleType } = state
  const tabs = VEHICLE_TABS[vehicleType]

  // Reset to primary tab when vehicle changes
  useEffect(() => { setTab('primary') }, [vehicleType])

  const primaryList = useMemo<(ScoredCAP | AttackScoredCAP | StrikeScoredCAP | ResupplyScoredCAP)[]>(() => {
    if (vehicleType === 'ATTACK_HELO')
      return scoreStrikeTargets(everonCAPs, state, DEFAULT_ATTACK_HELO_CONFIG, notes, everonSupplyPoints)
    if (vehicleType === 'TRANSPORT_HELO')
      return scoreResupplyTargets(everonCAPs, state, DEFAULT_TRANSPORT_HELO_CONFIG, notes, everonSupplyPoints)
    return scoreCandidates(everonCAPs, state, DEFAULT_SCORING_CONFIG, notes, everonSupplyPoints)
  }, [state, notes, vehicleType])

  const secondaryList = useMemo<AnyScored[]>(() => {
    if (vehicleType === 'LAV')
      return scoreAttackCandidates(everonCAPs, state, DEFAULT_ATTACK_CONFIG, notes, everonSupplyPoints)
    if (vehicleType === 'TRANSPORT_HELO')
      return scoreReinforceTargets(everonCAPs, state, DEFAULT_REINFORCE_CONFIG, notes, everonSupplyPoints)
    return []
  }, [state, notes, vehicleType])

  const value = useMemo(() => ({
    tab,
    setTab,
    primaryList,
    secondaryList,
    primaryLabel: tabs.primary,
    secondaryLabel: tabs.secondary,
    showSupplies,
    setShowSupplies,
  }), [tab, primaryList, secondaryList, tabs, showSupplies])

  return (
    <RecommendationContext.Provider value={value}>
      {children}
    </RecommendationContext.Provider>
  )
}

export function useRecommendation() {
  const ctx = useContext(RecommendationContext)
  if (!ctx) throw new Error('useRecommendation must be used within RecommendationProvider')
  return ctx
}
