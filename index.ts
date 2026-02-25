import { Stagehand } from "@browserbasehq/stagehand";
import { Kernel, type KernelContext } from '@onkernel/sdk';
import { z } from 'zod';

const kernel = new Kernel();

const app = kernel.app('stagehand-multiple-browsers');

interface GeoCoordinates {
  latitude: number;
  longitude: number;
  altitude?: number | null;
}

interface ProxyAuth {
  username: string;
  password: string;
  protocol: 'http' | 'https' | 'socks4' | 'socks5';
}

interface ProxyConfig {
  host: string;
  port: number;
  auth?: ProxyAuth;
  bypassList: string[];
  rotateEveryNRequests: number | null;
}

interface ViewportDimensions {
  width: number;
  height: number;
  deviceScaleFactor: number;
  isMobile: boolean;
  hasTouch: boolean;
  isLandscape: boolean;
}

interface RetryPolicy {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableStatusCodes: number[];
  retryOnTimeout: boolean;
}

interface WebhookConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH';
  headers: Record<string, string>;
  retryPolicy: RetryPolicy;
  payloadTransform?: string;
  signingSecret?: string | null;
  enabled: boolean;
}

interface ScheduleConfig {
  cronExpression: string;
  timezone: string;
  enabled: boolean;
  startDate: string;
  endDate?: string | null;
  maxExecutions: number | null;
  skipWeekends: boolean;
  blackoutDates: string[];
}

interface FundingRange {
  min: number;
  max: number;
  currency: 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD';
  includeUndisclosed: boolean;
}

interface TeamSizeRange {
  min: number;
  max: number;
  includeFoundersOnly: boolean;
}

interface LocationFilter {
  country: string;
  state?: string;
  city?: string;
  coordinates?: GeoCoordinates;
  radiusKm?: number;
  remoteOnly: boolean;
  hybridAcceptable: boolean;
  excludedRegions: string[];
}

interface SearchFilter {
  teamSize: TeamSizeRange;
  funding: FundingRange;
  location: LocationFilter;
  industries: string[];
  excludedIndustries: string[];
  batchYears: number[];
  status: 'active' | 'inactive' | 'acquired' | 'public' | 'any';
  foundedAfter?: string;
  foundedBefore?: string;
  hasOpenJobs: boolean | null;
  isOpenSource: boolean | null;
  tags: Record<string, boolean>;
}

interface CompetitorEntry {
  name: string;
  url?: string;
  domain?: string;
  priority: 1 | 2 | 3 | 4 | 5;
  relationship: 'direct' | 'indirect' | 'potential' | 'adjacent';
  notes: string[];
  metrics?: Record<string, number>;
}

interface SearchStrategy {
  name: string;
  enabled: boolean;
  weight: number;
  fallback?: {
    strategy: string;
    maxAttempts: number;
    delayBetweenAttemptsMs: number;
  };
  keywords: string[];
  exclusionPatterns: string[];
  caseSensitive: boolean;
  fuzzyMatchThreshold: number;
}

interface ExtractionFieldConfig {
  field: 'teamSize' | 'location' | 'ceo' | 'funding' | 'founded' | 'description' | 'website' | 'socialLinks' | 'techStack' | 'jobs';
  required: boolean;
  fallbackValue?: string | number | boolean | null;
  validationRegex?: string;
  transform?: 'uppercase' | 'lowercase' | 'trim' | 'capitalize' | 'none';
}

interface OutputFormatConfig {
  format: 'json' | 'csv' | 'markdown' | 'yaml' | 'xml' | 'html';
  prettyPrint: boolean;
  includeMetadata: boolean;
  includeTimestamps: boolean;
  nullHandling: 'omit' | 'empty_string' | 'literal_null' | 'dash';
  arrayDelimiter: string;
  nestedObjectHandling: 'flatten' | 'preserve' | 'dot_notation';
}

interface RateLimitConfig {
  requestsPerSecond: number;
  requestsPerMinute: number;
  burstSize: number;
  cooldownMs: number;
  respectRobotsTxt: boolean;
  customDelayPatterns: Array<{
    urlPattern: string;
    delayMs: number;
  }>;
}

interface NotificationChannel {
  type: 'email' | 'slack' | 'discord' | 'teams' | 'webhook' | 'sms';
  destination: string;
  onSuccess: boolean;
  onFailure: boolean;
  onPartialFailure: boolean;
  templateId?: string;
  throttleMinutes: number;
}

interface CacheConfig {
  enabled: boolean;
  ttlSeconds: number;
  strategy: 'lru' | 'fifo' | 'lfu' | 'ttl';
  maxEntries: number;
  invalidateOnDeploy: boolean;
  compressionEnabled: boolean;
  partitionKey?: string;
}

