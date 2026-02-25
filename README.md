# Kernel TypeScript Sample App - Stagehand Multi-Browser

A Stagehand-powered browser automation app with three distinct actions, each demonstrating different input type patterns. Every input field is genuinely consumed by the action logic.

## Actions

### 1. `company-lookup`

Searches for companies on a configurable site and extracts a summary for each.

**Input types tested:** `string`, `string[]`, `number`, `boolean`, string literal union (enum), nested object

```json
{
  "companies": ["Stripe", "Airbnb", "Dropbox"],
  "maxCompanies": 2,
  "stealth": true,
  "searchSite": "ycombinator",
  "viewport": { "width": 1280, "height": 720, "isMobile": false },
  "searchQuery": "company description and what they do"
}
```

**Output:**

```json
{
  "results": [
    { "company": "Stripe", "summary": "Online payments infrastructure..." },
    { "company": "Airbnb", "summary": "Marketplace for short-term rentals..." }
  ],
  "totalProcessed": 2
}
```

### 2. `price-checker`

Searches Google Shopping for a product and extracts pricing info with configurable filters.

**Input types tested:** `string`, nested object with enum, enum, `number | null`, `Record<string, boolean>`, `Array<object>`, `Record<string, string>`

```json
{
  "product": "mechanical keyboard",
  "priceRange": { "min": 50, "max": 200, "currency": "USD" },
  "sortBy": "price_asc",
  "maxPriceOverride": null,
  "filters": { "Free shipping": true, "4+ stars": true },
  "customAttributes": [
    { "name": "switch type", "value": "Cherry MX Brown", "weight": 0.9 },
    { "name": "layout", "value": "TKL", "weight": 0.5 }
  ],
  "headers": { "Accept-Language": "en-US" }
}
```

**Output:**

```json
{
  "product": "mechanical keyboard",
  "priceResults": "Keychron K8 - $89, Ducky One 3 - $109...",
  "filtersApplied": ["Free shipping", "4+ stars"],
  "sortUsed": "price_asc"
}
```

### 3. `news-digest`

Searches Google News for headlines across multiple topics, with date filtering and source weighting.

**Input types tested:** `string[]`, `[string, string]` tuple, `number`, `boolean`, optional `string`, `number[]`, `Record<string, number>`

```json
{
  "topics": ["AI startups", "climate tech", "space exploration"],
  "dateRange": ["2025-01-01", "2025-12-31"],
  "maxArticles": 5,
  "includePaywalled": false,
  "notifyEmail": "user@example.com",
  "priorityScores": [0.9, 0.7, 0.3],
  "sourceWeights": { "techcrunch.com": 0.8, "arstechnica.com": 0.6, "reddit.com": 0.2 }
}
```

**Output:**

```json
{
  "articles": [
    { "topic": "AI startups", "headlines": "1. OpenAI raises... 2. Anthropic launches..." },
    { "topic": "climate tech", "headlines": "1. Solar breakthrough... 2. EV battery..." },
    { "topic": "space exploration", "headlines": "1. SpaceX Starship... 2. NASA Artemis..." }
  ],
  "totalTopics": 3,
  "notificationSentTo": "user@example.com"
}
```

## Setup

Create a `.env` file:

```
OPENAI_API_KEY=your-openai-api-key
```

## Deploy

```bash
kernel login
kernel deploy index.ts --env-file .env
```

## Invoke

```bash
# Company lookup (defaults to searching "kernel" on YC)
kernel invoke stagehand-multiple-browsers company-lookup

# Company lookup with custom payload
kernel invoke stagehand-multiple-browsers company-lookup --payload '{"companies": ["Stripe", "Airbnb"], "maxCompanies": 2, "searchSite": "ycombinator", "stealth": true, "viewport": {"width": 1280, "height": 720, "isMobile": false}, "searchQuery": "what the company does"}'

# Price checker
kernel invoke stagehand-multiple-browsers price-checker --payload '{"product": "mechanical keyboard", "priceRange": {"min": 50, "max": 200, "currency": "USD"}, "sortBy": "price_asc", "maxPriceOverride": null, "filters": {"Free shipping": true}, "customAttributes": [], "headers": {}}'

# News digest
kernel invoke stagehand-multiple-browsers news-digest --payload '{"topics": ["AI startups"], "dateRange": ["2025-01-01", "2025-12-31"], "maxArticles": 5, "includePaywalled": false, "priorityScores": [1.0], "sourceWeights": {"techcrunch.com": 0.8}}'
```
