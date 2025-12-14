# HP Tourism Digital Ecosystem - Compact Design Guidelines

## Design Philosophy
**Reference Models**: Airbnb (discovery + trust) + Linear (clean workflows) + GOV.UK (accessibility + plain language)  
**Goal**: Transform compliance into empowerment through clarity and visual delight, creating a premium government portal that's approachable, not bureaucratic.

---

## Visual System

### Colors
**Primary Palette**
- Forest Green `#1E5631`: Primary actions, navigation
- Sky Blue `#3B82F6`: Links, secondary actions
- Sunrise Orange `#F97316`: CTAs, urgent items

**Semantic** | Success `#10B981` | Warning `#F59E0B` | Error `#EF4444` | Info `#3B82F6`

**Neutrals** | BG `#F9FAFB` | Surface `#FFFFFF` | Text `#111827` / `#6B7280` | Border `#E5E7EB`

**Himachali Accents**: Subtle pahari motifs in backgrounds/certificates—tasteful, never overwhelming.

### Typography
**Fonts**: Inter (EN) | Noto Sans Devanagari (HI)

**Scale** | H1: 48px bold | H2: 36px semibold | H3: 24px semibold | H4: 20px medium | Body Large: 18px | Body: 16px | Small: 14px | Tiny: 12px medium

**Line Heights**: 1.6 (body) | 1.2 (headings)

### Spacing & Layout
**Base**: 4px | **Common**: 8/12/16/24/32/48/64px  
**Containers**: Content `max-w-7xl` (1280px) | Reading `max-w-3xl` (768px)

**Breakpoints**: Mobile <768px | Tablet 768-1024px | Desktop >1024px

---

## Page Layouts

### Public Portal
**Hero**: 100vh (desktop)/80vh (mobile), landscape BG with `bg-black/40` overlay, centered content, floating glass-morphism search bar  
**Services Grid**: 3-col (desktop)/1-col (mobile), icon-driven cards with hover lift, icons 64px  
**Statistics**: 4-col (desktop)/2-col (mobile), animated count-up on scroll, mountain silhouette divider  
**Footer**: Comprehensive links, contacts, government logos

### Property Owner Dashboard
**Header**: Logo left | Search center | Notifications + avatar right  
**Sidebar**: Vertical nav with icons, active = BG fill + left border, collapsible on mobile  
**Main Area**: 
- Status cards (4-up): Draft/Pending/Approved/Rejected counts, color-coded borders
- Recent applications table + quick actions widget

### Admin Portal
**Dense Layout**: Application queue table with inline filters, sortable columns  
**Split View**: Application details | Documents preview | Timeline/Actions (3-col desktop)  
**SLA Indicators**: Green (on track) | Amber (nearing deadline) | Red (breached)

---

## Component Specs

### Buttons
**Sizes**: Large 44px | Medium 40px | Small 32px  
**Variants**: Primary (green BG, white text) | Secondary (white BG, green border/text) | Ghost (transparent, green text)  
**States**: Default shadow-sm → Hover lift + shadow-lg → Active scale(0.98)

### Cards
**Standard**: White BG, shadow-sm, rounded-xl, 24px padding  
**Hover**: shadow-lg, scale(1.02)  
**Status**: 4px colored left border matching status

### Forms
**Layout**: 1-col mobile, 2-col desktop for related fields  
**Inputs**: 48px height, rounded-lg, border gray-300 → focus 2px green, placeholder gray-400  
**Labels**: 14px medium, 8px margin-bottom  
**Errors**: Red border + icon + message  
**Multi-Step Wizard**: Top progress bar with circled step numbers (completed=green ✓, current=green, upcoming=gray), Previous/Next buttons, Save Draft (secondary)

### Badges
**Shape**: Pill (fully rounded), 8px H / 4px V padding  
**Variants**: Draft (gray) | Pending (orange/white) | Approved (green/white) | Rejected (red/white) | Payment Required (blue/white)

