import { SlotCategory, AttackType } from './slot.types';

export type CardType = 'ModifyRandom' | 'ModifySelect' | 'ReplaceSlots' | 'ModifyGlobal' | 'RuleModify';

export interface SlotFilter {
  category?: SlotCategory;
  attackType?: AttackType;
  skillId?: string;
}

export interface SlotModification {
  flatDamageBonusDelta?: number;
  percentDamageBonusDelta?: number;
  skillId?: string;
  category?: SlotCategory;
  attackType?: AttackType;
}

export interface CardDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  cardType: CardType;
  filter?: SlotFilter;           // 적용 대상 필터
  modification?: SlotModification; // 슬롯 변경 내용
  replaceSkillId?: string;       // ReplaceSlots용 교체 스킬
  replaceCount?: number;         // ReplaceSlots 교체 칸 수
  replaceBonus?: number;         // ReplaceSlots 새 슬롯에 부여할 flatDamageBonus
  ruleKey?: string;              // RuleModify용 규칙 키
  ruleValue?: number;            // RuleModify용 규칙 값
}
