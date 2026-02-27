// components/sections/Testimonials.tsx
import React from 'react';
import { Container } from '@/components/design-system/Container';
import { Section } from '@/components/design-system/Section';
import { Card } from '@/components/design-system/Card';
import { Icon } from '@/components/design-system/Icon';
import { Button } from '@/components/design-system/Button'; // ADD THIS IMPORT
import { Badge } from '@/components/design-system/Badge';

const featuredTestimonials = [
  {
    id: 't1',
    name: 'Sarah Chen',
    initial: 'S',
    band: '7.5',
    improvement: '+1.5',
    quote: 'The AI writing feedback helped me identify my cohesion issues instantly. I went from 6.0 to 7.5 in writing in just 6 weeks.',
    previousBand: '6.0',
    time: '6 weeks',
    modules: ['Writing Studio', 'AI Feedback'],
    gradient: 'from-blue-500 to-cyan-500'
  },
  {
    id: 't2',
    name: 'Marcus Rodriguez',
    initial: 'M',
    band: '8.0',
    improvement: '+1.0',
    quote: 'The speaking simulator with instant transcription was a game-changer. I could practice anytime and get immediate feedback on my fluency.',
    previousBand: '7.0',
    time: '8 weeks',
    modules: ['Speaking Partner', 'Mock Tests'],
    gradient: 'from-purple-500 to-pink-500'
  },
  {
    id: 't3',
    name: 'Priya Sharma',
    initial: 'P',
    band: '7.5',
    improvement: '+2.0',
    quote: 'As a retaker, the adaptive learning path focused exactly on my weak areas. No more wasting time on things I already knew.',
    previousBand: '5.5',
    time: '10 weeks',
    modules: ['Adaptive Path', 'Progress Analytics'],
    gradient: 'from-green-500 to-emerald-500'
  }
];

const stats = [
  {
    value: '1.5',
    label: 'Average Band Improvement',
    description: 'Across all learners completing 6+ weeks'
  },
  {
    value: '94%',
    label: 'Achieve Target Band',
    description: 'Of users who follow the adaptive path'
  },
  {
    value: '4h',
    label: 'Average Feedback Time',
    description: 'AI instant + teacher review when needed'
  }
];

export const Testimonials: React.FC = () => {
  return (
    <Section id="testimonials">
      <Container>
        <div className="text-center mb-16">
          <Badge variant="accent" size="sm" className="mb-4 inline-flex items-center gap-2">
            <Icon name="Star" className="text-electricBlue" />
            Real Stories, Real Results
          </Badge>
          <h2 className="font-slab text-3xl md:text-4xl font-bold text-foreground mb-4">
            Join Thousands Who've Achieved Their Target Band
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Don't just take our word for it. See how our AI-powered platform has helped real test-takers succeed.
          </p>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {stats.map((stat, index) => (
            <Card
              key={stat.label}
              className="text-center p-6 border-border/60 bg-white/70 dark:bg-dark/70 backdrop-blur"
              data-aos="fade-up"
              data-aos-delay={index * 100}
            >
              <div className="font-slab text-3xl font-bold text-gradient-primary mb-2">
                {stat.value}
              </div>
              <div className="font-semibold text-foreground mb-2">
                {stat.label}
              </div>
              <div className="text-sm text-muted-foreground">
                {stat.description}
              </div>
            </Card>
          ))}
        </div>

        {/* Featured Testimonials */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {featuredTestimonials.map((testimonial, index) => (
            <Card
              key={testimonial.id}
              className="p-6 border-border/60 bg-white/70 dark:bg-dark/70 backdrop-blur hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              data-aos="fade-up"
              data-aos-delay={index * 150}
            >
              {/* Header with Avatar and Band Score */}
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${testimonial.gradient} flex items-center justify-center text-white font-semibold`}>
                  {testimonial.initial}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{testimonial.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{testimonial.previousBand} → {testimonial.band}</span>
                    <Badge variant="success" size="xs" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                      {testimonial.improvement}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Quote */}
              <blockquote className="text-muted-foreground mb-4 leading-relaxed">
                "{testimonial.quote}"
              </blockquote>

              {/* Metadata */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Icon name="Clock" size={14} />
                  {testimonial.time}
                </div>
                <div className="flex items-center gap-1">
                  <Icon name="CheckCircle" size={14} className="text-green-500" />
                  Target Achieved
                </div>
              </div>

              {/* Used Modules */}
              <div className="mt-4 pt-4 border-t border-border/30">
                <div className="flex flex-wrap gap-1">
                  {testimonial.modules.map(module => (
                    <span
                      key={module}
                      className="inline-block px-2 py-1 bg-electricBlue/10 text-electricBlue text-xs rounded-full"
                    >
                      {module}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div
          className="text-center"
          data-aos="fade-up"
        >
          <Card className="inline-block border border-electricBlue/30 bg-electricBlue/5 px-8 py-6 max-w-2xl">
            <h3 className="text-xl font-semibold text-foreground mb-3">
              Ready to Write Your Success Story?
            </h3>
            <p className="text-muted-foreground mb-4">
              Join thousands of learners who have achieved their target IELTS band with our proven system.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                href="#waitlist"
                variant="primary"
                className="justify-center"
              >
                <Icon name="Star" className="mr-2" />
                Join Waitlist Today
              </Button>
              <Button
                href="#pricing"
                variant="outline"
                className="justify-center"
              >
                <Icon name="CreditCard" className="mr-2" />
                View Pricing
              </Button>
            </div>
          </Card>
        </div>
      </Container>
    </Section>
  );
};

export default Testimonials;