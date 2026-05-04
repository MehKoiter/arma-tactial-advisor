import { useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { OwnershipState, OwnershipAction, CapStateRow, Owner } from '@/state/ownershipReducer'
import { cycleOwner } from '@/state/ownershipReducer'
import everonCAPs from '@/data/everonCAPs'
import { useRoom } from '@/providers/RoomContext'

async function upsertCap(roomId: string, capId: string, patch: Partial<Omit<CapStateRow, 'cap_id'>>) {
  await supabase
    .from('cap_ownership')
    .upsert({ room_id: roomId, cap_id: capId, ...patch }, { onConflict: 'room_id,cap_id' })
}

async function syncAction(roomId: string, action: OwnershipAction, state: OwnershipState) {
  switch (action.type) {
    case 'SET_OWNER':
      await upsertCap(roomId, action.capId, { owner: action.owner })
      break

    case 'CYCLE_OWNER': {
      const current: Owner = state.ownership[action.capId] ?? 'neutral'
      const next = cycleOwner(current)
      const enemy: Owner = state.playerTeam === 'US' ? 'RUS' : 'US'
      await upsertCap(roomId, action.capId, {
        owner: next,
        under_attack: next === state.playerTeam ? state.underAttack.has(action.capId) : false,
        attacking: next === enemy ? state.attacking.has(action.capId) : false,
      })
      break
    }

    case 'RESET_ALL': {
      const rows = everonCAPs.map((c) => ({
        room_id: roomId,
        cap_id: c.id,
        owner: 'neutral' as Owner,
        under_attack: false,
        attacking: false,
      }))
      await supabase.from('cap_ownership').upsert(rows, { onConflict: 'room_id,cap_id' })
      break
    }

    case 'TOGGLE_UNDER_ATTACK':
      await upsertCap(roomId, action.capId, { under_attack: !state.underAttack.has(action.capId) })
      break

    case 'TOGGLE_ATTACKING':
      await upsertCap(roomId, action.capId, { attacking: !state.attacking.has(action.capId) })
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
  const { slug: roomId } = useRoom()

  // Initial fetch — load whatever is already in the DB for this room
  useEffect(() => {
    supabase
      .from('cap_ownership')
      .select('*')
      .eq('room_id', roomId)
      .then(({ data }) => {
        if (data?.length) dispatch({ type: 'HYDRATE', rows: data as CapStateRow[] })
      })
  }, [roomId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime subscription — receive changes made by other clients
  useEffect(() => {
    const channel = supabase
      .channel(`cap_ownership_changes_${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cap_ownership', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const row = (payload.new ?? payload.old) as CapStateRow
          if (row?.cap_id) dispatch({ type: 'SET_ROW', row })
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [roomId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Wrapped dispatch: optimistic local update + background Supabase sync
  const syncedDispatch = useCallback(
    (action: OwnershipAction) => {
      dispatch(action)
      void syncAction(roomId, action, state)
    },
    [roomId, state, dispatch],
  )

  return syncedDispatch
}
