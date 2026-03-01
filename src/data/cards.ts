import { CardDef } from '../types/card.types';

export const CARDS: CardDef[] = [
  // ── 전체 피해 증가 ───────────────────────────────────────────
  {
    id: 'CARD_DAMAGE_ALL',
    name: '전술 훈련+',
    description: '모든 칸의 기본 피해를 +1 증가시킨다. (즉시 적용)',
    cost: 5,
    cardType: 'ModifyGlobal',
    filter: { category: 'Attack' },
    modification: { flatDamageBonusDelta: 1 },
  },

  // ── 무작위 피해 증가 ─────────────────────────────────────────
  {
    id: 'CARD_DAMAGE_RANDOM_3',
    name: '무작위 강화',
    description: '무작위 공격 칸 1개의 피해를 +3 증가시킨다.',
    cost: 3,
    cardType: 'DamageRandom',
    filter: { category: 'Attack' },
    damageDelta: 3,
  },
  {
    id: 'CARD_DAMAGE_RANDOM_5',
    name: '무작위 강화+',
    description: '무작위 공격 칸 1개의 피해를 +5 증가시킨다.',
    cost: 5,
    cardType: 'DamageRandom',
    filter: { category: 'Attack' },
    damageDelta: 5,
  },

  // ── 선택 피해 증가 ───────────────────────────────────────────
  {
    id: 'CARD_DAMAGE_SELECT',
    name: '정밀 강화',
    description: '선택한 공격 칸의 피해를 +3 증가시킨다.',
    cost: 4,
    cardType: 'DamageSelect',
    filter: { category: 'Attack' },
    damageDelta: 3,
  },

  // ── 슬롯 복제 / 교환 ─────────────────────────────────────────
  {
    id: 'CARD_DUPLICATE',
    name: '복제',
    description: '선택한 칸을 다른 칸에 복제한다. (태그 포함)',
    cost: 10,
    cardType: 'DuplicateSlot',
  },
  {
    id: 'CARD_SWAP',
    name: '전치',
    description: '두 칸의 위치를 서로 교환한다.',
    cost: 3,
    cardType: 'SwapSlots',
  },

  // ── HP 회복 ─────────────────────────────────────────────────
  {
    id: 'CARD_HEAL',
    name: '회복약',
    description: '즉시 HP를 20 회복한다.',
    cost: 3,
    cardType: 'HealPlayer',
    healAmount: 20,
  },

  // ── 태그: 무작위 부여 ────────────────────────────────────────
  {
    id: 'CARD_TAG_RANDOM_CRITICAL',
    name: '치명타 태그 (무작위)',
    description: '무작위 칸에 치명타 태그를 부여한다.',
    cost: 3,
    cardType: 'AddTagRandom',
    tagType: 'CRITICAL',
  },
  {
    id: 'CARD_TAG_RANDOM_CONSECUTIVE',
    name: '연속 태그 (무작위)',
    description: '무작위 칸에 연속 태그를 부여한다.',
    cost: 5,
    cardType: 'AddTagRandom',
    tagType: 'CONSECUTIVE',
  },
  {
    id: 'CARD_TAG_RANDOM_HEAL',
    name: '회복 태그 (무작위)',
    description: '무작위 칸에 회복 태그를 부여한다.',
    cost: 3,
    cardType: 'AddTagRandom',
    tagType: 'HEAL',
  },
  {
    id: 'CARD_TAG_RANDOM_GOLD',
    name: '황금 태그 (무작위)',
    description: '무작위 칸에 황금 태그를 부여한다.',
    cost: 3,
    cardType: 'AddTagRandom',
    tagType: 'GOLD',
  },
  {
    id: 'CARD_TAG_RANDOM_SHIELD',
    name: '방어막 태그 (무작위)',
    description: '무작위 칸에 방어막 태그를 부여한다.',
    cost: 4,
    cardType: 'AddTagRandom',
    tagType: 'SHIELD',
  },
  {
    id: 'CARD_TAG_RANDOM_MOVE_RIGHT',
    name: '우측 발동 태그 (무작위)',
    description: '무작위 칸에 우측 발동 태그를 부여한다.',
    cost: 5,
    cardType: 'AddTagRandom',
    tagType: 'MOVE_RIGHT',
  },
  {
    id: 'CARD_TAG_RANDOM_MOVE_LEFT',
    name: '좌측 발동 태그 (무작위)',
    description: '무작위 칸에 좌측 발동 태그를 부여한다.',
    cost: 5,
    cardType: 'AddTagRandom',
    tagType: 'MOVE_LEFT',
  },
  {
    id: 'CARD_TAG_RANDOM_EXTEND',
    name: '수명 연장 태그 (무작위)',
    description: '무작위 칸에 수명 연장 태그를 부여한다.',
    cost: 6,
    cardType: 'AddTagRandom',
    tagType: 'EXTEND_LIFESPAN',
  },
  {
    id: 'CARD_TAG_RANDOM_SHIELD_BREAK',
    name: '방어막 파괴 태그 (무작위)',
    description: '무작위 칸에 방어막 파괴 태그를 부여한다.',
    cost: 4,
    cardType: 'AddTagRandom',
    tagType: 'SHIELD_BREAK',
  },

  // ── 태그: 선택 부여 ─────────────────────────────────────────
  {
    id: 'CARD_TAG_SELECT_CRITICAL',
    name: '치명타 태그',
    description: '선택한 칸에 치명타 태그를 부여한다.',
    cost: 5,
    cardType: 'AddTagSelect',
    tagType: 'CRITICAL',
  },
  {
    id: 'CARD_TAG_SELECT_CONSECUTIVE',
    name: '연속 태그',
    description: '선택한 칸에 연속 태그를 부여한다.',
    cost: 7,
    cardType: 'AddTagSelect',
    tagType: 'CONSECUTIVE',
  },
  {
    id: 'CARD_TAG_SELECT_HEAL',
    name: '회복 태그',
    description: '선택한 칸에 회복 태그를 부여한다.',
    cost: 5,
    cardType: 'AddTagSelect',
    tagType: 'HEAL',
  },
  {
    id: 'CARD_TAG_SELECT_GOLD',
    name: '황금 태그',
    description: '선택한 칸에 황금 태그를 부여한다.',
    cost: 5,
    cardType: 'AddTagSelect',
    tagType: 'GOLD',
  },
  {
    id: 'CARD_TAG_SELECT_SHIELD',
    name: '방어막 태그',
    description: '선택한 칸에 방어막 태그를 부여한다.',
    cost: 6,
    cardType: 'AddTagSelect',
    tagType: 'SHIELD',
  },
  {
    id: 'CARD_TAG_SELECT_MOVE_RIGHT',
    name: '우측 발동 태그',
    description: '선택한 칸에 우측 발동 태그를 부여한다.',
    cost: 7,
    cardType: 'AddTagSelect',
    tagType: 'MOVE_RIGHT',
  },
  {
    id: 'CARD_TAG_SELECT_MOVE_LEFT',
    name: '좌측 발동 태그',
    description: '선택한 칸에 좌측 발동 태그를 부여한다.',
    cost: 7,
    cardType: 'AddTagSelect',
    tagType: 'MOVE_LEFT',
  },
  {
    id: 'CARD_TAG_SELECT_EXTEND',
    name: '수명 연장 태그',
    description: '선택한 칸에 수명 연장 태그를 부여한다.',
    cost: 8,
    cardType: 'AddTagSelect',
    tagType: 'EXTEND_LIFESPAN',
  },
  {
    id: 'CARD_TAG_SELECT_SHIELD_BREAK',
    name: '방어막 파괴 태그',
    description: '선택한 칸에 방어막 파괴 태그를 부여한다.',
    cost: 6,
    cardType: 'AddTagSelect',
    tagType: 'SHIELD_BREAK',
  },

  // ── 태그 슬롯 확장 ───────────────────────────────────────────
  {
    id: 'CARD_MAX_TAG',
    name: '태그 확장',
    description: '선택한 칸의 최대 태그 슬롯을 +1 증가시킨다.',
    cost: 8,
    cardType: 'IncreaseMaxTags',
  },
];

export function getAllCards(): CardDef[] {
  return [...CARDS];
}
