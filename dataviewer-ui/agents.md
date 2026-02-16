# Development Guidelines for DataViewer UI

## Overview

This document outlines how to work on the DataViewer UI project. The codebase uses **PrimeReact** as the primary UI component library and **Tailwind CSS** for custom styling.

## Design Principles

### 1. Clean & Simple

- Avoid unnecessary complexity in components
- Use semantic HTML and clear naming conventions
- Keep component responsibilities focused and single-purpose
- Remove unused code and dependencies regularly

### 2. Component-First Approach

- Build reusable, composable components
- Keep state management simple and localized when possible
- Use TypeScript for type safety
- Document component props and usage

## PrimeReact Components

### When to Use PrimeReact

**Always prefer PrimeReact components** for common UI patterns:

- Forms (InputText, InputNumber, Dropdown, MultiSelect, etc.)
- Data Display (DataTable, Card, Panel, etc.)
- Navigation (Menu, Menubar, TabMenu, etc.)
- Dialogs & Overlays (Dialog, Toast, ConfirmDialog, etc.)
- Buttons (Button with various severities and sizes)
- Layout (Sidebar, Splitter, etc.)

### PrimeReact Best Practices

- Import components from `primereact/<component-name>`
- Use PrimeReact themes and styles (already configured)
- Leverage built-in accessibility features (a11y)
- Use `classNamePrefix` and `className` props for styling
- Refer to [PrimeReact documentation](https://primereact.org/) for component APIs

### Example Usage

```tsx
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Card } from "primereact/card";

export const MyComponent = () => (
  <Card title="My Card">
    <InputText placeholder="Enter text" />
    <Button label="Submit" icon="pi pi-check" />
  </Card>
);
```

## Styling with Tailwind CSS

### When to Use Tailwind

- Use Tailwind for spacing, layout, and responsive design
- Use Tailwind for custom styling **not** available via PrimeReact
- Combine Tailwind with PrimeReact className props for integrated styling

### Tailwind Best Practices

- Use utility classes for layout (`flex`, `grid`, `block`, etc.)
- Use responsive prefixes (`md:`, `lg:`, etc.) for breakpoints
- Use consistent spacing scale (use Tailwind defaults)
- Avoid custom CSS when utilities are available
- Keep classes readable by using `@apply` in CSS when needed

### Example Styling

```tsx
<div className="flex flex-col gap-4 md:flex-row md:gap-6">
  <div className="flex-1">
    <Card>Content</Card>
  </div>
  <div className="flex-1">
    <Card>Content</Card>
  </div>
</div>
```

## File Organization

```
src/
├── components/          # Reusable components
│   ├── common/         # Generic/shared components
│   └── features/       # Feature-specific components
├── services/           # API calls and external services
├── hooks/              # Custom React hooks
├── types/              # TypeScript interfaces and types
├── pages/              # Page-level components (if using routing)
├── utils/              # Utility functions
├── App.tsx             # Root component
└── main.tsx            # Entry point
```

## Code Standards

### TypeScript

- Always use TypeScript for type safety
- Define interfaces for component props
- Avoid `any` types—use `unknown` if necessary
- Use `const` for component definitions

### Naming Conventions

- Components: PascalCase (`MyComponent.tsx`)
- Files: Match component name
- Props interfaces: `<ComponentName>Props`
- Hooks: camelCase with `use` prefix (`useMyHook`)

### Component Structure

```tsx
import { FC } from "react";
import { Button } from "primereact/button";

interface MyComponentProps {
  title: string;
  onClick?: () => void;
}

export const MyComponent: FC<MyComponentProps> = ({ title, onClick }) => (
  <div className="p-4">
    <h2 className="text-lg font-bold">{title}</h2>
    <Button label="Click Me" onClick={onClick} />
  </div>
);
```

## Development Workflow

### When Adding Features

1. **Check PrimeReact first** - A component likely already exists
2. **Use Tailwind for layout** - Responsive, clean, maintainable
3. **Write TypeScript** - Full type safety for props and state
4. **Keep it simple** - Avoid over-engineering
5. **Test in browser** - Verify responsive design and functionality

### When Styling

1. **Prefer Tailwind utilities** - Fast, consistent, responsive
2. **Use PrimeReact theming** - Theme CSS variables if customizing colors
3. **Avoid custom CSS** - Create it in `index.css` only if necessary
4. **Test across breakpoints** - Ensure mobile, tablet, and desktop look good

### When Creating APIs

- Use the `services/api.ts` pattern
- Keep API calls isolated from components
- Use async/await
- Add proper error handling

## Common Patterns

### Loading State

```tsx
const [loading, setLoading] = useState(false);

const handleSubmit = async () => {
  setLoading(true);
  try {
    // API call
  } finally {
    setLoading(false);
  }
};

<Button loading={loading} label="Submit" onClick={handleSubmit} />;
```

### Form with Validation

```tsx
import { useForm } from "react-hook-form";
import { InputText } from "primereact/inputtext";

const { register, handleSubmit } = useForm();

<form onSubmit={handleSubmit(onSubmit)}>
  <InputText {...register("name", { required: true })} />
  <Button label="Submit" />
</form>;
```

### Data Table

```tsx
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";

<DataTable value={items}>
  <Column field="name" header="Name" />
  <Column field="status" header="Status" />
</DataTable>;
```

## Resources

- [PrimeReact Documentation](https://primereact.org/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Summary

Build with **PrimeReact components** first, style with **Tailwind CSS**, and keep everything **simple and maintainable**. Ask the PrimeReact docs before writing custom components.
