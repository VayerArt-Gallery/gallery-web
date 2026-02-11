# VayerArt Gallery

An e-commerce website for VayerArt Gallery in Los Angeles, California. Built with React, featuring sophisticated artwork filtering, artist portfolios, exhibitions, and integrated shopping functionality.

**View Live Deployment: [VayerArt Gallery](https://vayerartgallery.com)**

## Overview

VayerArt Gallery is a full-featured digital storefront for contemporary art, providing:
- **Artwork Browsing** with advanced filtering by styles, themes, categories, and artists
- **Artist Directory** with detailed portfolios and biographies
- **Exhibitions & Fairs** showcasing gallery events with date-based filtering
- **Blog** featuring editorial articles and art world commentary
- **Shopping Cart** with Shopify checkout integration
- **Content Management** via Sanity CMS for all editorial content

## Key Features

- **Advanced Filtering**: Multi-dimensional filtering with infinite scroll
- **Dual CMS Integration**: Combines Sanity (editorial, artists, exhibitions) with Shopify (products, pricing, inventory)
- **SSR-Ready**: Server-side rendering with TanStack Start for optimal performance
- **Shopping Bag**: Persistent cart using Zustand with localStorage synchronization
- **Search**: Search across artworks, artists, and site content
- **Responsive Design**: Mobile-first with Tailwind CSS and adaptive layouts
- **SEO Optimized**: Dynamic meta tags and structured data for all pages

## Tech Stack

### Core Framework
- **Framework**: [TanStack React Start](https://tanstack.com/start) - Full-stack React meta-framework
- **Router**: [TanStack Router](https://tanstack.com/router) - Type-safe file-based routing with SSR
- **Language**: [TypeScript](https://www.typescriptlang.org/)

### Data Management
- **CMS**: [Sanity](https://www.sanity.io/) - Headless CMS with GROQ queries
- **E-commerce**: [Shopify Storefront API](https://shopify.dev/docs/api/storefront) - GraphQL product data
- **State**: [TanStack Query](https://tanstack.com/query) - Server state management and caching
- **Cart State**: [Zustand](https://zustand-demo.pmnd.rs/) - Lightweight client state

### Code Generation
- **GraphQL Codegen**: Auto-generates TypeScript types and React Query hooks from Shopify schema

### Styling & UI
- **CSS Framework**: [Tailwind CSS](https://tailwindcss.com/)
- **Components**: [Radix UI](https://www.radix-ui.com/) with shadcn/ui patterns
- **Icons**: [Lucide React](https://lucide.dev/)

### Deployment
- **Platform**: [Cloudflare Workers](https://workers.cloudflare.com/)
- **Build Tool**: [Vite](https://vite.dev/)

## Architecture Highlights

### Hybrid CMS Strategy
Dual CMS approach separating content and commerce:
```typescript
// Editorial content from Sanity GROQ
const articles = await sanityClient.fetch(magazineQuery)

// Product data from Shopify GraphQL
const products = await shopifyClient.query(productsQuery)
```

### Dynamic Collection Resolution
Maps filter selections to Shopify collections with deduplication:
```typescript
// Convert filter state to collection handles
const collections = resolveCollections({
  styles: ['abstract', 'contemporary'],
  themes: ['nature'],
  artists: ['artist-handle']
})

// Fetch and merge products from multiple collections
const products = await fetchArtworks(collections)
```

### SSR with Data Prefetching
TanStack Router loaders pre-fetch data before rendering:
```typescript
export const Route = createFileRoute('/artworks/')({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(artworksQueryOptions())
  }
})
```

## Technical Decisions

### Why TanStack Router over Next.js?
- Type-safe routing with automatic type inference
- SSR support with flexible deployment options
- Ergonomic data loading patterns with loaders and queries
- Smaller bundle size and faster hydration
- No framework lock-in
- No hosting provider lock-in

### Why Dual CMS (Sanity + Shopify)?
- Sanity excels at editorial content such as artist and article management
- Shopify provides e-commerce with inventory and checkout
- Separation of concerns between content and commerce
- Leverages strengths of both platforms to solve client needs

### Why Zustand for Cart?
- Minimal API compared to Redux
- Refined reactivity compared to React Context
- Built-in persistence middleware for localStorage
