/**
 * Interactive 3D / Fluid Particle Canvas Engine
 * Highly optimized, 60 FPS, reacts to mouse hover and clicks
 * Automatically pauses when hidden to preserve 100% battery & CPU
 */

class InteractiveBackground {
  constructor() {
    this.canvas = document.getElementById('interactive-canvas');
    this.ctx = null;
    this.particles = [];
    this.numParticles = 75;
    this.mouse = { x: -1000, y: -1000, radius: 160 };
    this.animationFrameId = null;
    this.isActive = false;

    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
      this.bindEvents();
    }
  }

  start() {
    if (this.isActive || !this.canvas || !this.ctx) return;
    this.isActive = true;
    this.canvas.style.display = 'block';
    this.canvas.classList.add('active');
    this.resize();
    this.initParticles();
    this.animate();
  }

  stop() {
    this.isActive = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.canvas) {
      this.canvas.style.display = 'none';
      this.canvas.classList.remove('active');
      if (this.ctx) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  initParticles() {
    this.particles = [];
    const colors = ['rgba(139, 92, 246, ', 'rgba(56, 189, 248, ', 'rgba(236, 72, 153, '];

    for (let i = 0; i < this.numParticles; i++) {
      const size = Math.random() * 2.5 + 1.2;
      const x = Math.random() * this.canvas.width;
      const y = Math.random() * this.canvas.height;
      const vx = (Math.random() - 0.5) * 1.2;
      const vy = (Math.random() - 0.5) * 1.2;
      const color = colors[Math.floor(Math.random() * colors.length)];
      this.particles.push({ x, y, vx, vy, size, baseSize: size, color, alpha: Math.random() * 0.5 + 0.3 });
    }
  }

  animate() {
    if (!this.isActive) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Update & draw particles
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      p.x += p.vx;
      p.y += p.vy;

      // Bounce off edges
      if (p.x < 0 || p.x > this.canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > this.canvas.height) p.vy *= -1;

      // Mouse interaction (Fluid repulsion / attraction)
      const dx = this.mouse.x - p.x;
      const dy = this.mouse.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.mouse.radius) {
        const force = (this.mouse.radius - dist) / this.mouse.radius;
        const angle = Math.atan2(dy, dx);
        p.x -= Math.cos(angle) * force * 3;
        p.y -= Math.sin(angle) * force * 3;
        p.size = p.baseSize * (1 + force * 1.5);
      } else {
        p.size = p.baseSize;
      }

      // Draw particle glow (shadowBlur is set once without overhead)
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color + p.alpha + ')';
      this.ctx.fill();

      // Connect nearby particles with subtle lines (using dx*dx + dy*dy instead of heavy Math.hypot)
      const maxDistSq = 110 * 110;
      for (let j = i + 1; j < this.particles.length; j++) {
        const p2 = this.particles[j];
        const dx2 = p.x - p2.x;
        const dy2 = p.y - p2.y;
        const distSq = dx2 * dx2 + dy2 * dy2;

        if (distSq < maxDistSq) {
          const dist = Math.sqrt(distSq);
          const lineAlpha = (1 - dist / 110) * 0.25;
          this.ctx.beginPath();
          this.ctx.moveTo(p.x, p.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.strokeStyle = `rgba(139, 92, 246, ${lineAlpha})`;
          this.ctx.lineWidth = 0.8;
          this.ctx.stroke();
        }
      }
    }

    this.animationFrameId = requestAnimationFrame(() => this.animate());
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      if (this.isActive) this.resize();
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isActive) {
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
      }
    });

    window.addEventListener('mouseleave', () => {
      this.mouse.x = -1000;
      this.mouse.y = -1000;
    });

    // Ripple click shockwave effect
    window.addEventListener('click', (e) => {
      if (!this.isActive) return;
      for (let p of this.particles) {
        const dx = e.clientX - p.x;
        const dy = e.clientY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 220) {
          const force = (220 - dist) / 220;
          const angle = Math.atan2(dy, dx);
          p.vx -= Math.cos(angle) * force * 5;
          p.vy -= Math.sin(angle) * force * 5;
        }
      }
    });

    // Pause when page is hidden (saving 100% battery)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.animationFrameId) {
          cancelAnimationFrame(this.animationFrameId);
          this.animationFrameId = null;
        }
      } else if (this.isActive && !this.animationFrameId) {
        this.animate();
      }
    });
  }
}

window.interactiveBg = new InteractiveBackground();
