import { CardDef } from '../types/card.types';

export const CARDS: CardDef[] = [
  {
    id: 'CARD_SHARPEN_RANDOM',
    name: '날카롭게',
    description: '무작위 공격 슬롯 1개의 피해를 +5 증가시킨다.',
    cost: 2,
    cardType: 'ModifyRandom',
    filter: { category: 'Attack' },
    modification: { flatDamageBonusDelta: 5 },
  },
  {
    id: 'CARD_EMPOWER_SELECT',
    name: '강화',
    description: '선택한 물리 공격 슬롯의 피해를 +8 증가시킨다.',
    cost: 3,
    cardType: 'ModifySelect',
    filter: { attackType: 'Physical' },
    modification: { flatDamageBonusDelta: 8 },
  },
  {
    id: 'CARD_REPLACE_POWER',
    name: '강타 교체',
    description: '연속된 슬롯 2칸을 강타로 교체한다 (기존 강화 소멸).',
    cost: 3,
    cardType: 'ReplaceSlots',
    replaceSkillId: 'POWER_STRIKE',
    replaceCount: 2,
  },
  {
    id: 'CARD_GLOBAL_PHYS_UP',
    name: '전술 훈련',
    description: '모든 물리 공격 슬롯의 피해를 +3 증가시킨다. (즉시 적용)',
    cost: 4,
    cardType: 'ModifyGlobal',
    filter: { attackType: 'Physical' },
    modification: { flatDamageBonusDelta: 3 },
  },
  {
    id: 'CARD_RULE_FREE_REROLL',
    name: '재정비',
    description: '무료 리롤 횟수를 2회 추가한다. (즉시 적용)',
    cost: 1,
    cardType: 'RuleModify',
    ruleKey: 'freeRerolls',
    ruleValue: 2,
  },
  {
    id: 'CARD_REPLACE_RAPID',
    name: '쾌속 교체',
    description: '연속된 슬롯 3칸을 연속 베기로 교체한다.',
    cost: 4,
    cardType: 'ReplaceSlots',
    replaceSkillId: 'RAPID_STRIKE',
    replaceCount: 3,
  },
  {
    id: 'CARD_SHARPEN_SPECIAL',
    name: '마법 집중',
    description: '무작위 특수 공격 슬롯 1개의 피해를 +8 증가시킨다.',
    cost: 2,
    cardType: 'ModifyRandom',
    filter: { attackType: 'Special' },
    modification: { flatDamageBonusDelta: 8 },
  },
  {
    id: 'CARD_GLOBAL_ATTACK_PERCENT',
    name: '전면 강화',
    description: '모든 공격 슬롯의 피해를 +4 증가시킨다. (즉시 적용)',
    cost: 5,
    cardType: 'ModifyGlobal',
    filter: { category: 'Attack' },
    modification: { flatDamageBonusDelta: 4 },
  },
];

export function getAllCards(): CardDef[] {
  return [...CARDS];
}
