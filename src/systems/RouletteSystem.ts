import { BattleState } from '../types/battle.types';
import { JOKERS } from '../data/jokers';

export interface SpinResult {
  landedIndex: number;
  triggerList: number[]; // 발동할 슬롯 인덱스 목록 (순서대로)
  finalAngle: number;
}

export class RouletteSystem {
  private readonly EXTRA_REVOLUTIONS = 5;
  private readonly SLOT_COUNT = 12;
  private readonly DEG_PER_SLOT = 360 / this.SLOT_COUNT; // 30도

  randomLandingIndex(): number {
    return Math.floor(Math.random() * this.SLOT_COUNT);
  }

  // 현재 각도에서 목표 슬롯이 상단(바늘 위치=270°)에 오도록 최종 각도 계산
  // 슬롯 i는 로컬 i*30° 위치 → 컨테이너 각 A일 때 월드 i*30+A°
  // 바늘(270°)에 오려면: i*30 + A = 270  →  A = 270 - i*30
  computeSpinAngle(currentAngle: number, targetIndex: number): number {
    const targetContainerAngle = 270 - targetIndex * this.DEG_PER_SLOT;
    const normalizedCurrent = ((currentAngle % 360) + 360) % 360;
    let delta = ((targetContainerAngle - normalizedCurrent) % 360 + 360) % 360;
    if (delta === 0) delta = 360; // 최소 1바퀴 보장
    return currentAngle + this.EXTRA_REVOLUTIONS * 360 + delta;
  }

  // 발동할 슬롯 목록 생성
  buildTriggerList(state: BattleState, landedIndex: number): number[] {
    const triggers: number[] = [landedIndex];

    // 오른쪽 조커 체크: 50% 확률로 index+1 추가 발동
    const hasRightJoker = state.jokers.some(j => j.id === 'JOKER_RIGHT');
    if (hasRightJoker) {
      const rightJoker = JOKERS.find(j => j.id === 'JOKER_RIGHT');
      const prob = rightJoker?.param ?? 0.5;
      const nextIndex = landedIndex + 1;
      if (nextIndex < this.SLOT_COUNT && Math.random() < prob) {
        triggers.push(nextIndex);
      }
    }

    return triggers;
  }

  // 스핀 결과 계산 (랜덤 착지)
  resolveSpin(state: BattleState, currentAngle: number): SpinResult {
    const landedIndex = this.randomLandingIndex();
    const finalAngle = this.computeSpinAngle(currentAngle, landedIndex);
    const triggerList = this.buildTriggerList(state, landedIndex);

    return {
      landedIndex,
      triggerList,
      finalAngle,
    };
  }
}
