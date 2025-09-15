# 🎨 Gramor_X Design System Standards

## Overview
This document defines the standardized UI patterns for Gramor_X to ensure consistency across all components and pages.

## 🎨 Colors

### Primary Palette
- **Primary**: `bg-primary`, `text-primary` (#4361ee)
- **Primary Dark**: `bg-primaryDark`, `text-primaryDark` (#3a56d4)
- **Secondary**: `bg-secondary`, `text-secondary` (#f72585)
- **Accent**: `bg-accent`, `text-accent` (#4cc9f0)

### Status Colors
- **Success**: `bg-success`, `text-success` (#2ec4b6)
- **Warning**: `bg-warning`, `text-warning` (#ffd166)
- **Danger**: `bg-danger`, `text-danger` (#ff4d4d)

### Theme Colors
- **Purple Vibe**: `bg-purpleVibe`, `text-purpleVibe` (#9d4edd)
- **Electric Blue**: `bg-electricBlue`, `text-electricBlue` (#00bbf9)
- **Neon Green**: `bg-neonGreen`, `text-neonGreen` (#80ffdb)

### Neutral Colors
- **Light Background**: `bg-lightBg` (#f0f2f5)
- **Light Text**: `text-lightText` (#1a1a2e)
- **Grayish**: `text-grayish`, `bg-grayish` (#8a8a9c)
- **Light Card**: `bg-lightCard` (#ffffff)
- **Light Border**: `border-lightBorder` (#e0e0e0)

### ❌ Avoid These
- Hard-coded Tailwind colors: `bg-red-500`, `text-gray-600`, `bg-blue-400`
- Arbitrary hex values: `bg-[#ff0000]`, `text-[#333333]`
- Inconsistent naming patterns

## 📝 Typography

### Type Scale (Use semantic names)
```css
/* Headings */
text-displayLg    /* 56px - Hero titles */
text-display      /* 48px - Main headings */
text-h1          /* 36px - Page titles */
text-h2          /* 30px - Section headings */
text-h3          /* 24px - Subsection headings */
text-h4          /* 20px - Component headings */

/* Body Text */
text-body        /* 16px - Default body text */
text-small       /* 14px - Secondary text */
text-caption     /* 12px - Captions, labels */
text-tiny        /* 11px - Fine print */
text-micro       /* 10px - Minimal text */
```

### Font Weights
- **Normal**: `font-normal` (400)
- **Medium**: `font-medium` (500) - for emphasis
- **Semibold**: `font-semibold` (600) - for headings
- **Bold**: `font-bold` (700) - for strong emphasis

### ❌ Avoid These
- Raw Tailwind sizes: `text-xs`, `text-sm`, `text-lg`, `text-xl`
- Inconsistent font weights across similar components

## 📏 Spacing Scale

### Padding/Margin Values
```css
/* Use these standardized values */
p-1    /* 4px */
p-2    /* 8px */
p-3    /* 12px */
p-4    /* 16px */
p-6    /* 24px */
p-8    /* 32px */

/* Custom design system values */
p-3.5  /* 14px */
p-17.5 /* 70px */
p-18   /* 72px */
p-22   /* 88px */
p-30   /* 120px */
```

### Gap Values
```css
gap-1    /* 4px - tight spacing */
gap-2    /* 8px - close spacing */
gap-3    /* 12px - normal spacing */
gap-4    /* 16px - comfortable spacing */
gap-6    /* 24px - loose spacing */
gap-8    /* 32px - very loose spacing */
```

### ❌ Avoid These
- Random values: `px-5`, `py-7`, `gap-5`, `mx-9`
- Inconsistent spacing patterns across similar components

## 🔘 Component Standards

### Buttons
```tsx
// ✅ Use the Button component with standardized variants
<Button variant="primary" size="md">Primary Action</Button>
<Button variant="secondary" size="md">Secondary Action</Button>
<Button variant="outline" size="sm">Outline Button</Button>
<Button variant="danger" size="lg">Delete Action</Button>

// ❌ Don't create custom button styles
<button className="bg-red-500 text-white px-4 py-2">Custom Button</button>
```

### Badges
```tsx
// ✅ Use the Badge component with standardized variants
<Badge variant="primary">New</Badge>
<Badge variant="success">Completed</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="danger">Error</Badge>

// ❌ Don't create custom badge styles
<span className="bg-green-500 text-white px-2 py-1 rounded">Custom Badge</span>
```

### Cards
```tsx
// ✅ Use standardized card classes
<div className="card-surface p-6">Content</div>
<div className="card-glass p-4">Glass effect content</div>

// ❌ Don't create custom card styles
<div className="bg-white rounded-lg shadow-lg p-4">Custom Card</div>
```

## 🌓 Dark Mode Support

All components should support dark mode using the design system tokens:

```css
/* ✅ Correct - uses design system tokens */
.card-surface { @apply bg-lightCard text-lightText; }
.dark .card-surface { @apply bg-purpleVibe/10 text-white; }

/* ❌ Incorrect - hard-coded colors */
.custom-card { @apply bg-white text-gray-900; }
.dark .custom-card { @apply bg-gray-800 text-white; }
```

## 🎯 Border Radius

### Standardized Values
```css
rounded-ds      /* 16px - Standard components */
rounded-ds-xl   /* 20px - Larger components */
rounded-ds-2xl  /* 24px - Cards and modals */
```

### ❌ Avoid These
- Raw Tailwind values: `rounded-md`, `rounded-lg`, `rounded-xl`
- Arbitrary values: `rounded-[12px]`

## ✅ Quick Checklist

When creating/updating components:

- [ ] Use design system color tokens (no hard-coded colors)
- [ ] Use semantic typography scale (no raw Tailwind sizes)
- [ ] Use standardized spacing values
- [ ] Support dark mode with design tokens
- [ ] Use consistent border radius values
- [ ] Test component in both light and dark themes
- [ ] Verify responsive behavior

## 🛠 Migration Strategy

1. **Identify components** with hard-coded values
2. **Replace colors** with design system tokens
3. **Update typography** to use semantic scale
4. **Standardize spacing** patterns
5. **Test dark mode** compatibility
6. **Update component documentation**

## 📚 Resources

- Design system tokens: `/design-system/tokens/`
- Component examples: `/components/design-system/`
- Tailwind config: `/tailwind.config.js`
- Global styles: `/styles/globals.css`