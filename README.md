# Kernel TypeScript Sample App - Stagehand

A Stagehand-powered browser automation app that extracts company information from Y Combinator company pages using multiple browsers.

## What it does

The `company-info-task` searches for a startup on Y Combinator's company directory and extracts company information using three separate browser instances:
- **Browser 1**: Extracts team size (number of employees)
- **Browser 2**: Extracts company location
- **Browser 3**: Extracts CEO/founder name

## Input

```json
{
  "company": "kernel"  // Startup name to search (optional, defaults to "kernel")
}
```

## Output

```json
{
  "teamSize": "11",        // Team size as shown on YC company page
  "location": "San Francisco, CA",  // Company location
  "ceo": "John Doe"        // CEO or founder name
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

Default query (searches for "kernel"):
```bash
kernel invoke stagehand-multiple-browsers company-info-task
```

Custom query:
```bash
kernel invoke stagehand-multiple-browsers company-info-task --payload '{"company": "Mixpanel"}'
```
