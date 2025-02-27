# Project Guidelines for Claude

## Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Run production build
- `npm run lint` - Run ESLint

## Code Style

### Architecture
- Next.js App Router with TypeScript and Tailwind CSS
- Components in `src/components/` with UI components in `src/components/ui/`
- Utility functions in `src/lib/`

### TypeScript
- Use strict mode with proper typing
- Use `import type` for type-only imports
- Prefer interfaces for component props (e.g., `ButtonProps`)
- Extend HTML attributes for component props

### Components
- Use functional components with React.forwardRef
- Add "use client" directive for client components
- Use PascalCase for component names and files
- Group related components in single files with named exports
- Use class-variance-authority (cva) for component variants

### Imports & Formatting
- React imports first, external libraries next, internal last
- Use path alias (@/*) for imports from src directory
- Use destructured named imports where possible

### Styling
- Use Tailwind with cn() utility for class merging
- Follow consistent className prop handling
- Use semantic color tokens from theme

### Error Handling
- Use try/catch blocks for API calls and async operations
- Provide helpful error messages to users