import { BattleState } from '../types/battle.types';
import { CardDef } from '../types/card.types';
import { Slot } from '../types/slot.types';
import { getSkill } from '../data/skills';
import { TagSystem } from './TagSystem';
import { healPlayer } from './DamageSystem';

const tagSystem = new TagSystem();

export class CardSystem {
  // 카드 효과 적용 (슬롯 인덱스는 Select/Replace/Duplicate/Swap 계열에서 필요)
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
      case 'DamageRandom':
        return this.applyDamageRandom(state, card);
      case 'DamageSelect':
        return this.applyDamageSelect(state, card, targetSlotIndices ?? []);
      case 'DuplicateSlot':
        return this.applyDuplicateSlot(state, targetSlotIndices ?? []);
      case 'SwapSlots':
        return this.applySwapSlots(state, targetSlotIndices ?? []);
      case 'HealPlayer':
        return this.applyHealPlayer(state, card);
      case 'AddTagRandom':
        return this.applyAddTagRandom(state, card);
      case 'AddTagSelect':
        return this.applyAddTagSelect(state, card, targetSlotIndices ?? []);
      case 'IncreaseMaxTags':
        return this.applyIncreaseMaxTags(state, targetSlotIndices ?? []);
      default:
        return false;
    }
  }

  // 조건에 맞는 무작위 슬롯 1개 수정 (기존)
  private applyModifyRandom(state: BattleState, card: CardDef): boolean {
    const candidates = this.filterSlots(state.slots, card);
    if (candidates.length === 0) return false;

    const target = candidates[Math.floor(Math.random() * candidates.length)];
    this.applyModification(target, card);
    return true;
  }

  // 플레이어가 선택한 슬롯 수정 (기존)
  private applyModifySelect(state: BattleState, card: CardDef, indices: number[]): boolean {
    if (indices.length === 0) return false;

    const slot = state.slots[indices[0]];
    if (!slot) return false;

    if (!this.matchesFilter(slot, card)) return false;
    this.applyModification(slot, card);
    return true;
  }

  // 연속 n칸을 특정 스킬로 교체 (기존)
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

  // 조건에 맞는 모든 슬롯 수정 (기존)
  private applyModifyGlobal(state: BattleState, card: CardDef): boolean {
    const targets = this.filterSlots(state.slots, card);
    if (targets.length === 0) return false;

    for (const slot of targets) {
      this.applyModification(slot, card);
    }
    return true;
  }

  // 게임 규칙 파라미터 변경 (기존)
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

  // 무작위 공격 칸 피해 증가 (신규)
  private applyDamageRandom(state: BattleState, card: CardDef): boolean {
    const candidates = this.filterSlots(state.slots, card);
    if (candidates.length === 0) return false;

    const target = candidates[Math.floor(Math.random() * candidates.length)];
    target.flatDamageBonus += card.damageDelta ?? 3;
    return true;
  }

  // 선택 칸 피해 증가 (신규)
  private applyDamageSelect(state: BattleState, card: CardDef, indices: number[]): boolean {
    if (indices.length === 0) return false;
    const slot = state.slots[indices[0]];
    if (!slot) return false;
    if (!this.matchesFilter(slot, card)) return false;
    slot.flatDamageBonus += card.damageDelta ?? 3;
    return true;
  }

  // 슬롯 복제 (source → dest 전체 내용 복사, 태그 포함) (신규)
  private applyDuplicateSlot(state: BattleState, indices: number[]): boolean {
    if (indices.length < 2) return false;
    const src = state.slots[indices[0]];
    const dst = state.slots[indices[1]];
    if (!src || !dst) return false;

    dst.skillId = src.skillId;
    dst.category = src.category;
    dst.attackType = src.attackType;
    dst.flatDamageBonus = src.flatDamageBonus;
    dst.percentDamageBonus = src.percentDamageBonus;
    dst.tempCurseTimer = 0;
    delete dst.originalSkillId;
    delete dst.originalCategory;
    // 태그 딥 카피
    dst.tags = src.tags.map(t => ({ ...t }));
    dst.maxTags = src.maxTags;
    return true;
  }

  // 두 슬롯 교환 (신규)
  private applySwapSlots(state: BattleState, indices: number[]): boolean {
    if (indices.length < 2) return false;
    const a = state.slots[indices[0]];
    const b = state.slots[indices[1]];
    if (!a || !b) return false;

    const tmpSkill = a.skillId;
    const tmpCat = a.category;
    const tmpAtk = a.attackType;
    const tmpFlat = a.flatDamageBonus;
    const tmpPct = a.percentDamageBonus;
    const tmpTags = a.tags;
    const tmpMaxTags = a.maxTags;

    a.skillId = b.skillId;
    a.category = b.category;
    a.attackType = b.attackType;
    a.flatDamageBonus = b.flatDamageBonus;
    a.percentDamageBonus = b.percentDamageBonus;
    a.tags = b.tags;
    a.maxTags = b.maxTags;
    a.tempCurseTimer = 0;
    delete a.originalSkillId;
    delete a.originalCategory;

    b.skillId = tmpSkill;
    b.category = tmpCat;
    b.attackType = tmpAtk;
    b.flatDamageBonus = tmpFlat;
    b.percentDamageBonus = tmpPct;
    b.tags = tmpTags;
    b.maxTags = tmpMaxTags;
    b.tempCurseTimer = 0;
    delete b.originalSkillId;
    delete b.originalCategory;

    return true;
  }

  // HP 즉시 회복 (신규)
  private applyHealPlayer(state: BattleState, card: CardDef): boolean {
    const amount = card.healAmount ?? 20;
    healPlayer(state, amount);
    return true;
  }

  // 무작위 칸에 태그 부여 (신규)
  private applyAddTagRandom(state: BattleState, card: CardDef): boolean {
    if (!card.tagType) return false;
    const candidates = [...state.slots];
    if (candidates.length === 0) return false;

    const target = candidates[Math.floor(Math.random() * candidates.length)];
    const result = tagSystem.addTagToSlot(target, card.tagType);
    return result.success;
  }

  // 선택 칸에 태그 부여 (신규)
  private applyAddTagSelect(state: BattleState, card: CardDef, indices: number[]): boolean {
    if (!card.tagType || indices.length === 0) return false;
    const slot = state.slots[indices[0]];
    if (!slot) return false;

    const result = tagSystem.addTagToSlot(slot, card.tagType);
    return result.success;
  }

  // 선택 칸 최대 태그 수 +1 (신규)
  private applyIncreaseMaxTags(state: BattleState, indices: number[]): boolean {
    if (indices.length === 0) return false;
    const slot = state.slots[indices[0]];
    if (!slot) return false;

    slot.maxTags += 1;
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

  // 드래그에 필요한 카드인지 확인 (슬롯 선택이 필요한 카드)
  requiresDrag(card: CardDef): boolean {
    return (
      card.cardType === 'ModifySelect' ||
      card.cardType === 'ReplaceSlots' ||
      card.cardType === 'DamageSelect' ||
      card.cardType === 'DuplicateSlot' ||
      card.cardType === 'AddTagSelect' ||
      card.cardType === 'IncreaseMaxTags'
    );
  }

  // 슬롯 선택 모드가 필요한 카드인지 (2칸 선택 등)
  requiresSlotSelect(card: CardDef): boolean {
    return (
      card.cardType === 'DuplicateSlot' ||
      card.cardType === 'SwapSlots' ||
      card.cardType === 'DamageSelect' ||
      card.cardType === 'AddTagSelect' ||
      card.cardType === 'IncreaseMaxTags'
    );
  }

  // 슬롯 선택 모드에서 필요한 선택 수
  requiredSlotCount(card: CardDef): number {
    if (card.cardType === 'DuplicateSlot' || card.cardType === 'SwapSlots') return 2;
    return 1;
  }
}