interface CompanyInput {
  // ── Basic Primitives ──
  company: string;
  maxResults: number;
  confidenceThreshold: number;
  includeAlumni: boolean;
  dryRun: boolean;
  verbosityLevel: 0 | 1 | 2 | 3;

  // ── Enums / Union Literals ──
  sortBy: 'relevance' | 'date' | 'teamSize' | 'funding' | 'alphabetical';
  searchMode: 'exact' | 'fuzzy' | 'semantic' | 'regex';
  priority: 'low' | 'medium' | 'high' | 'critical';

  // ── Arrays of Primitives ──
  alternateNames: string[];
  targetBatchNumbers: number[];
  excludedCompanyIds: string[];
  weightVector: number[];

  // ── Nested Objects (multiple levels deep) ──
  filters: SearchFilter;
  browserConfig: {
    viewport: ViewportDimensions;
    userAgent: string;
    locale: string;
    timezoneId: string;
    geolocation?: GeoCoordinates;
    permissions: string[];
    extraHTTPHeaders: Record<string, string>;
    timeout: number;
    stealth: boolean;
    proxy?: ProxyConfig;
    retryPolicy: RetryPolicy;
    cookies: Array<{
      name: string;
      value: string;
      domain: string;
      path: string;
      secure: boolean;
      httpOnly: boolean;
      sameSite: 'Strict' | 'Lax' | 'None';
      expiresUnixTimestamp?: number;
    }>;
  };

  // ── Array of Complex Objects ──
  competitors: CompetitorEntry[];
  searchStrategies: SearchStrategy[];
  extractionFields: ExtractionFieldConfig[];
  notificationChannels: NotificationChannel[];

  // ── Record / Map Types ──
  customMetadata: Record<string, string>;
  featureFlags: Record<string, boolean>;
  numericParameters: Record<string, number>;
  environmentOverrides: Record<string, string | number | boolean>;

  // ── Tuple-like Arrays ──
  dateRange: [string, string];
  coordinateBounds: [[number, number], [number, number]];
  rgbBrandColor: [number, number, number];

  // ── Nullable Fields ──
  referenceCompanyId: string | null;
  parentOrganization: string | null;
  previousSearchId: string | null;

  // ── Optional Complex Fields ──
  webhookConfig?: WebhookConfig;
  scheduleConfig?: ScheduleConfig;
  cacheConfig?: CacheConfig;
  rateLimit?: RateLimitConfig;

  // ── Output Configuration ──
  outputFormat: OutputFormatConfig;

  // ── Nested Arrays of Arrays ──
  comparisonMatrix: string[][];
  searchTermVariations: string[][];
  historicalDataPoints: Array<Array<{ timestamp: string; value: number; label: string }>>;

  // ── Deeply Nested with Mixed Types ──
  pipelineConfig: {
    stages: Array<{
      name: string;
      enabled: boolean;
      order: number;
      timeout: number;
      config: Record<string, string | number | boolean>;
      inputMapping: Record<string, string>;
      outputMapping: Record<string, string>;
      onError: 'skip' | 'abort' | 'retry' | 'fallback';
      conditions: Array<{
        field: string;
        operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'regex' | 'exists';
        value: string | number | boolean | null;
        negate: boolean;
      }>;
    }>;
    globalTimeout: number;
    parallelExecution: boolean;
    maxConcurrency: number;
    errorBudgetPercent: number;
  };

  // ── Auth / Credentials Config ──
  authConfig: {
    type: 'none' | 'apiKey' | 'oauth2' | 'bearer' | 'basic';
    credentials?: {
      key?: string;
      secret?: string;
      token?: string;
      refreshToken?: string;
      expiresAt?: string;
      scopes: string[];
    };
    autoRefresh: boolean;
    tokenEndpoint?: string | null;
  };

  // ── Complex Validation Rules ──
  validationRules: Array<{
    fieldPath: string;
    type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'range' | 'custom';
    params: Record<string, string | number | boolean>;
    errorMessage: string;
    severity: 'error' | 'warning' | 'info';
  }>;

  // ── Tagging / Classification ──
  classification: {
    primaryCategory: string;
    secondaryCategories: string[];
    confidenceScores: Record<string, number>;
    manualOverrides: Record<string, boolean>;
    labelHierarchy: Array<{ parent: string; children: string[]; depth: number }>;
  };

  // ── Boolean Matrix ──
  permissionMatrix: Record<string, Record<string, boolean>>;
}

interface CompanyOutput {
  teamSize: string;
  location: string;
  ceo: string;
}

