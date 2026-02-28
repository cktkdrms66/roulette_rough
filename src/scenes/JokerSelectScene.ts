import Phaser from 'phaser';
import { BattleState } from '../types/battle.types';
import { JokerDef } from '../types/joker.types';
import { getAllJokers } from '../data/jokers';

const MAX_JOKERS = 5;
const CARD_W = 160;
const CARD_H = 200;

export class JokerSelectScene extends Phaser.Scene {
  private battleState!: BattleState;
  private offeredJokers: JokerDef[] = [];

  constructor() {
    super({ key: 'JokerSelectScene' });
  }

  init(data: { state?: BattleState }): void {
    this.battleState = data.state ?? ({} as BattleState);
    this.offeredJokers = this.pickJokers(3);
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // 배경
    this.add.rectangle(0, 0, width, height, 0x0d1117).setOrigin(0);

    // 제목
    this.add.text(width / 2, 40, '조커를 선택하세요', {
      fontSize: '28px',
      color: '#9b59b6',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    if (this.battleState.jokers?.length >= MAX_JOKERS) {
      this.add.text(width / 2, 100, '조커 슬롯이 가득 찼습니다!', {
        fontSize: '18px',
        color: '#e74c3c',
      }).setOrigin(0.5);
      this.addSkipButton(width / 2, height / 2);
      return;
    }

    // 조커 카드 표시
    const spacing = CARD_W + 20;
    const startX = width / 2 - (this.offeredJokers.length - 1) * spacing / 2;

    for (let i = 0; i < this.offeredJokers.length; i++) {
      const joker = this.offeredJokers[i];
      const cx = startX + i * spacing;
      this.createJokerCard(cx, height / 2 - 20, joker);
    }

    // 스킵 버튼
    this.addSkipButton(width / 2, height - 80);
  }

  private createJokerCard(x: number, y: number, joker: JokerDef): void {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a2e, 1);
    bg.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 10);
    bg.lineStyle(2, 0x9b59b6, 1);
    bg.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 10);

    // 상단 헤더
    const header = this.add.graphics();
    header.fillStyle(0x8e44ad, 1);
    header.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, 30, { tl: 10, tr: 10, bl: 0, br: 0 });

    const nameText = this.add.text(0, -CARD_H / 2 + 15, joker.name, {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const triggerText = this.add.text(0, -CARD_H / 2 + 52, `[${this.getTriggerName(joker)}]`, {
      fontSize: '11px',
      color: '#bb8fce',
    }).setOrigin(0.5);

    const descText = this.add.text(0, -10, joker.description, {
      fontSize: '12px',
      color: '#ecf0f1',
      wordWrap: { width: CARD_W - 20 },
      align: 'center',
    }).setOrigin(0.5);

    container.add([bg, header, nameText, triggerText, descText]);

    // 인터랙션
    container.setSize(CARD_W, CARD_H);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      this.tweens.add({ targets: container, scaleX: 1.05, scaleY: 1.05, duration: 100 });
    });
    container.on('pointerout', () => {
      this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 100 });
    });
    container.on('pointerdown', () => {
      this.selectJoker(joker);
    });
  }

  private addSkipButton(x: number, y: number): void {
    const btn = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(0x2c3e50, 1);
    bg.fillRoundedRect(-60, -20, 120, 40, 8);

    const txt = this.add.text(0, 0, '건너뛰기', {
      fontSize: '16px',
      color: '#95a5a6',
    }).setOrigin(0.5);

    btn.add([bg, txt]);
    btn.setSize(120, 40);
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => this.proceedToMap());
    btn.on('pointerover', () => txt.setColor('#ecf0f1'));
    btn.on('pointerout', () => txt.setColor('#95a5a6'));
  }

  private selectJoker(joker: JokerDef): void {
    if (this.battleState.jokers) {
      this.battleState.jokers.push(joker);
    }
    this.proceedToMap();
  }

  private proceedToMap(): void {
    this.scene.start('MapScene', { state: this.battleState });
  }

  private pickJokers(count: number): JokerDef[] {
    const all = getAllJokers();
    // 이미 가진 조커 제외
    const owned = this.battleState.jokers?.map(j => j.id) ?? [];
    const available = all.filter(j => !owned.includes(j.id));
    return available.sort(() => Math.random() - 0.5).slice(0, count);
  }

  private getTriggerName(joker: JokerDef): string {
    const names: Record<string, string> = {
      OnAttackHit: '공격 시',
      OnGoldGained: '골드 획득 시',
      OnCurseTriggered: '저주 발동 시',
      OnSpinResolved: '스핀 완료 시',
    };
    return names[joker.trigger] ?? joker.trigger;
  }
}
