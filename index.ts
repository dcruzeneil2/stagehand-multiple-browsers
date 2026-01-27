import { Stagehand } from "@browserbasehq/stagehand";
import { Kernel, type KernelContext } from '@onkernel/sdk';
import { z } from 'zod';

const kernel = new Kernel();

const app = kernel.app('stagehand-multiple-browsers');

interface CompanyInput {
  company: string;
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
    // A function that returns company info from Y Combinator using multiple browsers

    // Args:
    //     ctx: Kernel context containing invocation information
    //     payload: A startup name to search for on YCombinator's website

    // Returns:
    //     output: The team size, location, and CEO of the startup

    const company = payload?.company || 'kernel';

    // =====================
    // BROWSER 1: Extract team size
    // =====================
    const kernelBrowser1 = await kernel.browsers.create({
      invocation_id: ctx.invocation_id,
      stealth: true,
    });
    console.log("Browser 1 live view url: ", kernelBrowser1.browser_live_view_url);

    const stagehand1 = new Stagehand({
      env: "LOCAL",
      localBrowserLaunchOptions: {
        cdpUrl: kernelBrowser1.cdp_ws_url,
      },
      model: "openai/gpt-4.1",
      apiKey: OPENAI_API_KEY,
      verbose: 1,
      domSettleTimeout: 30_000
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

    // Pause before creating Browser 2
    await new Promise(resolve => setTimeout(resolve, 2000));

    // =====================
    // BROWSER 2: Extract location
    // =====================
    const kernelBrowser2 = await kernel.browsers.create({
      invocation_id: ctx.invocation_id,
      stealth: true,
    });
    console.log("Browser 2 live view url: ", kernelBrowser2.browser_live_view_url);

    // Kill Browser 1 immediately after Browser 2 is created
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
      verbose: 1,
      domSettleTimeout: 30_000
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

    // Pause before creating Browser 3
    await new Promise(resolve => setTimeout(resolve, 2000));

    // =====================
    // BROWSER 3: Extract CEO
    // =====================
    const kernelBrowser3 = await kernel.browsers.create({
      invocation_id: ctx.invocation_id,
      stealth: true,
    });
    console.log("Browser 3 live view url: ", kernelBrowser3.browser_live_view_url);

    const stagehand3 = new Stagehand({
      env: "LOCAL",
      localBrowserLaunchOptions: {
        cdpUrl: kernelBrowser3.cdp_ws_url,
      },
      model: "openai/gpt-4.1",
      apiKey: OPENAI_API_KEY,
      verbose: 1,
      domSettleTimeout: 30_000
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

    // Kill Browser 2 and Browser 3 before returning
    await stagehand2.close();
    await kernel.browsers.deleteByID(kernelBrowser2.session_id);
    console.log("Browser 2 killed");

    await stagehand3.close();
    await kernel.browsers.deleteByID(kernelBrowser3.session_id);
    console.log("Browser 3 killed");

    // Combine all results
    return {
      teamSize: teamSizeResult.teamSize,
      location: locationResult.location,
      ceo: ceoResult.ceo,
    };
  },
);
