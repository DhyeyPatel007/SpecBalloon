import { Point } from '../types/metrology';

export interface PhysicsBalloon {
  id: number;
  label: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  anchorX: number;
  anchorY: number;
  radius: number;
  isDragging?: boolean;
}

export class ForceDirectedSimulator {
  balloons: PhysicsBalloon[] = [];
  springK = 0.04;
  repulsionK = 3800;
  damping = 0.82;
  minDist = 32;

  constructor(balloons: PhysicsBalloon[]) {
    this.balloons = balloons;
  }

  setBalloons(balloons: PhysicsBalloon[]) {
    this.balloons = balloons;
  }

  step(cursorPos?: Point | null) {
    const n = this.balloons.length;

    for (let i = 0; i < n; i++) {
      const b1 = this.balloons[i];
      if (b1.isDragging) continue;

      let fx = 0;
      let fy = 0;

      // 1. Spring force to anchor dimension
      const dxAnchor = b1.anchorX - b1.x;
      const dyAnchor = b1.anchorY - b1.y;
      fx += dxAnchor * this.springK;
      fy += dyAnchor * this.springK;

      // 2. Repulsion from other balloons
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const b2 = this.balloons[j];
        const dx = b1.x - b2.x;
        const dy = b1.y - b2.y;
        const distSq = Math.max(100, dx * dx + dy * dy);
        const dist = Math.sqrt(distSq);

        if (dist < 120) {
          const force = this.repulsionK / distSq;
          fx += (dx / dist) * force;
          fy += (dy / dist) * force;
        }
      }

      // 3. Repulsion from cursor
      if (cursorPos) {
        const cdx = b1.x - cursorPos.x;
        const cdy = b1.y - cursorPos.y;
        const cDistSq = Math.max(25, cdx * cdx + cdy * cdy);
        const cDist = Math.sqrt(cDistSq);
        if (cDist < 80) {
          const cForce = (this.repulsionK * 1.5) / cDistSq;
          fx += (cdx / cDist) * cForce;
          fy += (cdy / cDist) * cForce;
        }
      }

      // Update velocity & position
      b1.vx = (b1.vx + fx) * this.damping;
      b1.vy = (b1.vy + fy) * this.damping;

      b1.x += b1.vx;
      b1.y += b1.vy;
    }
  }
}
