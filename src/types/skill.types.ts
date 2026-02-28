import { SlotCategory, AttackType } from './slot.types';

export interface SkillDef {
  id: string;
  name: string;
  description: string;
  category: SlotCategory;
  attackType: AttackType;
  basePower: number;
  hitCount?: number;         // RAPID_STRIKE 등 다중 타격
  specialParam?: number;     // 스킬별 추가 파라미터
}

export interface SkillResult {
  type: 'damage' | 'shield' | 'heal' | 'curse' | 'buff' | 'noop';
  value: number;
  hitCount?: number;
  targetWasStunned?: boolean;
  slotIndex?: number;
}
