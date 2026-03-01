export type JokerTrigger =
  | 'OnAttackHit'
  | 'OnGoldGained'
  | 'OnCurseTriggered'
  | 'OnSpinResolved'
  | 'OnSpinStart'
  | 'OnEnemyDefeated'
  | 'OnPlayerDamaged'
  | 'OnHealApplied'
  | 'OnCriticalHit'
  | 'Passive';

export interface JokerDef {
  id: string;
  name: string;
  description: string;
  trigger: JokerTrigger;
  param?: number;   // 조커별 추가 파라미터
}
