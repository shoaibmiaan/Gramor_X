// components/sections/HowItWorks.tsx
import React from 'react';
import { Container } from '@/components/design-system/Container';
import { Section } from '@/components/design-system/Section';
import { Card } from '@/components/design-system/Card';
import { Icon } from '@/components/design-system/Icon';
import { Badge } from '@/components/design-system/Badge';

const steps = [
  {
    step: "01",
    title: "Diagnose Your Level",
    description: "Take a 30-minute assessment to identify your current band and weak areas",
    icon: "Scan",
    features: ["Current band score", "Skill breakdown", "Personalized insights"],
    color: "from-blue-500 to-cyan-500"
  },
  {
    step: "02",
    title: "Practice with AI Coaching",
    description: "Get daily adaptive exercises with instant AI feedback and scoring",
    icon: "Brain",
    features: ["Adaptive exercises", "Instant AI feedback", "Progress tracking"],
    color: "from-purple-500 to-pink-500"
  },
  {
    step: "03",
    title: "Improve with Expert Support",
    description: "Receive human teacher reviews and join live workshops to master tough areas",
    icon: "TrendingUp",
    features: ["Teacher reviews", "Live workshops", "Band improvement"],
    color: "from-green-500 to-emerald-500"
  }
];

export const HowItWorks: React.FC = () => {
  return (
    <Section id="how-it-works">
      <Container>
        <div className="text-center mb-16">
          <Badge variant="accent" size="sm" className="mb-4 inline-flex items-center gap-2">
            <Icon name="PlayCircle" className="text-electricBlue" />
            Simple 3-Step Process
          </Badge>
          <h2 className="font-slab text-3xl md:text-4xl font-bold text-foreground mb-4">
            How You'll Achieve Your Target Band
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From diagnostic to test day, we guide you every step of the way with AI and expert support.
          </p>
        </div>

        <div className="relative">
          {/* Connecting Line */}
          <div className="hidden lg:block absolute top-20 left-1/2 transform -translate-x-1/2 w-2/3 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 z-0" />

          <div className="grid lg:grid-cols-3 gap-8 relative z-10">
            {steps.map((step, index) => (
              <div
                key={step.step}
                className="flex flex-col items-center"
                data-aos="fade-up"
                data-aos-delay={index * 150}
              >
                {/* Step Number */}
                <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center text-white font-slab text-2xl font-bold mb-6 shadow-lg`}>
                  {step.step}
                </div>

                <Card className="p-6 text-center border-border/60 bg-white/70 dark:bg-dark/70 backdrop-blur hover:shadow-lg transition-shadow">
                  {/* Icon */}
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-electricBlue to-purpleVibe text-white mb-4">
                    <Icon name={step.icon} size={28} />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold text-foreground mb-3">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    {step.description}
                  </p>

                  {/* Features */}
                  <ul className="space-y-2">
                    {step.features.map((feature, featureIndex) => (
                      <li
                        key={featureIndex}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        <Icon name="CheckCircle" className="text-green-500" size={16} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* Results Summary */}
        <div className="text-center mt-16" data-aos="fade-up">
          <Card className="inline-block border border-border/60 bg-background/80 px-8 py-6 max-w-2xl">
            <div className="flex flex-wrap justify-center gap-8 items-center">
              <div className="text-center">
                <div className="font-slab text-2xl font-bold text-electricBlue">1.5</div>
                <div className="text-sm text-muted-foreground">Avg Band Improvement</div>
              </div>
              <div className="text-center">
                <div className="font-slab text-2xl font-bold text-purpleVibe">6 weeks</div>
                <div className="text-sm text-muted-foreground">Typical Timeline</div>
              </div>
              <div className="text-center">
                <div className="font-slab text-2xl font-bold text-neonGreen">94%</div>
                <div className="text-sm text-muted-foreground">Success Rate</div>
              </div>
            </div>
          </Card>
        </div>
      </Container>
    </Section>
  );
};

export default HowItWorks;