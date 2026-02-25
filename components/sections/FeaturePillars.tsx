// components/sections/FeaturePillars.tsx
import React from 'react';
import { Container } from '@/components/design-system/Container';
import { Section } from '@/components/design-system/Section';
import { Card } from '@/components/design-system/Card';
import { Icon } from '@/components/design-system/Icon';
import { Badge } from '@/components/design-system/Badge';
import { Button } from '@/components/design-system/Button';

const pillars = [
  {
    title: "Adaptive Learning",
    description: "AI that customizes your study plan based on your performance and goals",
    icon: "BrainCircuit",
    features: [
      "Personalized daily lessons",
      "Weakness detection",
      "Target band optimization"
    ],
    cta: "View Sample Plan",
    href: "/learning",
    gradient: "from-purple-500 to-pink-500"
  },
  {
    title: "Instant AI Feedback",
    description: "Get detailed band-specific feedback on writing and speaking in seconds",
    icon: "Zap",
    features: [
      "Writing band estimates",
      "Speaking transcription",
      "Pronunciation analysis"
    ],
    cta: "Try AI Grader",
    href: "/writing",
    gradient: "from-blue-500 to-cyan-500"
  },
  {
    title: "Real Exam Simulation",
    description: "Practice with authentic exam interface, timer, and question types",
    icon: "ClipboardCheck",
    features: [
      "Full-length mocks",
      "Exam-day interface",
      "Performance analytics"
    ],
    cta: "Take Mock Test",
    href: "/mock",
    gradient: "from-green-500 to-emerald-500"
  },
  {
    title: "Progress Intelligence",
    description: "Track your improvement with detailed analytics and band predictions",
    icon: "BarChart3",
    features: [
      "Band trajectory",
      "Skill breakdown",
      "Test day prediction"
    ],
    cta: "See Analytics",
    href: "/progress",
    gradient: "from-orange-500 to-red-500"
  }
];

export const FeaturePillars: React.FC = () => {
  return (
    <Section id="features">
      <Container>
        <div className="text-center mb-16">
          <Badge variant="info" size="sm" className="mb-4 inline-flex items-center gap-2">
            <Icon name="Star" className="text-electricBlue" />
            4 Pillars of Success
          </Badge>
          <h2 className="font-slab text-3xl md:text-4xl font-bold text-foreground mb-4">
            Everything You Need to Succeed
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We combine AI technology with expert IELTS knowledge to create the most effective preparation platform.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {pillars.map((pillar, index) => (
            <Card
              key={pillar.title}
              className="p-6 border-border/60 bg-white/70 dark:bg-dark/70 backdrop-blur hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              data-aos="fade-up"
              data-aos-delay={index * 100}
            >
              {/* Header */}
              <div className="flex items-start gap-4 mb-4">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${pillar.gradient} flex items-center justify-center text-white flex-shrink-0`}>
                  <Icon name={pillar.icon} size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {pillar.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-6">
                {pillar.features.map((feature, featureIndex) => (
                  <li
                    key={featureIndex}
                    className="flex items-center gap-3 text-sm text-muted-foreground"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-electricBlue flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button
                href={pillar.href}
                variant="outline"
                className="w-full justify-center border-border/60 hover:border-electricBlue/40"
              >
                {pillar.cta}
              </Button>
            </Card>
          ))}
        </div>

        {/* Integration Note */}
        <div className="text-center mt-12" data-aos="fade-up">
          <Card className="inline-block border border-electricBlue/30 bg-electricBlue/5 px-6 py-4">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">All features work together</strong> – Your adaptive plan informs your practice, which feeds into your progress analytics
            </p>
          </Card>
        </div>
      </Container>
    </Section>
  );
};

export default FeaturePillars;