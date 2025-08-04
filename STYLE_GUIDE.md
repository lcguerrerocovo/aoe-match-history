# AoE2 Match History - Style Guide

## 🎨 Design Philosophy

The AoE2 Match History site embraces a **DaVinci-inspired medieval aesthetic** that combines historical authenticity with modern usability. The design draws inspiration from Renaissance manuscripts, aged parchment, and DaVinci's artistic style while maintaining excellent readability and accessibility.

## 🎭 Theme Elements

### **Parchment & Paper**
- **Primary Background**: Aged parchment texture with subtle cross-hatching
- **Color Palette**: Warm, earthy tones ranging from `#f0e6d2` to `#d0bcaa`
- **Texture**: Multi-layered gradients simulating paper fiber and natural aging
- **Aging Effects**: Subtle radial gradients for age spots and ink stains

### **DaVinci-Inspired Details**
- **Cross-hatched Patterns**: Repeating linear gradients at 45° and -45° angles
- **Light Source Effects**: Radial gradients creating realistic lighting
- **Organic Shapes**: Rounded corners and flowing borders
- **Layered Depth**: Multiple shadow layers with inset highlights

### **Medieval Accents**
- **Gold Accents**: `#D4AF37` for highlights and important elements
- **Bronze Tones**: `#B37A3E` for borders and secondary elements
- **Heraldic Colors**: Deep blues and rich earth tones
- **Seal-like Elements**: Circular badges and rounded containers

## 🎨 Color Palette

### **Primary Colors**
```css
/* Parchment Base */
--parchment-light: #f0e6d2;    /* Light aged parchment */
--parchment-medium: #e8dcc8;   /* Medium parchment tone */
--parchment-dark: #d0bcaa;     /* Dark aged parchment */

/* Medieval Metals */
--gold: #D4AF37;               /* Lustrous medieval gold */
--bronze: #B37A3E;             /* Authentic bronze */
--bronze-light: #C8A26B;       /* Lighter bronze accent */

/* Text & Contrast */
--charcoal: #2C3E50;           /* Da Vinci charcoal */
--black: #1C1C1C;              /* Rich charcoal for text */
--steel: #5A6478;              /* Cool steel grey */
```

### **Semantic Colors**
```css
/* Status Colors */
--win: #3AA76D;                /* Victory green */
--loss: #D64545;               /* Defeat red */
--same: #2B6CB0;               /* Neutral blue */

/* Theme Variations */
--dark-win: #2E7D32;           /* Dark theme wins */
--dark-loss: #D32F2F;          /* Dark theme losses */
```

## 🧩 Component Styling

### **Match/Record Bubbles**
The signature component that embodies the DaVinci theme:

```css
/* Parchment Texture */
background-image: 
  linear-gradient(135deg, #f0e6d2 0%, #e8dcc8 25%, #e0d2be 50%, #d8c8b4 75%, #d0bcaa 100%),
  repeating-linear-gradient(45deg, rgba(139, 90, 43, 0.04) 0px, rgba(139, 90, 43, 0.04) 1px, transparent 1px, transparent 3px),
  repeating-linear-gradient(-45deg, rgba(139, 90, 43, 0.02) 0px, rgba(139, 90, 43, 0.02) 1px, transparent 1px, transparent 6px),
  radial-gradient(ellipse at 30% 30%, rgba(255, 255, 255, 0.15) 0%, transparent 60%),
  radial-gradient(ellipse at 70% 70%, rgba(139, 90, 43, 0.05) 0%, transparent 40%);

/* Enhanced Shadows */
box-shadow: 
  0 3px 8px rgba(139, 90, 43, 0.15), 
  0 1px 3px rgba(0,0,0,0.1), 
  inset 0 1px 0 rgba(255,255,255,0.2);

/* Interactive Effects */
transition: all 0.3s ease;
transform: translateY(-2px) on hover;
```

### **Session Headers**
Rich stone-like texture with subtle contrast:

```css
background: 
  linear-gradient(135deg, #E8E5DA 0%, #E2DFD4 25%, #DCD9CE 50%, #D6D3C8 75%, #D0CDC2 100%),
  repeating-linear-gradient(135deg, rgba(139, 90, 43, 0.06) 0px, rgba(139, 90, 43, 0.06) 2px, transparent 2px, transparent 8px),
  radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.15) 0%, transparent 60%);
```

## 🎯 Design Principles

### **1. Historical Authenticity**
- Use aged parchment textures and medieval color palettes
- Incorporate DaVinci-inspired cross-hatching and light effects
- Maintain the feel of Renaissance manuscripts

### **2. Modern Usability**
- Ensure excellent contrast ratios for accessibility
- Maintain responsive design across all devices
- Keep interactions smooth and intuitive

### **3. Subtle Sophistication**
- Use low-opacity patterns that add texture without distraction
- Layer effects for depth without overwhelming the content
- Balance historical aesthetics with clean, readable typography

### **4. Interactive Life**
- Smooth transitions (0.3s) for elegant interactions
- Hover effects that enhance the tactile feel
- Layered shadows that respond to user interaction

## 🛠️ Implementation Guidelines

### **CSS Custom Properties**
Use the theme's color tokens for consistency:
```css
/* ✅ Good */
background-color: var(--parchment-light);
border-color: var(--bronze);

/* ❌ Avoid */
background-color: #f0e6d2;
border-color: #B37A3E;
```

### **Texture Patterns**
When adding new textured elements:
1. Start with the base parchment gradient
2. Add cross-hatched patterns at different angles
3. Include subtle radial gradients for light effects
4. Layer shadows for depth

### **Responsive Considerations**
- Maintain texture quality across different screen sizes
- Ensure patterns don't become too dense on mobile
- Scale shadows and effects appropriately

## 🎨 Component Examples

### **Card Variants**
- `match`: Standard match cards with parchment texture
- `recordBubble`: Enhanced match/record bubbles with rich texture
- `matchesCountBubble`: Count indicators with parchment styling
- `winner`: Gold-accented winning team cards
- `loser`: Subtle losing team styling

### **Interactive States**
- **Hover**: Enhanced shadows and subtle lift effects
- **Active**: Deeper shadows and color intensification
- **Focus**: Accessible focus indicators that maintain theme

## 🔄 Theme Consistency

### **Light Theme**
- Warm parchment backgrounds
- Rich earth tones for text and borders
- Subtle shadows for depth
- Gold accents for highlights

### **Dark Theme**
- Cool slate blues and steels
- High contrast for readability
- Deeper shadows for dramatic effect
- Bright accents for visibility

## 📱 Responsive Design

The theme scales gracefully across devices:
- **Mobile**: Simplified textures, larger touch targets
- **Tablet**: Balanced texture density, optimized spacing
- **Desktop**: Full texture richness, enhanced hover effects

## 🎭 Future Enhancements

Potential additions to the DaVinci theme:
- **Seal Elements**: Circular badges with wax-like textures
- **Scroll Effects**: Parallax parchment scrolling
- **Ink Stains**: Subtle decorative elements
- **Calligraphy**: Stylized typography for headers
- **Sketch Elements**: DaVinci-style line drawings as accents

---

*This style guide ensures consistency across the AoE2 Match History interface while maintaining the rich, DaVinci-inspired aesthetic that makes the site unique.* 