### Tables
**Header**: Gray-50 BG, 14px semibold, sticky  
**Rows**: Alternating stripes (white/gray-50), hover gray-100, 12px V / 16px H padding  
**Actions**: Right-aligned icon buttons with tooltips  
**Pagination**: Bottom center, "X-Y of Z entries"

### Modals
**Overlay**: `bg-black/50` with blur  
**Content**: White, centered, max-w-600px, rounded-xl, 32px padding  
**Structure**: 24px semibold title + close X | content | right-aligned footer buttons

### File Upload
**Dropzone**: Dashed gray-200 border, rounded-lg, 120px min-height  
**Active**: Green border, background tint  
**Preview**: Thumbnail grid (3-up mobile/6-up desktop), filename + remove icon  
**Progress**: Linear bar with %

---

## Interaction Patterns

### Navigation
**Public**: Horizontal nav with dropdowns  
**Authenticated**: Sidebar + breadcrumbs  
**Mobile**: Hamburger → full-height overlay slide-in

### Notifications
**Toast**: Top-right, slide-in, auto-dismiss 5s, colored left border (green/red/blue) + icon

### Loading States
**Skeleton**: For tables/cards  
**Spinner**: Overlay for buttons  
**Progress Bar**: Multi-step processes

### Empty States
Himachali illustration + helpful message + CTA button

### Mobile Optimizations
- Bottom nav bar for key actions
- Swipe gestures on table rows
- Collapsible accordions
- Fixed header with scroll shadow

---

## Visual Assets

### Images
**Hero**: High-quality Himachal landscape (mountains + homestay)  
**Dashboard**: Subtle mountain silhouette pattern (5% opacity)  
**Verification**: Property photo with verified badge overlay

### Icons
**Library**: Heroicons (outline nav, solid actions)  
**Sizes**: 20px buttons | 24px cards | 32px features | 64px service cards  
**Custom**: Himachali motifs for certificates (vector, monochrome)

### Illustrations
**Empty States**: Minimalist line art with HP color accents  
**Success**: Confetti + checkmark animation  
**Error**: Friendly art + recovery instructions

---

## Accessibility (WCAG AA+)

- **Contrast**: 4.5:1 minimum, 7:1 for critical actions
- **Touch Targets**: Min 44x44px
- **Focus**: 2px green ring, 2px offset
- **Keyboard**: Logical tab order, skip-to-content
- **Screen Readers**: ARIA labels, alt text, role attributes
- **Bilingual Toggle**: Flag icons (🇬🇧/🇮🇳) in header, instant switch

---

## Animation & Motion

**Timing**: Fast 150ms (micro) | Medium 300ms (transitions) | Slow 500ms (page changes)  
**Easing**: Ease-out (enter) | Ease-in (exit) | Ease-in-out (move)

**Key Animations**:
- Card hover: translateY(-4px) + shadow
- Button press: scale(0.98)
- Status badge: Pulse for urgent items
- Count-up: Statistics on scroll
- Skeleton: Shimmer effect
- Toast: Slide-in from right
- Modal: Fade overlay + scale(0.95→1)

**Reduced Motion**: Respect `prefers-reduced-motion`, disable all animations

---

## Unique Differentiators

**Himachali Design Language**:
- Mountain peak SVG dividers between sections
- Pahari patterns in certificate borders
- Texture overlays (woven fabric, wood grain) on heroes

**Trust Indicators**:
- Government emblem prominent
- "Verified by HP Tourism" badges with QR codes
- SSL certificate icon in footer

**Progressive Disclosure**:
- Accordions for checklists
- Tooltips for technical terms
- Expandable "Learn More" sections
- Wizards for complex forms

**Delight Moments**:
- Confetti on approval
- Smooth map zooms
- Drag-drop uploads with instant preview
- Real-time WebSocket status updates with toasts

---

**Implementation Priority**: Build in this order: Colors/Typography → Buttons/Forms → Cards/Tables → Layouts → Animations. Test bilingual + accessibility at each stage.