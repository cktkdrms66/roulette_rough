import Phaser from 'phaser';
import { MAP_NODES, MapNode, getStartNode } from '../data/maps';
import { BattleState } from '../types/battle.types';

export class MapScene extends Phaser.Scene {
  private currentNodeId: string = 'start';
  private completedNodeIds: Set<string> = new Set();
  private incomingState: BattleState | null = null;

  constructor() {
    super({ key: 'MapScene' });
  }

  init(data: { state?: BattleState } = {}): void {
    if (data.state) {
      this.incomingState = data.state;
    }
  }

  create(): void {
    const { width, height } = this.cameras.main;

    // 배경
    this.add.rectangle(0, 0, width, height, 0x0d1117).setOrigin(0);

    // 제목
    this.add.text(width / 2, 30, 'RouletteRough - 맵', {
      fontSize: '24px',
      color: '#e74c3c',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // 새 런이면 초기화
    if (!this.incomingState) {
      this.currentNodeId = getStartNode().id;
      this.completedNodeIds = new Set();
    }

    // 노드 간 연결선 그리기
    this.drawConnections(width, height);

    // 노드 버튼 그리기
    this.drawNodes(width, height);

    // 범례
    this.drawLegend(20, height - 80);
  }

  private drawConnections(width: number, height: number): void {
    const g = this.add.graphics();
    g.lineStyle(2, 0x2c3e50, 0.6);

    for (const node of MAP_NODES) {
      const nx = node.x * width;
      const ny = node.y * height;
      for (const nextId of node.nextNodeIds) {
        const next = MAP_NODES.find(n => n.id === nextId);
        if (!next) continue;
        g.lineBetween(nx, ny, next.x * width, next.y * height);
      }
    }
  }

  private drawNodes(width: number, height: number): void {
    for (const node of MAP_NODES) {
      const nx = node.x * width;
      const ny = node.y * height;
      this.createNodeButton(node, nx, ny);
    }
  }

  private createNodeButton(node: MapNode, x: number, y: number): void {
    const isCompleted = this.completedNodeIds.has(node.id);
    const isAvailable = this.isNodeAvailable(node);
    const isCurrent = node.id === this.currentNodeId;

    const container = this.add.container(x, y);

    // 노드 색상
    const colorMap: Record<string, number> = {
      Battle: 0xc0392b,
      Elite: 0xe67e22,
      Boss: 0x8e44ad,
    };
    const color = isCompleted ? 0x555555 : (colorMap[node.type] ?? 0x555555);

    const circle = this.add.graphics();
    circle.fillStyle(color, isAvailable ? 1 : 0.4);
    circle.fillCircle(0, 0, 28);
    circle.lineStyle(3, isCurrent ? 0xf1c40f : (isAvailable ? 0xffffff : 0x555555), 1);
    circle.strokeCircle(0, 0, 28);

    if (isCompleted) {
      circle.lineStyle(2, 0x27ae60, 1);
      circle.strokeCircle(0, 0, 28);
    }

    const iconMap: Record<string, string> = {
      Battle: '⚔️',
      Elite: '💀',
      Boss: '👹',
    };

    const label = this.add.text(0, -4, iconMap[node.type] ?? '?', {
      fontSize: '18px',
    }).setOrigin(0.5);

    const typeLabel = this.add.text(0, 38, node.label, {
      fontSize: '11px',
      color: isAvailable ? '#ecf0f1' : '#7f8c8d',
    }).setOrigin(0.5);

    container.add([circle, label, typeLabel]);

    // 인터랙션 (완료되지 않고 진입 가능한 노드만)
    if (isAvailable && !isCompleted) {
      container.setSize(56, 56);
      container.setInteractive({ useHandCursor: true });

      container.on('pointerover', () => {
        this.tweens.add({ targets: container, scaleX: 1.1, scaleY: 1.1, duration: 80 });
      });
      container.on('pointerout', () => {
        this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 80 });
      });
      container.on('pointerdown', () => {
        this.enterNode(node);
      });
    }
  }

  private isNodeAvailable(node: MapNode): boolean {
    if (node.id === this.currentNodeId) return true;

    // 이전 노드가 완료된 노드여야 함
    for (const n of MAP_NODES) {
      if (n.nextNodeIds.includes(node.id) && this.completedNodeIds.has(n.id)) {
        return true;
      }
    }

    // 시작 노드는 항상 가능
    if (node.id === 'start' && this.completedNodeIds.size === 0) return true;

    return false;
  }

  private enterNode(node: MapNode): void {
    this.completedNodeIds.add(node.id);
    this.currentNodeId = node.id;

    // 전투 씬으로 전환
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('BattleScene', { wave: node.wave, state: this.incomingState });
    });
  }

  private drawLegend(x: number, y: number): void {
    const items = [
      { color: 0xc0392b, label: '일반 전투' },
      { color: 0xe67e22, label: '엘리트' },
      { color: 0x8e44ad, label: '보스' },
    ];

    for (let i = 0; i < items.length; i++) {
      const g = this.add.graphics();
      g.fillStyle(items[i].color, 1);
      g.fillCircle(x + 10, y + i * 22 + 10, 8);

      this.add.text(x + 26, y + i * 22, items[i].label, {
        fontSize: '12px',
        color: '#95a5a6',
      });
    }
  }
}
