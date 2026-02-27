// components/sections/SocialProof.tsx
import React from 'react';
import { Container } from '@/components/design-system/Container';
import { Icon } from '@/components/design-system/Icon';

const trustMetrics = [
  {
    icon: 'Users',
    value: '18,000+',
    label: 'Active Learners',
    description: 'From 120+ countries'
  },
  {
    icon: 'TrendingUp',
    value: '1.5',
    label: 'Avg Band Improvement',
    description: 'After 6 weeks'
  },
  {
    icon: 'Award',
    value: '94%',
    label: 'Satisfaction Rate',
    description: 'Based on user reviews'
  },
  {
    icon: 'Clock',
    value: '< 4h',
    label: 'Feedback Turnaround',
    description: 'AI + teacher responses'
  }
];

const securityBadges = [
  {
    name: 'SSL Secured',
    icon: 'ShieldCheck',
    color: 'text-green-500'
  },
  {
    name: 'GDPR Compliant',
    icon: 'Lock',
    color: 'text-blue-500'
  },
  {
    name: 'Payment Protected',
    icon: 'CreditCard',
    color: 'text-purple-500'
  }
];

export const SocialProof: React.FC = () => {
  return (
    <Container>
      <div className="text-center">
        {/* Trust Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {trustMetrics.map((metric, index) => (
            <div
              key={metric.label}
              className="text-center"
              data-aos="fade-up"
              data-aos-delay={index * 100}
            >
              <div className="flex justify-center mb-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-electricBlue/10 text-electricBlue">
                  <Icon name={metric.icon} size={24} />
                </div>
              </div>
              <div className="font-slab text-2xl font-bold text-foreground mb-1">
                {metric.value}
              </div>
              <div className="text-sm font-semibold text-foreground mb-1">
                {metric.label}
              </div>
              <div className="text-xs text-muted-foreground">
                {metric.description}
              </div>
            </div>
          ))}
        </div>

        {/* Security Badges */}
        <div className="flex flex-wrap justify-center items-center gap-8 py-6 border-t border-b border-border/30">
          <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Trusted & Secure
          </span>

          {securityBadges.map((badge, index) => (
            <div
              key={badge.name}
              className="flex items-center gap-2 text-sm text-muted-foreground"
              data-aos="fade-in"
              data-aos-delay={index * 150}
            >
              <Icon name={badge.icon} className={badge.color} size={16} />
              <span>{badge.name}</span>
            </div>
          ))}
        </div>

        {/* Partner Logos */}
        <div className="mt-8">
          <p className="text-sm text-muted-foreground mb-6">
            Trusted by learners from top institutions
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
            {/* These would be actual logo images in production */}
            <div className="text-lg font-semibold text-foreground/70">Cambridge</div>
            <div className="text-lg font-semibold text-foreground/70">British Council</div>
            <div className="text-lg font-semibold text-foreground/70">IDP</div>
            <div className="text-lg font-semibold text-foreground/70">CEFR</div>
          </div>
        </div>
      </div>
    </Container>
  );
};

export default SocialProof;