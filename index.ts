import { Stagehand } from "@browserbasehq/stagehand";
import { Kernel, type KernelContext } from '@onkernel/sdk';
import { z } from 'zod';

const kernel = new Kernel();

const app = kernel.app('stagehand-multiple-browsers');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set');
}

// ═══════════════════════════════════════════════════════════════
// ACTION 1: company-lookup
// Types tested: string, string[], number, boolean, enum, nested object
// ═══════════════════════════════════════════════════════════════

interface CompanyLookupInput {
  companies: string[];
  maxCompanies: number;
  stealth: boolean;
  searchSite: 'ycombinator' | 'crunchbase' | 'wikipedia';
  viewport: { width: number; height: number; isMobile: boolean };
  searchQuery: string;
}

interface CompanyLookupOutput {
  results: Array<{ company: string; summary: string }>;
  totalProcessed: number;
}

const SITE_URLS: Record<CompanyLookupInput['searchSite'], string> = {
  ycombinator: 'https://www.ycombinator.com/companies',
  crunchbase: 'https://www.crunchbase.com/discover/organization.companies',
  wikipedia: 'https://en.wikipedia.org/wiki/Main_Page',
};

app.action<CompanyLookupInput, CompanyLookupOutput>(
  'company-lookup',
  async (ctx: KernelContext, payload?: CompanyLookupInput): Promise<CompanyLookupOutput> => {
    const companies = (payload?.companies ?? ['kernel']).slice(0, payload?.maxCompanies ?? 3);
    const stealth = payload?.stealth ?? true;
    const searchSite = payload?.searchSite ?? 'ycombinator';
    const viewport = payload?.viewport ?? { width: 1280, height: 720, isMobile: false };
    const searchQuery = payload?.searchQuery ?? 'company description and what they do';
    const siteUrl = SITE_URLS[searchSite];

    const results: Array<{ company: string; summary: string }> = [];

    for (const company of companies) {
      const browser = await kernel.browsers.create({
        invocation_id: ctx.invocation_id,
        stealth,
      });
      console.log(`[company-lookup] Browser for "${company}": ${browser.browser_live_view_url}`);

      const stagehand = new Stagehand({
        env: "LOCAL",
        localBrowserLaunchOptions: { cdpUrl: browser.cdp_ws_url },
        model: "openai/gpt-4.1",
        apiKey: OPENAI_API_KEY,
        verbose: 1,
        domSettleTimeout: 30_000,
      });
      await stagehand.init();

      const page = stagehand.context.pages()[0];
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(siteUrl);
      await stagehand.act(`Type in ${company} into the search box`);
      await stagehand.act("Click on the first search result");

      const extractionSchema = z.object({ summary: z.string() });
      const extracted = await stagehand.extract(
        `Extract the following about this company: ${searchQuery}`,
        extractionSchema,
      );

      results.push({ company, summary: extracted.summary });

      await stagehand.close();
      await kernel.browsers.deleteByID(browser.session_id);
      console.log(`[company-lookup] Browser for "${company}" killed`);

      if (company !== companies[companies.length - 1]) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return { results, totalProcessed: results.length };
  },
);

// ═══════════════════════════════════════════════════════════════
// ACTION 2: price-checker
// Types tested: string, nested object with enum, enum, number | null,
//               Record<string, boolean>, Array<object>, Record<string, string>
// ═══════════════════════════════════════════════════════════════

interface PriceCheckerInput {
  product: string;
  priceRange: { min: number; max: number; currency: 'USD' | 'EUR' | 'GBP' };
  sortBy: 'price_asc' | 'price_desc' | 'rating' | 'relevance';
  maxPriceOverride: number | null;
  filters: Record<string, boolean>;
  customAttributes: Array<{ name: string; value: string; weight: number }>;
  headers: Record<string, string>;
}

interface PriceCheckerOutput {
  product: string;
  priceResults: string;
  filtersApplied: string[];
  sortUsed: string;
}

app.action<PriceCheckerInput, PriceCheckerOutput>(
  'price-checker',
  async (ctx: KernelContext, payload?: PriceCheckerInput): Promise<PriceCheckerOutput> => {
    const product = payload?.product ?? 'mechanical keyboard';
    const priceRange = payload?.priceRange ?? { min: 0, max: 200, currency: 'USD' as const };
    const sortBy = payload?.sortBy ?? 'relevance';
    const maxPriceOverride = payload?.maxPriceOverride ?? null;
    const filters = payload?.filters ?? {};
    const customAttributes = payload?.customAttributes ?? [];
    const headers = payload?.headers ?? {};

    const effectiveMaxPrice = maxPriceOverride !== null ? maxPriceOverride : priceRange.max;

    const browser = await kernel.browsers.create({
      invocation_id: ctx.invocation_id,
      stealth: true,
    });
    console.log(`[price-checker] Browser: ${browser.browser_live_view_url}`);

    const stagehand = new Stagehand({
      env: "LOCAL",
      localBrowserLaunchOptions: { cdpUrl: browser.cdp_ws_url },
      model: "openai/gpt-4.1",
      apiKey: OPENAI_API_KEY,
      verbose: 1,
      domSettleTimeout: 30_000,
    });
    await stagehand.init();

    const page = stagehand.context.pages()[0];

    if (Object.keys(headers).length > 0) {
      await page.setExtraHTTPHeaders(headers);
    }

    await page.goto('https://www.google.com/shopping');
    await stagehand.act(`Search for ${product}`);

    const activeFilters: string[] = [];
    for (const [filterName, enabled] of Object.entries(filters)) {
      if (enabled) {
        activeFilters.push(filterName);
        await stagehand.act(`Click on the "${filterName}" filter if available`);
      }
    }

    if (sortBy !== 'relevance') {
      const sortLabel = { price_asc: 'Price: Low to High', price_desc: 'Price: High to Low', rating: 'Rating' }[sortBy];
      await stagehand.act(`Sort results by "${sortLabel}"`);
    }

    const attributeContext = customAttributes
      .sort((a, b) => b.weight - a.weight)
      .map(attr => `${attr.name}: ${attr.value}`)
      .join(', ');

    const extractionSchema = z.object({ priceResults: z.string() });
    const extracted = await stagehand.extract(
      `Extract product names and prices for "${product}" in the range ${priceRange.min}-${effectiveMaxPrice} ${priceRange.currency}.${attributeContext ? ` Focus on products matching: ${attributeContext}.` : ''}`,
      extractionSchema,
    );

    await stagehand.close();
    await kernel.browsers.deleteByID(browser.session_id);
    console.log('[price-checker] Browser killed');

    return {
      product,
      priceResults: extracted.priceResults,
      filtersApplied: activeFilters,
      sortUsed: sortBy,
    };
  },
);

// ═══════════════════════════════════════════════════════════════
// ACTION 3: news-digest
// Types tested: string[], [string, string] tuple, number, boolean,
//               optional string, number[], Record<string, number>
// ═══════════════════════════════════════════════════════════════

interface NewsDigestInput {
  topics: string[];
  dateRange: [string, string];
  maxArticles: number;
  includePaywalled: boolean;
  notifyEmail?: string;
  priorityScores: number[];
  sourceWeights: Record<string, number>;
}

interface NewsDigestOutput {
  articles: Array<{ topic: string; headlines: string }>;
  totalTopics: number;
  notificationSentTo: string | null;
}

app.action<NewsDigestInput, NewsDigestOutput>(
  'news-digest',
  async (ctx: KernelContext, payload?: NewsDigestInput): Promise<NewsDigestOutput> => {
    const topics = payload?.topics ?? ['AI startups'];
    const dateRange = payload?.dateRange ?? ['2025-01-01', '2025-12-31'];
    const maxArticles = payload?.maxArticles ?? 5;
    const includePaywalled = payload?.includePaywalled ?? false;
    const notifyEmail = payload?.notifyEmail;
    const priorityScores = payload?.priorityScores ?? [];
    const sourceWeights = payload?.sourceWeights ?? {};

    const sortedTopics = topics
      .map((topic, i) => ({ topic, score: priorityScores[i] ?? 0 }))
      .sort((a, b) => b.score - a.score)
      .map(entry => entry.topic);

    const preferredSources = Object.entries(sourceWeights)
      .filter(([, weight]) => weight > 0.5)
      .map(([source]) => source);

    const articles: Array<{ topic: string; headlines: string }> = [];

    for (const topic of sortedTopics) {
      const browser = await kernel.browsers.create({
        invocation_id: ctx.invocation_id,
        stealth: true,
      });
      console.log(`[news-digest] Browser for "${topic}": ${browser.browser_live_view_url}`);

      const stagehand = new Stagehand({
        env: "LOCAL",
        localBrowserLaunchOptions: { cdpUrl: browser.cdp_ws_url },
        model: "openai/gpt-4.1",
        apiKey: OPENAI_API_KEY,
        verbose: 1,
        domSettleTimeout: 30_000,
      });
      await stagehand.init();

      const page = stagehand.context.pages()[0];

      let query = `${topic} after:${dateRange[0]} before:${dateRange[1]}`;
      if (!includePaywalled) {
        query += ' -site:wsj.com -site:ft.com -site:bloomberg.com';
      }
      if (preferredSources.length > 0) {
        query += ` ${preferredSources.map(s => `site:${s}`).join(' OR ')}`;
      }

      await page.goto('https://news.google.com');
      await stagehand.act(`Search for: ${query}`);

      const extractionSchema = z.object({ headlines: z.string() });
      const extracted = await stagehand.extract(
        `Extract up to ${maxArticles} article headlines and their sources from the search results.`,
        extractionSchema,
      );

      articles.push({ topic, headlines: extracted.headlines });

      await stagehand.close();
      await kernel.browsers.deleteByID(browser.session_id);
      console.log(`[news-digest] Browser for "${topic}" killed`);

      if (topic !== sortedTopics[sortedTopics.length - 1]) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    if (notifyEmail) {
      console.log(`[news-digest] Results will be sent to ${notifyEmail}`);
    }

    return {
      articles,
      totalTopics: sortedTopics.length,
      notificationSentTo: notifyEmail ?? null,
    };
  },
);
