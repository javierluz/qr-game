# Copilot Instructions for QR Game (AstroJS Project)

## Project Overview
This is an AstroJS project called "qr-game" that uses modern web technologies to build fast, content-focused websites. The project uses TypeScript and follows AstroJS best practices.

## Technology Stack
- **Framework**: AstroJS v5.15.3
- **Language**: TypeScript
- **Package Manager**: pnpm
- **Node**: ES Modules (type: "module")

## Code Style & Conventions

### File Structure
- Use `.astro` files for pages and components in the Astro format
- Place pages in `src/pages/` directory
- Use `src/components/` for reusable Astro components
- Static assets go in `public/` directory
- Follow Astro's file-based routing conventions

### AstroJS Specific Guidelines

#### Component Structure
- Use Astro's component syntax with frontmatter (---) for JavaScript/TypeScript logic
- Prefer Astro components over framework components when possible
- Use TypeScript for type safety in frontmatter sections
- Follow this structure:
```astro
---
// TypeScript frontmatter
interface Props {
  title: string;
  description?: string;
}

const { title, description } = Astro.props;
---

<html>
  <head>
    <title>{title}</title>
    {description && <meta name="description" content={description} />}
  </head>
  <body>
    <!-- HTML content -->
  </body>
</html>
```

#### Styling
- Use scoped styles in Astro components with `<style>` tags
- Prefer CSS custom properties for theming
- Use modern CSS features (flexbox, grid, custom properties)
- Keep styles component-scoped unless global styles are needed

#### Performance Best Practices
- Leverage Astro's partial hydration - only hydrate what needs to be interactive
- Use `client:load`, `client:idle`, `client:visible` directives appropriately
- Minimize JavaScript bundle size by preferring static HTML generation
- Optimize images using Astro's built-in image optimization

### TypeScript Guidelines
- Use strict TypeScript configuration
- Define Props interfaces for all components that accept props
- Use Astro.props for accessing component properties
- Leverage TypeScript for better developer experience and type safety

### Import Conventions
- Use relative imports for local modules
- Use absolute imports from `src/` when configured
- Import types using `import type` syntax
- Group imports: external packages, then internal modules

### Development Workflow
- Use `pnpm dev` for development server
- Use `pnpm build` for production builds
- Use `pnpm preview` to preview production builds locally
- Follow semantic versioning for releases

## File Naming Conventions
- Use kebab-case for file names: `my-component.astro`
- Use PascalCase for component names in code
- Use lowercase for page files that become routes
- Use descriptive names that indicate component purpose

## Error Handling
- Handle errors gracefully in frontmatter scripts
- Provide fallback content for dynamic data
- Use TypeScript for compile-time error catching
- Test builds regularly to catch static generation errors

## SEO & Accessibility
- Include proper meta tags in page heads
- Use semantic HTML elements
- Ensure proper heading hierarchy (h1 → h6)
- Add alt text for images
- Consider page load performance and Core Web Vitals

## Testing Considerations
- Test static site generation builds
- Verify client-side hydration works correctly
- Test responsive design across devices
- Validate HTML output and accessibility

## Dependencies Management
- Use pnpm for package management
- Keep dependencies minimal and focused
- Prefer Astro-compatible packages
- Update dependencies regularly while testing compatibility

## Build & Deployment
- Ensure static builds work correctly (`pnpm build`)
- Test preview builds before deployment
- Consider edge-side rendering options if needed
- Optimize for CDN deployment patterns

## Additional Notes
- This project is focused on QR code functionality/gaming
- Prioritize fast loading times and minimal JavaScript
- Consider mobile-first responsive design
- Keep the bundle size small for optimal performance