import * as React from 'react';
import { Card } from '@/components/design-system/Card';

export type PaymentMethod = 'jazzcash' | 'easypaisa' | 'safepay' | 'card';

interface Props {
  selected: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
  className?: string;
}

const OPTIONS: Array<{
  value: PaymentMethod;
  label: string;
  sub: string;
  icon: string;
  badge?: 'Local' | 'International';
}> = [
  { value: 'card',      label: 'Card',      sub: 'Visa, MasterCard',           icon: 'fa-credit-card', badge: 'International' },
  { value: 'easypaisa', label: 'Easypaisa', sub: 'Pakistan local payments',    icon: 'fa-mobile',       badge: 'Local' },
  { value: 'jazzcash',  label: 'JazzCash',  sub: 'Pakistan local payments',    icon: 'fa-wallet',       badge: 'Local' },
  { value: 'safepay',   label: 'Safepay',   sub: 'Pakistan local payments',    icon: 'fa-shield-alt',   badge: 'Local' },
];

export const PaymentOptions: React.FC<Props> = ({ selected, onChange, className }) => {
  return (
    <fieldset className={className}>
      <legend className="sr-only">Choose a payment method</legend>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {OPTIONS.map((opt) => {
          const id = `pay-${opt.value}`;
          const active = selected === opt.value;
          return (
            <label key={opt.value} htmlFor={id} className="group cursor-pointer">
              <input
                id={id}
                type="radio"
                name="payment"
                value={opt.value}
                checked={active}
                onChange={() => onChange(opt.value)}
                className="peer sr-only"
              />
              <Card
                className={[
                  'rounded-xl border bg-card p-4 transition',
                  'hover:border-primary/40',
                  active ? 'ring-2 ring-primary border-primary shadow-sm' : '',
                ].join(' ')}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full grid place-items-center text-white text-small bg-gradient-to-br from-purpleVibe to-electricBlue">
                    <i className={`fas ${opt.icon}`} aria-hidden="true" />
                  </div>

                  <div className="min-w-0">
                    <div className="text-small font-medium text-foreground flex items-center gap-2">
                      {opt.label}
                      {opt.badge && (
                        <span className={`hidden sm:inline-block rounded-full px-2 py-0.5 text-[10px] border ${
                          opt.badge === 'International'
                            ? 'border-primary/30 text-primary'
                            : 'border-border/60 text-muted-foreground'
                        }`}>
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    <div className="text-caption text-muted-foreground truncate">{opt.sub}</div>
                  </div>
                </div>
              </Card>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
};

export default PaymentOptions;
