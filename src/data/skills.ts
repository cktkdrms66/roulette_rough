import { SkillDef } from '../types/skill.types';

export const SKILLS: Record<string, SkillDef> = {
  BASIC_ATTACK: {
    id: 'BASIC_ATTACK',
    name: '기본 공격',
    description: '기본적인 물리 공격을 가한다.',
    category: 'Attack',
    attackType: 'Physical',
    basePower: 8,
  },

  POWER_STRIKE: {
    id: 'POWER_STRIKE',
    name: '강타',
    description: '강력한 물리 공격. 위력이 높다.',
    category: 'Attack',
    attackType: 'Physical',
    basePower: 18,
  },

  RAPID_STRIKE: {
    id: 'RAPID_STRIKE',
    name: '연속 베기',
    description: '3회 연속으로 약한 타격을 가한다.',
    category: 'Attack',
    attackType: 'Physical',
    basePower: 5,
    hitCount: 3,
  },

  COLD_PUNCH: {
    id: 'COLD_PUNCH',
    name: '냉기 주먹',
    description: '적을 스턴시키는 특수 공격. 스턴된 적에게 추가 피해.',
    category: 'Attack',
    attackType: 'Special',
    basePower: 10,
    specialParam: 5, // 스턴 시 추가 피해
  },

  FIRE_BOLT: {
    id: 'FIRE_BOLT',
    name: '화염 화살',
    description: '불꽃 특수 공격.',
    category: 'Attack',
    attackType: 'Special',
    basePower: 14,
  },

  THUNDER_CLAP: {
    id: 'THUNDER_CLAP',
    name: '천둥 손뼉',
    description: '강력한 번개 특수 공격.',
    category: 'Attack',
    attackType: 'Special',
    basePower: 20,
  },

  DEFENSE: {
    id: 'DEFENSE',
    name: '방어',
    description: '실드를 10 획득한다.',
    category: 'Transform',
    attackType: 'None',
    basePower: 10,
  },

  HEAL: {
    id: 'HEAL',
    name: '치유',
    description: 'HP를 8 회복한다.',
    category: 'Transform',
    attackType: 'None',
    basePower: 8,
  },

  DEEP_BREATH: {
    id: 'DEEP_BREATH',
    name: '심호흡',
    description: '다음 공격의 피해를 2배로 만든다.',
    category: 'Transform',
    attackType: 'None',
    basePower: 0,
    specialParam: 2, // 다음 공격 배율
  },

  CURSE: {
    id: 'CURSE',
    name: '저주',
    description: '이 칸이 발동되면 HP를 5 잃는다.',
    category: 'Curse',
    attackType: 'None',
    basePower: 5, // 잃는 HP
  },

  HEAVY_CURSE: {
    id: 'HEAVY_CURSE',
    name: '중저주',
    description: '이 칸이 발동되면 HP를 10 잃고 스턴된다.',
    category: 'Curse',
    attackType: 'None',
    basePower: 10,
    specialParam: 1, // 스턴 여부
  },
};

export function getSkill(id: string): SkillDef {
  const skill = SKILLS[id];
  if (!skill) throw new Error(`Unknown skill: ${id}`);
  return skill;
}