// LLM API Keys are set in the environment during `kernel deploy <filename> -e OPENAI_API_KEY=XXX`
// See https://www.onkernel.com/docs/apps/deploy#environment-variables

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is not set');
}

app.action<CompanyInput, CompanyOutput>(
  'company-info-task',
  async (ctx: KernelContext, payload?: CompanyInput): Promise<CompanyOutput> => {
    const company = payload?.company || 'kernel';
    const useStealth = payload?.browserConfig?.stealth ?? true;
    const timeout = payload?.browserConfig?.timeout ?? 30_000;
    const verbose = payload?.verbosityLevel ?? 1;

    // =====================
    // BROWSER 1: Extract team size
    // =====================
    const kernelBrowser1 = await kernel.browsers.create({
      invocation_id: ctx.invocation_id,
      stealth: useStealth,
    });
    console.log("Browser 1 live view url: ", kernelBrowser1.browser_live_view_url);

    const stagehand1 = new Stagehand({
      env: "LOCAL",
      localBrowserLaunchOptions: {
        cdpUrl: kernelBrowser1.cdp_ws_url,
      },
      model: "openai/gpt-4.1",
      apiKey: OPENAI_API_KEY,
      verbose: verbose,
      domSettleTimeout: timeout
    });
    await stagehand1.init();

    const page1 = stagehand1.context.pages()[0];
    await page1.goto("https://www.ycombinator.com/companies");
    await stagehand1.act(`Type in ${company} into the search box`);
    await stagehand1.act("Click on the first search result");

    const teamSizeSchema = z.object({
      teamSize: z.string(),
    });
    const teamSizeResult = await stagehand1.extract(
      "Extract the team size (number of employees) shown on this Y Combinator company page.",
      teamSizeSchema
    );

    await new Promise(resolve => setTimeout(resolve, 2000));

    // =====================
    // BROWSER 2: Extract location
    // =====================
    const kernelBrowser2 = await kernel.browsers.create({
      invocation_id: ctx.invocation_id,
      stealth: useStealth,
    });
    console.log("Browser 2 live view url: ", kernelBrowser2.browser_live_view_url);

    await stagehand1.close();
    await kernel.browsers.deleteByID(kernelBrowser1.session_id);
    console.log("Browser 1 killed");

    const stagehand2 = new Stagehand({
      env: "LOCAL",
      localBrowserLaunchOptions: {
        cdpUrl: kernelBrowser2.cdp_ws_url,
      },
      model: "openai/gpt-4.1",
      apiKey: OPENAI_API_KEY,
      verbose: verbose,
      domSettleTimeout: timeout
    });
    await stagehand2.init();

    const page2 = stagehand2.context.pages()[0];
    await page2.goto("https://www.ycombinator.com/companies");
    await stagehand2.act(`Type in ${company} into the search box`);
    await stagehand2.act("Click on the first search result");

    const locationSchema = z.object({
      location: z.string(),
    });
    const locationResult = await stagehand2.extract(
      "Extract the location of the company shown on this Y Combinator company page.",
      locationSchema
    );

    await new Promise(resolve => setTimeout(resolve, 2000));

    // =====================
    // BROWSER 3: Extract CEO
    // =====================
    const kernelBrowser3 = await kernel.browsers.create({
      invocation_id: ctx.invocation_id,
      stealth: useStealth,
    });
    console.log("Browser 3 live view url: ", kernelBrowser3.browser_live_view_url);

    const stagehand3 = new Stagehand({
      env: "LOCAL",
      localBrowserLaunchOptions: {
        cdpUrl: kernelBrowser3.cdp_ws_url,
      },
      model: "openai/gpt-4.1",
      apiKey: OPENAI_API_KEY,
      verbose: verbose,
      domSettleTimeout: timeout
    });
    await stagehand3.init();

    const page3 = stagehand3.context.pages()[0];
    await page3.goto("https://www.ycombinator.com/companies");
    await stagehand3.act(`Type in ${company} into the search box`);
    await stagehand3.act("Click on the first search result");

    const ceoSchema = z.object({
      ceo: z.string(),
    });
    const ceoResult = await stagehand3.extract(
      "Extract the name of the CEO or founder shown on this Y Combinator company page.",
      ceoSchema
    );

    await stagehand2.close();
    await kernel.browsers.deleteByID(kernelBrowser2.session_id);
    console.log("Browser 2 killed");

    await stagehand3.close();
    await kernel.browsers.deleteByID(kernelBrowser3.session_id);
    console.log("Browser 3 killed");

    return {
      teamSize: teamSizeResult.teamSize,
      location: locationResult.location,
      ceo: ceoResult.ceo,
    };
  },
);
