# conduct-design - Create UI design with real styles

You are an AI agent using Conduct v0.1 to create UI designs before implementation.

## Your Task

Create a visual design using actual CSS/styles extracted from the codebase, saved as reviewable files before any code changes.

## Steps

### 1. Load the Spec

```bash
cat _conduct/specs/{id}.v0.spec.md
```

Understand what UI needs to be designed.

### 2. Extract Existing Styles

**Find the design system:**
```bash
# Look for existing styles
find src -name "*.css" -o -name "*.scss" -o -name "tailwind.config.*"

# Check for design tokens
grep -r "colors\|spacing\|typography" src/

# Find component library
ls src/components/
```

**Extract:**
- Colors: `#hex`, `rgb()`, CSS variables
- Typography: Font families, sizes, weights
- Spacing: Padding, margins, gaps
- Components: Buttons, inputs, cards

### 3. Create Design Files

**Directory structure:**
```
_conduct/designs/{spec-id}/
├── design.md           # Design specification
├── mockup.html         # Interactive preview
├── styles.css          # Extracted styles
└── assets/             # Images, icons (if needed)
```

**design.md format:**
```markdown
# Design: {Spec Title}

## Meta
- **Spec ID:** {id}
- **Designer:** {agent-name}
- **Created:** {timestamp}
- **Status:** draft|approved|implemented

## Overview

{What's being designed}

## Screens

### Screen 1: {Name}

**Purpose:** {Description}

**Layout:**
```
┌─────────────────────────────┐
│  Header                     │
├─────────────────────────────┤
│                             │
│  Main Content               │
│                             │
├─────────────────────────────┤
│  Footer                     │
└─────────────────────────────┘
```

**Components:**
- Header: Logo + navigation
- Main: Form with 3 fields
- Footer: Copyright + links

**Styles:**
- Background: `#ffffff`
- Primary color: `#007bff`
- Font: `Inter, sans-serif`
- Spacing: `16px` grid

### Screen 2: {Name}

{Same structure}

## Component Specifications

### Button
- Sizes: small (32px), medium (40px), large (48px)
- Variants: primary, secondary, outline, ghost
- States: default, hover, active, disabled
- Styles:
  ```css
  .button-primary {
    background: #007bff;
    color: white;
    padding: 8px 16px;
    border-radius: 4px;
  }
  ```

### Input Field
{Similar breakdown}

## Interactions

- Click button → Show loading spinner
- Form submit → Validate then POST
- Error → Show toast notification

## Responsive Breakpoints

- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px
```

### 4. Create Interactive Mockup

```html
<!-- _conduct/designs/{spec-id}/mockup.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Design: {Title}</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="screen">
    <header>
      <h1>Logo</h1>
      <nav>
        <a href="#">Home</a>
        <a href="#">About</a>
      </nav>
    </header>
    
    <main>
      <form>
        <input type="text" placeholder="Username">
        <input type="password" placeholder="Password">
        <button class="button-primary">Login</button>
      </form>
    </main>
  </div>
</body>
</html>
```

### 5. Extract Styles

```css
/* _conduct/designs/{spec-id}/styles.css */
/* Design System - Extracted from src/ */

:root {
  --color-primary: #007bff;
  --color-secondary: #6c757d;
  --color-success: #28a745;
  --color-danger: #dc3545;
  
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  
  --font-family: Inter, -apple-system, sans-serif;
  --font-size-sm: 14px;
  --font-size-base: 16px;
  --font-size-lg: 18px;
}

/* Components */
.button-primary {
  background: var(--color-primary);
  color: white;
  padding: var(--spacing-sm) var(--spacing-md);
  border-radius: 4px;
  border: none;
  font-family: var(--font-family);
}
```

### 6. Preview Locally

The spec mentions a design preview server (Phase 4.6 - not yet implemented).

**For now:**
```bash
# Open in browser
open _conduct/designs/{spec-id}/mockup.html

# Or use Python simple server
cd _conduct/designs/{spec-id}
python3 -m http.server 5174
# Visit: http://localhost:5174/mockup.html
```

### 7. Get Approval

Share the design:
- Screenshots
- Link to mockup.html
- design.md for review

### 8. Save to Memory

```sql
-- Link design to spec
INSERT INTO spec (id, location, status)
VALUES ('{spec-id}', '_conduct/designs/{spec-id}/', 'pending')
ON CONFLICT (id) DO UPDATE SET
  status = 'pending';

-- Or use a separate design tracking (future)
-- For v0.1, just create the files
```

### 9. Use in Implementation

When running `conduct-run`:
1. Check for `_conduct/designs/{spec-id}/`
2. If exists, load design.md and styles.css
3. Implement exactly as designed
4. Reference design in run log

## Output

```
✅ Design Created

📁 Location: _conduct/designs/42/
  • design.md - Specification
  • mockup.html - Interactive preview
  • styles.css - Extracted styles

🎨 Preview:
  Open: _conduct/designs/42/mockup.html
  Or: python3 -m http.server 5174

📝 Next Steps:
  1. Review design with stakeholders
  2. Get approval
  3. Run: conduct-run 42 (will use design)

💾 Design ready for implementation
```

## Notes

- Extract real styles from codebase, don't invent
- Create interactive mockups when possible
- Keep designs isolated from src/
- Reference designs in run logs
- Phase 4.6 will add hot-reload preview server
- For v0.1, simple HTML mockups work fine
