// components/sections/Waitlist.tsx
import React, { useState } from 'react';
import { Container } from '@/components/design-system/Container';
import { Section } from '@/components/design-system/Section';
import { Card } from '@/components/design-system/Card';
import { Button } from '@/components/design-system/Button';
import { Input } from '@/components/design-system/Input';
import { Icon } from '@/components/design-system/Icon';
import { Badge } from '@/components/design-system/Badge';

const perks = [
  {
    icon: 'Rocket',
    title: 'Early Access',
    description: 'Be among the first to experience the platform'
  },
  {
    icon: 'Gift',
    title: 'Founding Member Perks',
    description: 'Special pricing locked for 12 months'
  },
  {
    icon: 'Users',
    title: 'Priority Onboarding',
    description: 'Dedicated support and setup assistance'
  },
  {
    icon: 'MessageCircle',
    title: 'Direct Influence',
    description: 'Shape the product with your feedback'
  }
];

export const Waitlist: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    targetBand: '',
    testDate: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    setIsSubmitting(false);
    setIsSubmitted(true);

    // Reset form
    setFormData({
      name: '',
      email: '',
      targetBand: '',
      testDate: ''
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  if (isSubmitted) {
    return (
      <Section id="waitlist">
        <Container>
          <div className="text-center max-w-2xl mx-auto">
            <Card className="p-12 border border-green-200 bg-green-50/30 dark:bg-green-900/10">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Icon name="CheckCircle" className="text-green-600" size={32} />
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-4">
                You're on the List! 🎉
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Thank you for joining our waitlist. We'll send you early access invites
                and founding member perks as we get closer to launch.
              </p>
              <div className="bg-white dark:bg-dark/50 p-6 rounded-lg border border-border/60">
                <h3 className="font-semibold text-foreground mb-3">What's Next?</h3>
                <ul className="text-sm text-muted-foreground space-y-2 text-left">
                  <li className="flex items-center gap-2">
                    <Icon name="Mail" className="text-electricBlue" size={16} />
                    Check your email for confirmation
                  </li>
                  <li className="flex items-center gap-2">
                    <Icon name="Calendar" className="text-purpleVibe" size={16} />
                    Look for launch updates in the coming weeks
                  </li>
                  <li className="flex items-center gap-2">
                    <Icon name="Gift" className="text-neonGreen" size={16} />
                    Founding member perks will be announced soon
                  </li>
                </ul>
              </div>
            </Card>
          </div>
        </Container>
      </Section>
    );
  }

  return (
    <Section id="waitlist">
      <Container>
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div>
            <Badge variant="accent" size="sm" className="mb-4 inline-flex items-center gap-2">
              <Icon name="Star" className="text-electricBlue" />
              Limited Founding Member Spots
            </Badge>
            <h2 className="font-slab text-3xl md:text-4xl font-bold text-foreground mb-4">
              Ready to Transform Your IELTS Preparation?
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              Join the waitlist today and be among the first to experience our AI-powered platform.
              Founding members get special perks and early access.
            </p>

            {/* Perks Grid */}
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {perks.map((perk, index) => (
                <div
                  key={perk.title}
                  className="flex items-start gap-3"
                  data-aos="fade-up"
                  data-aos-delay={index * 100}
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-electricBlue to-purpleVibe flex items-center justify-center text-white flex-shrink-0">
                    <Icon name={perk.icon} size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">
                      {perk.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {perk.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Icon name="ShieldCheck" className="text-green-500" />
                No spam, ever
              </div>
              <div className="flex items-center gap-2">
                <Icon name="Clock" className="text-blue-500" />
                One-click unsubscribe
              </div>
              <div className="flex items-center gap-2">
                <Icon name="Lock" className="text-purple-500" />
                Your data is protected
              </div>
            </div>
          </div>

          {/* Right Content - Form */}
          <Card className="p-8 border border-electricBlue/30 bg-white/80 dark:bg-dark/70 shadow-xl backdrop-blur">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-foreground mb-2">
                Join the Waitlist
              </h3>
              <p className="text-muted-foreground">
                Get early access and founding member perks
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-foreground mb-2">
                  Full Name
                </label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-foreground mb-2">
                  Email Address
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="targetBand" className="block text-sm font-semibold text-foreground mb-2">
                    Target Band
                  </label>
                  <select
                    id="targetBand"
                    name="targetBand"
                    value={formData.targetBand}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-border/60 rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-electricBlue/50 focus:border-electricBlue"
                    required
                  >
                    <option value="">Select target</option>
                    <option value="6.0">6.0</option>
                    <option value="6.5">6.5</option>
                    <option value="7.0">7.0</option>
                    <option value="7.5">7.5</option>
                    <option value="8.0">8.0+</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="testDate" className="block text-sm font-semibold text-foreground mb-2">
                    Test Date
                  </label>
                  <Input
                    id="testDate"
                    name="testDate"
                    type="month"
                    placeholder="When are you testing?"
                    value={formData.testDate}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={isSubmitting}
                className="w-full justify-center py-3 text-lg font-semibold shadow-lg shadow-electricBlue/20 hover:shadow-electricBlue/30 transition-all duration-300"
              >
                {isSubmitting ? (
                  <>
                    <Icon name="Loader2" className="animate-spin mr-2" />
                    Securing Your Spot...
                  </>
                ) : (
                  <>
                    <Icon name="Star" className="mr-2" />
                    Join Waitlist - Get Early Access
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                By joining, you agree to our Privacy Policy and Terms of Service.
                We'll only send you launch updates and early access invites.
              </p>
            </form>
          </Card>
        </div>
      </Container>
    </Section>
  );
};

export default Waitlist;