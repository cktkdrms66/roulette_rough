import { BattleState } from '../types/battle.types';
import { CardDef } from '../types/card.types';
import { Slot } from '../types/slot.types';
import { getSkill } from '../data/skills';

export class CardSystem {
  // 카드 효과 적용 (슬롯 인덱스는 ModifySelect/ReplaceSlots에서 필요)
  applyCard(state: BattleState, card: CardDef, targetSlotIndices?: number[]): boolean {
    switch (card.cardType) {
      case 'ModifyRandom':
        return this.applyModifyRandom(state, card);
      case 'ModifySelect':
        return this.applyModifySelect(state, card, targetSlotIndices ?? []);
      case 'ReplaceSlots':
        return this.applyReplaceSlots(state, card, targetSlotIndices ?? []);
      case 'ModifyGlobal':
        return this.applyModifyGlobal(state, card);
      case 'RuleModify':
        return this.applyRuleModify(state, card);
      default:
        return false;
    }
  }

  // 조건에 맞는 무작위 슬롯 1개 수정
  private applyModifyRandom(state: BattleState, card: CardDef): boolean {
    const candidates = this.filterSlots(state.slots, card);
    if (candidates.length === 0) return false;

    const target = candidates[Math.floor(Math.random() * candidates.length)];
    this.applyModification(target, card);
    return true;
  }

  // 플레이어가 선택한 슬롯 수정
  private applyModifySelect(state: BattleState, card: CardDef, indices: number[]): boolean {
    if (indices.length === 0) return false;

    const slot = state.slots[indices[0]];
    if (!slot) return false;

    if (!this.matchesFilter(slot, card)) return false;
    this.applyModification(slot, card);
    return true;
  }

  // 연속 n칸을 특정 스킬로 교체
  private applyReplaceSlots(state: BattleState, card: CardDef, indices: number[]): boolean {
    const count = card.replaceCount ?? 1;
    if (indices.length < count) return false;

    const targetSkillId = card.replaceSkillId;
    if (!targetSkillId) return false;

    const skill = getSkill(targetSkillId);

    for (let i = 0; i < count; i++) {
      const slotIndex = indices[i % indices.length];
      const slot = state.slots[slotIndex];
      if (!slot) continue;

      slot.skillId = targetSkillId;
      slot.category = skill.category;
      slot.attackType = skill.attackType;
      slot.flatDamageBonus = card.replaceBonus ?? 0;
      slot.percentDamageBonus = 0;
      slot.tempCurseTimer = 0;
      delete slot.originalSkillId;
      delete slot.originalCategory;
    }

    return true;
  }

  // 조건에 맞는 모든 슬롯 수정 (즉시 적용)
  private applyModifyGlobal(state: BattleState, card: CardDef): boolean {
    const targets = this.filterSlots(state.slots, card);
    if (targets.length === 0) return false;

    for (const slot of targets) {
      this.applyModification(slot, card);
    }
    return true;
  }

  // 게임 규칙 파라미터 변경
  private applyRuleModify(state: BattleState, card: CardDef): boolean {
    if (!card.ruleKey || card.ruleValue === undefined) return false;

    switch (card.ruleKey) {
      case 'freeRerolls':
        state.freeRerolls += card.ruleValue;
        break;
      case 'rerollCost':
        state.rerollCost = Math.max(0, state.rerollCost + card.ruleValue);
        break;
      case 'playerMaxHP': {
        const delta = card.ruleValue;
        state.playerMaxHP += delta;
        state.playerHP = Math.min(state.playerHP + delta, state.playerMaxHP);
        break;
      }
      default:
        return false;
    }

    return true;
  }

  private filterSlots(slots: Slot[], card: CardDef): Slot[] {
    return slots.filter(s => this.matchesFilter(s, card));
  }

  private matchesFilter(slot: Slot, card: CardDef): boolean {
    const filter = card.filter;
    if (!filter) return true;

    if (filter.category && slot.category !== filter.category) return false;
    if (filter.attackType && slot.attackType !== filter.attackType) return false;
    if (filter.skillId && slot.skillId !== filter.skillId) return false;

    return true;
  }

  private applyModification(slot: Slot, card: CardDef): void {
    const mod = card.modification;
    if (!mod) return;

    if (mod.flatDamageBonusDelta !== undefined) {
      slot.flatDamageBonus += mod.flatDamageBonusDelta;
    }
    if (mod.percentDamageBonusDelta !== undefined) {
      slot.percentDamageBonus += mod.percentDamageBonusDelta;
    }
    if (mod.skillId !== undefined) {
      const skill = getSkill(mod.skillId);
      slot.skillId = mod.skillId;
      slot.category = skill.category;
      slot.attackType = skill.attackType;
    }
  }

  // 드래그에 필요한 카드인지 확인
  requiresDrag(card: CardDef): boolean {
    return card.cardType === 'ModifySelect' || card.cardType === 'ReplaceSlots';
  }
}
