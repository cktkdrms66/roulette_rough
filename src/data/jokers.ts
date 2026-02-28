import { JokerDef } from '../types/joker.types';

export const JOKERS: JokerDef[] = [
  {
    id: 'JOKER_CURSE',
    name: '저주의 조커',
    description: '공격 시 저주 슬롯 수만큼 피해 +30%.',
    trigger: 'OnAttackHit',
    param: 0.3,
  },
  {
    id: 'JOKER_DOPAMINE',
    name: '도파민 조커',
    description: '연속 공격마다 피해 +50%.',
    trigger: 'OnAttackHit',
    param: 0.5,
  },
  {
    id: 'JOKER_GOLD',
    name: '골드 조커',
    description: '골드 획득 시 30% 추가.',
    trigger: 'OnGoldGained',
    param: 1.3,
  },
  {
    id: 'JOKER_ATTACK',
    name: '공격형 조커',
    description: '공격 시 공격 슬롯 수만큼 피해 +30%.',
    trigger: 'OnAttackHit',
    param: 0.3,
  },
  {
    id: 'JOKER_GROWTH',
    name: '성장형 조커',
    description: '공격 시 전투 내 공격력 +10 (영구 누적).',
    trigger: 'OnAttackHit',
    param: 10,
  },
  {
    id: 'JOKER_FOOL',
    name: '바보 조커',
    description: '저주 발동 시 HP -5 대신 +5 회복.',
    trigger: 'OnCurseTriggered',
    param: 5,
  },
  {
    id: 'JOKER_CURSE_CURSE',
    name: '저주저주 조커',
    description: '저주 발동 시 적에게 5 피해.',
    trigger: 'OnCurseTriggered',
    param: 5,
  },
  {
    id: 'JOKER_RIGHT',
    name: '오른쪽 조커',
    description: '스핀 완료 시 50% 확률로 오른쪽 슬롯도 발동.',
    trigger: 'OnSpinResolved',
    param: 0.5,
  },
];

export function getAllJokers(): JokerDef[] {
  return [...JOKERS];
}

export function getJoker(id: string): JokerDef {
  const joker = JOKERS.find(j => j.id === id);
  if (!joker) throw new Error(`Unknown joker: ${id}`);
  return joker;
}
