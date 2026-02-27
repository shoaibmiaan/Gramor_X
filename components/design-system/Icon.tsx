import * as React from 'react';
import * as Lucide from 'lucide-react';

// Aliases for common non-Lucide names & FA-style keys (lowercased)
const alias: Record<string, React.ElementType> = {
  // your existing alias set
  times: Lucide.X, close: Lucide.X, x: Lucide.X,
  eye: Lucide.Eye, 'eye-slash': Lucide.EyeOff, 'eye-off': Lucide.EyeOff, // ← added 'eye-off'
  fire: Lucide.Flame,
  shield: Lucide.Shield, 'shield-alt': Lucide.Shield,
  bell: Lucide.Bell,
  check: Lucide.Check, 'check-circle': Lucide.CheckCircle, 'circle-check': Lucide.CheckCircle,
  'exclamation-triangle': Lucide.AlertTriangle,
  'info-circle': Lucide.Info,
  'arrow-right': Lucide.ArrowRight, 'chevron-right': Lucide.ChevronRight,
  book: Lucide.Book,
  lock: Lucide.Lock,
  gift: Lucide.Gift,
  star: Lucide.Star, 'star-half-alt': Lucide.StarHalf,
  gauge: Lucide.Gauge, 'tachometer-alt': Lucide.Gauge,
  'id-badge': Lucide.IdCard,
  mail: Lucide.Mail, envelope: Lucide.Mail,
  phone: Lucide.Phone, 'phone-alt': Lucide.Phone,
  'map-pin': Lucide.MapPin, 'location-pin': Lucide.MapPin,
  user: Lucide.User, 'sign-out-alt': Lucide.LogOut,
  'step-backward': Lucide.StepBack, pause: Lucide.Pause, play: Lucide.Play, 'step-forward': Lucide.StepForward,

  // extra handy aliases
  micvocal: Lucide.Mic, mic: Lucide.Mic, mic2: Lucide.Mic2,
  pencil: Lucide.Pencil, 'pencil-line': Lucide.PencilLine,
  headphones: Lucide.Headphones,
  'book-open': Lucide.BookOpen,
  'pen-square': Lucide.PenSquare,
  sun: Lucide.Sun, moon: Lucide.Moon,
};

export type IconName = keyof typeof Lucide | (keyof typeof alias) | (string & {});

type Props = React.SVGProps<SVGSVGElement> & {
  name: IconName;
  size?: number;
  title?: string; // if provided, will be aria-label
};

export const Icon: React.FC<Props> = ({ name, size = 20, title, className, ...rest }) => {
  // Prefer direct Lucide export by exact key
  const Direct = (Lucide as unknown as Record<string, React.ComponentType<any>>)[String(name)];
  const Lower = String(name || '').toLowerCase();
  const Aliased = alias[Lower];

  const Cmp: any = Direct || Aliased;
  if (!Cmp) return null;

  const ariaProps = title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true };

  return (
    <Cmp
      width={size}
      height={size}
      className={className}
      {...ariaProps}
      {...rest}
    />
  );
};

export default Icon;
