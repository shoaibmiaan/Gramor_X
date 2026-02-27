// components/sections/ProblemSolution.tsx
import React from 'react';
import { Container } from '@/components/design-system/Container';
import { Section } from '@/components/design-system/Section';
import { Card } from '@/components/design-system/Card';
import { Icon } from '@/components/design-system/Icon';
import { Badge } from '@/components/design-system/Badge';

const problems = [
  {
    problem: "Wasting time on irrelevant practice",
    symptom: "You study for hours but don't see band improvement",
    solution: "AI-powered adaptive learning that focuses on your weak areas",
    icon: "Target",
    color: "text-red-400"
  },
  {
    problem: "No instant feedback on writing & speaking",
    symptom: "Waiting days or weeks for teacher feedback",
    solution: "Instant AI scoring with detailed band descriptors analysis",
    icon: "Zap",
    color: "text-yellow-500"
  },
  {
    problem: "Unrealistic exam simulation",
    symptom: "Practice materials don't match real test difficulty",
    solution: "Real exam interface with timer, auto-save, and exam conditions",
    icon: "ClipboardCheck",
    color: "text-green-500"
  }
];

export const ProblemSolution: React.FC = () => {
  return (
    <Section id="problem-solution">
      <Container>
        <div className="text-center mb-16">
          <Badge variant="info" size="sm" className="mb-4 inline-flex items-center gap-2">
            <Icon name="Lightbulb" className="text-electricBlue" />
            The IELTS Struggle is Real
          </Badge>
          <h2 className="font-slab text-3xl md:text-4xl font-bold text-foreground mb-4">
            Tired of traditional IELTS prep that doesn't work?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Most test-takers waste months on ineffective practice. Here's how we solve the real problems.
          </p>
        </div>

        <div className="grid gap-8 lg:gap-12">
          {problems.map((item, index) => (
            <div
              key={index}
              className="grid lg:grid-cols-3 gap-6 items-center"
              data-aos="fade-up"
              data-aos-delay={index * 100}
            >
              {/* Problem Side */}
              <Card className="p-6 border border-red-200/50 bg-red-50/30 dark:bg-red-900/10 dark:border-red-800/30">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-2xl bg-red-100 dark:bg-red-900/20 ${item.color}`}>
                    <Icon name="AlertCircle" size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">{item.problem}</h3>
                    <p className="text-sm text-muted-foreground">{item.symptom}</p>
                  </div>
                </div>
              </Card>

              {/* Arrow (mobile hidden) */}
              <div className="hidden lg:flex justify-center">
                <div className="w-12 h-12 rounded-full bg-electricBlue/10 flex items-center justify-center">
                  <Icon name="ArrowRight" className="text-electricBlue" size={24} />
                </div>
              </div>

              {/* Solution Side */}
              <Card className="p-6 border border-green-200/50 bg-green-50/30 dark:bg-green-900/10 dark:border-green-800/30">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-2xl bg-green-100 dark:bg-green-900/20 text-green-500">
                    <Icon name={item.icon} size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Our Solution</h3>
                    <p className="text-sm text-muted-foreground">{item.solution}</p>
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12" data-aos="fade-up">
          <Card className="inline-block border border-electricBlue/30 bg-electricBlue/5 px-8 py-6">
            <p className="text-lg font-semibold text-foreground">
              Ready to try a smarter way to prepare?
            </p>
            <p className="text-muted-foreground mt-2">
              Join thousands who've achieved their target band with our AI-powered platform
            </p>
          </Card>
        </div>
      </Container>
    </Section>
  );
};

export default ProblemSolution;