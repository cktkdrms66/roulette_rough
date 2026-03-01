import { JokerDef } from '../types/joker.types';

export const JOKERS: JokerDef[] = [
  {
    id: 'JOKER_REROLL',
    name: '행운',
    description: '스핀 완료 후 20% 확률로 한번 더 스핀한다.',
    trigger: 'OnSpinResolved',
    param: 0.2,
  },
  {
    id: 'JOKER_CONSECUTIVE_UP',
    name: '연속의 달인',
    description: '모든 연속 태그의 레벨을 +1로 계산한다.',
    trigger: 'Passive',
    param: 1,
  },
  {
    id: 'JOKER_DOUBLE_CRIT',
    name: '광전사',
    description: '치명타 배율이 2배가 된다. (1.5→2.0)',
    trigger: 'Passive',
    param: 1.0,
  },
  {
    id: 'JOKER_PERM_KILL',
    name: '정복자',
    description: '적 처치 시 모든 공격 칸의 피해가 영구적으로 +1 증가한다.',
    trigger: 'OnEnemyDefeated',
    param: 1,
  },
  {
    id: 'JOKER_DMG_ON_HIT',
    name: '투지',
    description: '피해를 받을 때마다 모든 칸 피해 +5 (웨이브 종료 시 리셋).',
    trigger: 'OnPlayerDamaged',
    param: 5,
  },
  {
    id: 'JOKER_GOLD_DMG',
    name: '황금 손',
    description: '공격 시 보유 골드 5당 추가 피해 +3.',
    trigger: 'OnAttackHit',
    param: 3,
  },
  {
    id: 'JOKER_CURSE_ATK',
    name: '저주의 힘',
    description: '저주 발동 시 랜덤 공격 칸의 피해를 +2 증가시킨다.',
    trigger: 'OnCurseTriggered',
    param: 2,
  },
  {
    id: 'JOKER_SPIN_BOOST',
    name: '스핀 러시',
    description: '룰렛을 돌릴 때마다 모든 칸 피해 +5 (웨이브 종료 시 리셋).',
    trigger: 'OnSpinStart',
    param: 5,
  },
  {
    id: 'JOKER_HEAL_BOOST',
    name: '생명력',
    description: '회복 시 모든 칸 피해 +10 (웨이브 종료 시 리셋).',
    trigger: 'OnHealApplied',
    param: 10,
  },
  {
    id: 'JOKER_SHIELD_DMG',
    name: '철벽',
    description: '공격 시 내 실드 5당 공격 칸 피해 +10.',
    trigger: 'OnAttackHit',
    param: 10,
  },
  {
    id: 'JOKER_CRIT_CHANCE',
    name: '예리함',
    description: '모든 공격 칸의 치명타 확률이 +10% 증가한다.',
    trigger: 'Passive',
    param: 0.1,
  },
  {
    id: 'JOKER_CRIT_DMG',
    name: '저격수',
    description: '치명타 피해 배율이 +0.5 증가한다.',
    trigger: 'Passive',
    param: 0.5,
  },
  {
    id: 'JOKER_CRIT_GOLD',
    name: '노다지',
    description: '치명타 발생 시 골드를 +1 획득한다.',
    trigger: 'OnCriticalHit',
    param: 1,
  },
  {
    id: 'JOKER_CRIT_BOOST',
    name: '기회주의자',
    description: '치명타 발생 시 랜덤 공격 칸의 피해를 +1 증가시킨다.',
    trigger: 'OnCriticalHit',
    param: 1,
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
