import { storage } from "./storage";
import https from "https";
import { logger } from "./logger";

const PRODUCTION_PORTAL_URL = "https://eservices.himachaltourism.gov.in/";
const scraperLog = logger.child({ module: "scraper" });

interface ScrapedStats {
  totalApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  pendingApplications: number;
}

async function fetchWithCustomAgent(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const agent = new https.Agent({
      rejectUnauthorized: false
    });

    https.get(url, {
      agent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

export async function scrapeProductionStats(): Promise<ScrapedStats | null> {
  try {
    scraperLog.info(`Fetching stats from ${PRODUCTION_PORTAL_URL}`);
    
    const html = await fetchWithCustomAgent(PRODUCTION_PORTAL_URL);
    
    const stats = extractStatsFromHTML(html);
    
    if (stats) {
      await storage.saveProductionStats({
        ...stats,
        sourceUrl: PRODUCTION_PORTAL_URL
      });
      
      scraperLog.info("Successfully scraped and saved stats", stats);
    }
    
    return stats;
  } catch (error) {
    scraperLog.error({ err: error }, "Error scraping production stats");
    return null;
  }
}

function extractStatsFromHTML(html: string): ScrapedStats | null {
  try {
    // Match numbers with commas (e.g., "19,583" or "1,137")
    const totalMatch = html.match(/Total Applications[\s\S]*?([\d,]+)/i);
    const approvedMatch = html.match(/Approved Applications[\s\S]*?([\d,]+)/i);
    const rejectedMatch = html.match(/Rejected Applications[\s\S]*?([\d,]+)/i);
    const pendingMatch = html.match(/Pending Applications[\s\S]*?([\d,]+)/i);
    
    if (totalMatch && approvedMatch && rejectedMatch && pendingMatch) {
      // Remove commas before parsing
      const stats = {
        totalApplications: parseInt(totalMatch[1].replace(/,/g, '')),
        approvedApplications: parseInt(approvedMatch[1].replace(/,/g, '')),
        rejectedApplications: parseInt(rejectedMatch[1].replace(/,/g, '')),
        pendingApplications: parseInt(pendingMatch[1].replace(/,/g, ''))
      };
      
      // Validate parsed numbers
      if (isNaN(stats.totalApplications) || isNaN(stats.approvedApplications) || 
          isNaN(stats.rejectedApplications) || isNaN(stats.pendingApplications)) {
        scraperLog.error("Failed to parse numbers from HTML");
        return null;
      }
      
      scraperLog.info("Parsed stats", stats);
      return stats;
    }
    
    scraperLog.error("Failed to match all required statistics in HTML");
    return null;
  } catch (error) {
    scraperLog.error({ err: error }, "Error extracting stats from HTML");
    return null;
  }
}

let scraperInterval: NodeJS.Timeout | null = null;

export function startScraperScheduler() {
  scrapeProductionStats();
  
  scraperInterval = setInterval(() => {
    scrapeProductionStats();
  }, 60 * 60 * 1000);
  
  scraperLog.info("Scheduler started - will scrape every hour");
}

export function stopScraperScheduler() {
  if (scraperInterval) {
    clearInterval(scraperInterval);
    scraperInterval = null;
    scraperLog.info("Scheduler stopped");
  }
}
