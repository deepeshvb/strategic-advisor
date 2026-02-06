// Multi-Company Management Service

import type { Company, CompanyContext, HistoricalDecision, MarketIntelligence } from '../types/company';

class CompanyService {
  private companies: Map<string, Company> = new Map();
  private activeCompanyId: string | null = null;
  private activeCompanyIds: Set<string> = new Set(); // Support multiple active companies

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
   * Get active company (primary/first active)
   */
  getActiveCompany(): Company | undefined {
    // For backward compatibility, return first active company
    if (this.activeCompanyIds.size > 0) {
      const firstId = Array.from(this.activeCompanyIds)[0];
      return this.companies.get(firstId);
    }
    if (!this.activeCompanyId) return undefined;
    return this.companies.get(this.activeCompanyId);
  }

  /**
   * Get all active companies
   */
  getActiveCompanies(): Company[] {
    return Array.from(this.activeCompanyIds)
      .map(id => this.companies.get(id))
      .filter((c): c is Company => c !== undefined);
  }

  /**
   * Set active company (legacy - single company)
   */
  setActiveCompany(id: string): void {
    if (this.companies.has(id)) {
      this.activeCompanyId = id;
      this.activeCompanyIds.clear();
      this.activeCompanyIds.add(id);
      localStorage.setItem('activeCompanyId', id);
      localStorage.setItem('activeCompanyIds', JSON.stringify([id]));
    }
  }

  /**
   * Toggle company active status (multi-company monitoring)
   */
  toggleCompanyActive(id: string): void {
    if (!this.companies.has(id)) return;
    
    if (this.activeCompanyIds.has(id)) {
      this.activeCompanyIds.delete(id);
      // If this was the primary active company, update it
      if (this.activeCompanyId === id) {
        this.activeCompanyId = this.activeCompanyIds.size > 0 
          ? Array.from(this.activeCompanyIds)[0]
          : null;
      }
    } else {
      this.activeCompanyIds.add(id);
      // Set as primary if no primary exists
      if (!this.activeCompanyId) {
        this.activeCompanyId = id;
      }
    }

    this.saveActiveCompanies();
  }

  /**
   * Check if company is active
   */
  isCompanyActive(id: string): boolean {
    return this.activeCompanyIds.has(id);
  }

  /**
   * Set multiple companies as active
   */
  setActiveCompanies(ids: string[]): void {
    this.activeCompanyIds.clear();
    ids.forEach(id => {
      if (this.companies.has(id)) {
        this.activeCompanyIds.add(id);
      }
    });
    
    // Set first as primary
    if (this.activeCompanyIds.size > 0) {
      this.activeCompanyId = Array.from(this.activeCompanyIds)[0];
    } else {
      this.activeCompanyId = null;
    }

    this.saveActiveCompanies();
  }

  /**
   * Save active companies to localStorage
   */
  private saveActiveCompanies(): void {
    localStorage.setItem('activeCompanyIds', JSON.stringify(Array.from(this.activeCompanyIds)));
    if (this.activeCompanyId) {
      localStorage.setItem('activeCompanyId', this.activeCompanyId);
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
    
    // Remove from active set if present
    this.activeCompanyIds.delete(id);
    
    // Update primary active company if it was deleted
    if (this.activeCompanyId === id) {
      this.activeCompanyId = this.activeCompanyIds.size > 0
        ? Array.from(this.activeCompanyIds)[0]
        : (this.companies.size > 0 ? Array.from(this.companies.keys())[0] : null);
    }
    
    this.saveCompanies();
    this.saveActiveCompanies(); // BUG FIX: Save active companies to persist Set changes
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

    // Load active companies (new multi-company support)
    const activeIds = localStorage.getItem('activeCompanyIds');
    if (activeIds) {
      try {
        const ids: string[] = JSON.parse(activeIds);
        ids.forEach(id => {
          if (this.companies.has(id)) {
            this.activeCompanyIds.add(id);
          }
        });
      } catch (error) {
        console.error('Failed to load active companies:', error);
      }
    }

    // Load single active company (backward compatibility)
    const activeId = localStorage.getItem('activeCompanyId');
    if (activeId && this.companies.has(activeId)) {
      this.activeCompanyId = activeId;
      // Add to active set if not already there
      if (!this.activeCompanyIds.has(activeId)) {
        this.activeCompanyIds.add(activeId);
      }
    }

    // If no active companies but companies exist, activate first one
    if (this.activeCompanyIds.size === 0 && this.companies.size > 0) {
      const firstId = Array.from(this.companies.keys())[0];
      this.activeCompanyIds.add(firstId);
      this.activeCompanyId = firstId;
      this.saveActiveCompanies();
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
