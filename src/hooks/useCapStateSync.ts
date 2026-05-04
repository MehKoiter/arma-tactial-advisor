import { useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { OwnershipState, OwnershipAction, CapStateRow, Owner } from '@/state/ownershipReducer'
import { cycleOwner } from '@/state/ownershipReducer'
import everonCAPs from '@/data/everonCAPs'

async function upsertCap(capId: string, patch: Partial<Omit<CapStateRow, 'cap_id'>>) {
  await supabase
    .from('cap_state')
    .upsert({ cap_id: capId, ...patch }, { onConflict: 'cap_id' })
}

async function syncAction(action: OwnershipAction, state: OwnershipState) {
  switch (action.type) {
    case 'SET_OWNER':
      await upsertCap(action.capId, { owner: action.owner })
      break

    case 'CYCLE_OWNER': {
      const current: Owner = state.ownership[action.capId] ?? 'neutral'
      const next = cycleOwner(current)
      const enemy: Owner = state.playerTeam === 'US' ? 'RUS' : 'US'
      await upsertCap(action.capId, {
        owner: next,
        under_attack: next === state.playerTeam ? state.underAttack.has(action.capId) : false,
        attacking: next === enemy ? state.attacking.has(action.capId) : false,
      })
      break
    }

    case 'RESET_ALL': {
      const rows = everonCAPs.map((c) => ({
        cap_id: c.id,
        owner: 'neutral' as Owner,
        under_attack: false,
        attacking: false,
      }))
      await supabase.from('cap_state').upsert(rows, { onConflict: 'cap_id' })
      break
    }

    case 'TOGGLE_UNDER_ATTACK':
      await upsertCap(action.capId, { under_attack: !state.underAttack.has(action.capId) })
      break

    case 'TOGGLE_ATTACKING':
      await upsertCap(action.capId, { attacking: !state.attacking.has(action.capId) })
      break
  }
}

/**
 * Returns a wrapped dispatch that:
 * 1. Applies the action to local state immediately (optimistic)
 * 2. Mirrors the change to Supabase in the background
 *
 * Also sets up the initial fetch and realtime subscription so all clients
 * stay in sync automatically.
 */
export function useCapStateSync(
  state: OwnershipState,
  dispatch: React.Dispatch<OwnershipAction>,
): React.Dispatch<OwnershipAction> {
  // Initial fetch — load whatever is already in the DB
  useEffect(() => {
    supabase
      .from('cap_state')
      .select('*')
      .then(({ data }) => {
        if (data?.length) dispatch({ type: 'HYDRATE', rows: data as CapStateRow[] })
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime subscription — receive changes made by other clients
  useEffect(() => {
    const channel = supabase
      .channel('cap_state_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cap_state' },
        (payload) => {
          const row = (payload.new ?? payload.old) as CapStateRow
          if (row?.cap_id) dispatch({ type: 'SET_ROW', row })
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Wrapped dispatch: optimistic local update + background Supabase sync
  const syncedDispatch = useCallback(
    (action: OwnershipAction) => {
      dispatch(action)
      void syncAction(action, state)
    },
    [state, dispatch],
  )

  return syncedDispatch
}
