import { SlotTag } from './tag.types';

export type SlotCategory = 'Attack' | 'Transform' | 'Curse';
export type AttackType = 'None' | 'Physical' | 'Special';

export interface Slot {
  index: number;             // 0-11
  category: SlotCategory;
  attackType: AttackType;
  skillId: string;
  flatDamageBonus: number;
  percentDamageBonus: number;
  dopamineStacks: number;
  tempCurseTimer: number;    // 0이면 일반, >0이면 임시저주
  originalSkillId?: string;  // 임시저주 복원용
  originalCategory?: SlotCategory;
  tags: SlotTag[];           // 부착된 태그 목록
  maxTags: number;           // 최대 태그 슬롯 수
}

export function createDefaultSlot(index: number): Slot {
  return {
    index,
    category: 'Attack',
    attackType: 'Physical',
    skillId: 'BASIC_ATTACK',
    flatDamageBonus: 0,
    percentDamageBonus: 0,
    dopamineStacks: 0,
    tempCurseTimer: 0,
    tags: [],
    maxTags: 3,
  };
}
