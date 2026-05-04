import type { Owner } from '@/state/ownershipReducer'
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
  onCycle: () => void
  onSetLav: () => void
  onToggleAttack: () => void
  onToggleAttacking: () => void
}

export function CAPBadge({ capId: _capId, name, shortName, owner, isLavPosition, isUnderAttack, isFriendly, isEnemy, isAttacking, onCycle, onSetLav, onToggleAttack, onToggleAttacking }: CAPBadgeProps) {
  return (
    <div className={`${styles.badge} ${styles[owner]} ${isLavPosition ? styles.lavActive : ''}`}>
      <button
        type="button"
        className={styles.ownerBtn}
        onClick={onCycle}
        title={`Cycle ownership (current: ${owner})`}
        aria-label={`${name} ownership: ${owner}. Click to cycle.`}
      >
        {OWNER_LABELS[owner]}
      </button>
      <span className={styles.capName}>{name.length <= 10 ? name : (shortName ?? name)}</span>
      {isFriendly && (
        <button
          type="button"
          className={`${styles.attackBtn} ${isUnderAttack ? styles.attackActive : ''}`}
          onClick={onToggleAttack}
          title={isUnderAttack ? 'Clear under-attack flag' : 'Mark as under attack'}
          aria-label={isUnderAttack ? `${name}: under attack. Click to clear.` : `Mark ${name} as under attack`}
        >
          ⚠
        </button>
      )}
      {isEnemy && (
        <button
          type="button"
          className={`${styles.attackingBtn} ${isAttacking ? styles.attackingActive : ''}`}
          onClick={onToggleAttacking}
          title={isAttacking ? 'Clear attacking flag' : 'Mark as being attacked'}
          aria-label={isAttacking ? `${name}: being attacked. Click to clear.` : `Mark ${name} as being attacked`}
        >
          ⚔
        </button>
      )}
      <button
        type="button"
        className={styles.lavBtn}
        onClick={onSetLav}
        title={isLavPosition ? 'LAV is here' : 'Set as LAV position'}
        aria-label={isLavPosition ? `LAV at ${name}` : `Set LAV position to ${name}`}
      >
        {isLavPosition ? '▲' : '○'}
      </button>
    </div>
  )
}

export { OWNER_ORDER }
