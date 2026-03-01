export type TagType =
  | 'CRITICAL'
  | 'CONSECUTIVE'
  | 'HEAL'
  | 'MOVE_RIGHT'
  | 'MOVE_LEFT'
  | 'GOLD'
  | 'ACTIVATE'
  | 'EXTEND_LIFESPAN'
  | 'SHIELD'
  | 'SHIELD_BREAK';

export interface SlotTag {
  type: TagType;
  level: number;
  maxLevel: number;           // 레벨 1 고정 태그: maxLevel=1
  baseLifespan: number | null; // null=무제한
  currentCharges: number | null;
}

export interface TagEffectResult {
  critMultiplier: number;         // 1.0 = 크리티컬 없음
  extraExecutions: number;        // CONSECUTIVE 추가 발동 횟수
  goldGained: number;
  healAmount: number;
  shieldAmount: number;
  breakEnemyShield: boolean;
  moveDirection: 'right' | 'left' | null;
  didCrit: boolean;
}

export interface AddTagResult {
  success: boolean;
  leveledUp: boolean;
  needsRemoval: boolean; // 태그 슬롯 꽉 참 → UI에서 삭제 선택 필요
}
