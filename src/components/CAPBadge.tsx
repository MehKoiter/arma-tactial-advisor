import { memo, useCallback } from 'react'
import type { Owner, OwnershipAction } from '@/state/ownershipReducer'
import styles from './CAPControl.module.css'

const OWNER_LABELS: Record<Owner, string> = {
  neutral: 'N',
  US: 'US',
  RUS: 'RU',
}

const OWNER_ORDER: Owner[] = ['neutral', 'US', 'RUS']

interface CAPBadgeProps {
  capId: string
  name: string
  shortName?: string
  owner: Owner
  isLavPosition: boolean
  isUnderAttack: boolean
  isFriendly: boolean
  isEnemy: boolean
  isAttacking: boolean
  hasRadio: boolean
  isHQ: boolean
  dispatch: React.Dispatch<OwnershipAction>
}

function CAPBadgeInner({
  capId,
  name,
  shortName,
  owner,
  isLavPosition,
  isUnderAttack,
  isFriendly,
  isEnemy,
  isAttacking,
  hasRadio,
  isHQ,
  dispatch,
}: CAPBadgeProps) {
  const handleOwnerClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.shiftKey) {
        dispatch({ type: 'CYCLE_OWNER', capId })
        return
      }
      dispatch({ type: 'SET_OWNER', capId, owner: owner === 'US' ? 'neutral' : 'US' })
    },
    [dispatch, capId, owner],
  )

  const handleOwnerContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      dispatch({ type: 'SET_OWNER', capId, owner: owner === 'RUS' ? 'neutral' : 'RUS' })
    },
    [dispatch, capId, owner],
  )

  const handleToggleAttack = useCallback(
    () => dispatch({ type: 'TOGGLE_UNDER_ATTACK', capId }),
    [dispatch, capId],
  )

  const handleToggleAttacking = useCallback(
    () => dispatch({ type: 'TOGGLE_ATTACKING', capId }),
    [dispatch, capId],
  )

  const handleToggleRadio = useCallback(
    () => dispatch({ type: 'TOGGLE_RADIO', capId }),
    [dispatch, capId],
  )

  const handleToggleHQ = useCallback(
    () => dispatch({ type: 'TOGGLE_HQ', capId }),
    [dispatch, capId],
  )

  const handleSetLav = useCallback(
    () =>
      dispatch({
        type: 'SET_LAV_POSITION',
        capId: isLavPosition ? null : capId,
      }),
    [dispatch, capId, isLavPosition],
  )

  return (
    <div className={`${styles.badge} ${styles[owner]} ${isLavPosition ? styles.lavActive : ''}`}>
      <button
        type="button"
        className={styles.ownerBtn}
        onClick={handleOwnerClick}
        onContextMenu={handleOwnerContextMenu}
        title={`Left-click: US ↔ Neutral · Right-click: RUS ↔ Neutral · Shift+Click: cycle (current: ${owner})`}
        aria-label={`${name} ownership: ${owner}. Left-click for US, right-click for RUS.`}
      >
        {OWNER_LABELS[owner]}
      </button>
      <span className={styles.capName}>{name.length <= 10 ? name : (shortName ?? name)}</span>
      {!isEnemy && (
        <button
          type="button"
          className={`${styles.attackBtn} ${isUnderAttack ? styles.attackActive : ''}`}
          onClick={handleToggleAttack}
          title={isUnderAttack ? 'Clear under-attack flag' : 'Mark as under attack'}
          aria-label={
            isUnderAttack
              ? `${name}: under attack. Click to clear.`
              : `Mark ${name} as under attack`
          }
        >
          ⚠
        </button>
      )}
      {isEnemy && (
        <button
          type="button"
          className={`${styles.attackingBtn} ${isAttacking ? styles.attackingActive : ''}`}
          onClick={handleToggleAttacking}
          title={isAttacking ? 'Clear attacking flag' : 'Mark as being attacked'}
          aria-label={
            isAttacking
              ? `${name}: being attacked. Click to clear.`
              : `Mark ${name} as being attacked`
          }
        >
          ⚔
        </button>
      )}
      <button
        type="button"
        className={`${styles.radioBtn} ${hasRadio ? styles.radioActive : ''}`}
        onClick={handleToggleRadio}
        title={
          hasRadio
            ? 'Radio antenna ACTIVE — part of the network. Click to disable.'
            : 'Radio antenna inactive. Click to enable (becomes a network node).'
        }
        aria-label={
          hasRadio ? `${name}: radio active. Click to disable.` : `Enable radio antenna at ${name}`
        }
      >
        📡
      </button>
      {(isFriendly || isEnemy) && (
        <button
          type="button"
          className={`${styles.hqBtn} ${isHQ ? styles.hqActive : ''}`}
          onClick={handleToggleHQ}
          title={isHQ ? `HQ for ${owner} — click to clear` : `Designate ${name} as ${owner} HQ`}
          aria-label={isHQ ? `${name}: HQ. Click to clear.` : `Designate ${name} as HQ`}
        >
          ★
        </button>
      )}
      <button
        type="button"
        className={styles.lavBtn}
        onClick={handleSetLav}
        title={isLavPosition ? 'LAV is here' : 'Set as LAV position'}
        aria-label={isLavPosition ? `LAV at ${name}` : `Set LAV position to ${name}`}
      >
        {isLavPosition ? '▲' : '○'}
      </button>
    </div>
  )
}

export const CAPBadge = memo(CAPBadgeInner)

export { OWNER_ORDER }
