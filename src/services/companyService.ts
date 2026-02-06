// Multi-Company Management Service

import type { Company, CompanyContext, HistoricalDecision, MarketIntelligence } from '../types/company';

class CompanyService {
  private companies: Map<string, Company> = new Map();
  private activeCompanyId: string | null = null;

  /**
   * Initialize with companies from localStorage
   */
  constructor() {
    this.loadCompanies();
  }

  /**
   * Add a new company
   */
  addCompany(company: Company): void {
    this.companies.set(company.id, company);
    this.saveCompanies();
    
    // Set as active if it's the first company
    if (this.companies.size === 1) {
      this.activeCompanyId = company.id;
    }
  }

  /**
   * Get company by ID
   */
  getCompany(id: string): Company | undefined {
    return this.companies.get(id);
  }

  /**
   * Get active company
   */
  getActiveCompany(): Company | undefined {
    if (!this.activeCompanyId) return undefined;
    return this.companies.get(this.activeCompanyId);
  }

  /**
   * Set active company
   */
  setActiveCompany(id: string): void {
    if (this.companies.has(id)) {
      this.activeCompanyId = id;
      localStorage.setItem('activeCompanyId', id);
    }
  }

  /**
   * Get all companies
   */
  getAllCompanies(): Company[] {
    return Array.from(this.companies.values());
  }

  /**
   * Update company
   */
  updateCompany(id: string, updates: Partial<Company>): void {
    const company = this.companies.get(id);
    if (!company) return;

    const updated = {
      ...company,
      ...updates,
      updatedAt: new Date(),
    };

    this.companies.set(id, updated);
    this.saveCompanies();
  }

  /**
   * Delete company
   */
  deleteCompany(id: string): void {
    this.companies.delete(id);
    if (this.activeCompanyId === id) {
      this.activeCompanyId = this.companies.size > 0 
        ? Array.from(this.companies.keys())[0] 
        : null;
    }
    this.saveCompanies();
  }

  /**
   * Build complete context for active company
   */
  async buildCompanyContext(): Promise<CompanyContext | null> {
    const company = this.getActiveCompany();
    if (!company) return null;

    return {
      company,
      historicalDecisions: this.getHistoricalDecisions(company.id),
      marketIntelligence: await this.getMarketIntelligence(company),
      competitorActivity: await this.getCompetitorActivity(company),
      industryTrends: await this.getIndustryTrends(company),
    };
  }

  /**
   * Add historical decision
   */
  addHistoricalDecision(companyId: string, decision: Omit<HistoricalDecision, 'id'>): void {
    const decisions = this.getHistoricalDecisions(companyId);
    const newDecision: HistoricalDecision = {
      ...decision,
      id: `decision-${Date.now()}`,
    };

    decisions.push(newDecision);
    localStorage.setItem(`decisions-${companyId}`, JSON.stringify(decisions));
  }

  /**
   * Get historical decisions for company
   */
  private getHistoricalDecisions(companyId: string): HistoricalDecision[] {
    const stored = localStorage.getItem(`decisions-${companyId}`);
    if (!stored) return [];
    
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  /**
   * Get market intelligence (placeholder - would integrate with external APIs)
   */
  private async getMarketIntelligence(company: Company): Promise<MarketIntelligence> {
    // TODO: Integrate with:
    // - News APIs (NewsAPI, Google News)
    // - Market data APIs (Alpha Vantage, Yahoo Finance)
    // - Economic indicators APIs
    
    return {
      lastUpdated: new Date(),
      news: [],
      marketConditions: {
        sentiment: 'neutral',
        volatility: 'medium',
        keyEvents: [],
      },
      economicIndicators: {},
    };
  }

  /**
   * Get competitor activity
   */
  private async getCompetitorActivity(company: Company) {
    // TODO: Integrate with competitor tracking services
    return [];
  }

  /**
   * Get industry trends
   */
  private async getIndustryTrends(company: Company) {
    // TODO: Integrate with industry analysis services
    return [];
  }

  /**
   * Save companies to localStorage
   */
  private saveCompanies(): void {
    const companiesArray = Array.from(this.companies.values());
    localStorage.setItem('companies', JSON.stringify(companiesArray));
    if (this.activeCompanyId) {
      localStorage.setItem('activeCompanyId', this.activeCompanyId);
    }
  }

  /**
   * Load companies from localStorage
   */
  private loadCompanies(): void {
    const stored = localStorage.getItem('companies');
    if (stored) {
      try {
        const companiesArray: Company[] = JSON.parse(stored);
        companiesArray.forEach(company => {
          this.companies.set(company.id, company);
        });
      } catch (error) {
        console.error('Failed to load companies:', error);
      }
    }

    const activeId = localStorage.getItem('activeCompanyId');
    if (activeId && this.companies.has(activeId)) {
      this.activeCompanyId = activeId;
    }
  }

  /**
   * Export company data
   */
  exportCompany(id: string): string {
    const company = this.companies.get(id);
    if (!company) throw new Error('Company not found');

    const decisions = this.getHistoricalDecisions(id);
    
    return JSON.stringify({
      company,
      decisions,
      exportedAt: new Date(),
    }, null, 2);
  }

  /**
   * Import company data
   */
  importCompany(data: string): void {
    try {
      const parsed = JSON.parse(data);
      if (parsed.company) {
        this.addCompany(parsed.company);
        if (parsed.decisions) {
          localStorage.setItem(`decisions-${parsed.company.id}`, JSON.stringify(parsed.decisions));
        }
      }
    } catch (error) {
      throw new Error('Invalid company data format');
    }
  }
}

export const companyService = new CompanyService();
