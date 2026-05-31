import type { Metadata } from 'next';
import Script from 'next/script';
import Providers from './providers';
import './globals.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'PrivStack - Homelab Dashboard',
  description: 'Self-hosted homelab dashboard',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-bg-dark">
        <Providers>{children}</Providers>
        <Script
          id="particle-background"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (() => {
                if (document.getElementById('particle-canvas')) {
                  return;
                }

                const canvas = document.createElement('canvas');
                canvas.id = 'particle-canvas';
                document.body.appendChild(canvas);

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                  return;
                }

                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;

                const particles = [];
                const particleCount = 50;

                class Particle {
                  constructor() {
                    this.x = Math.random() * canvas.width;
                    this.y = Math.random() * canvas.height;
                    this.vx = (Math.random() - 0.5) * 0.5;
                    this.vy = (Math.random() - 0.5) * 0.5;
                    this.radius = Math.random() * 1 + 0.5;
                    this.opacity = Math.random() * 0.5 + 0.1;
                  }

                  update() {
                    this.x += this.vx;
                    this.y += this.vy;

                    if (this.x < 0) this.x = canvas.width;
                    if (this.x > canvas.width) this.x = 0;
                    if (this.y < 0) this.y = canvas.height;
                    if (this.y > canvas.height) this.y = 0;
                  }

                  draw() {
                    ctx.fillStyle = \`rgba(59, 130, 246, \${this.opacity})\`;
                    ctx.beginPath();
                    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                    ctx.fill();
                  }
                }

                for (let i = 0; i < particleCount; i++) {
                  particles.push(new Particle());
                }

                function animate() {
                  ctx.fillStyle = 'rgba(10, 10, 15, 0.01)';
                  ctx.fillRect(0, 0, canvas.width, canvas.height);

                  particles.forEach(p => {
                    p.update();
                    p.draw();
                  });

                  requestAnimationFrame(animate);
                }

                animate();

                window.addEventListener('resize', () => {
                  canvas.width = window.innerWidth;
                  canvas.height = window.innerHeight;
                });
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
