import { useState, useEffect } from 'react';
import { Building2, Plus, Check, Settings as SettingsIcon } from 'lucide-react';
import { companyService } from '../services/companyService';
import type { Company } from '../types/company';

export default function CompanySelector() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company | undefined>();
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = () => {
    const all = companyService.getAllCompanies();
    const active = companyService.getActiveCompany();
    setCompanies(all);
    setActiveCompany(active);
  };

  const handleSelectCompany = (companyId: string) => {
    companyService.setActiveCompany(companyId);
    loadCompanies();
    setShowDropdown(false);
    window.location.reload(); // Refresh to load new company context
  };

  if (companies.length === 0) {
    return (
      <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3">
        <div className="flex items-center gap-2 text-yellow-200 text-sm">
          <Building2 className="w-4 h-4" />
          <span>No companies configured. Go to Settings to add your company.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="w-full flex items-center justify-between px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary-400" />
          <div className="text-left">
            <div className="text-white font-medium text-sm">
              {activeCompany?.name || 'Select Company'}
            </div>
            {activeCompany && (
              <div className="text-gray-400 text-xs">
                {activeCompany.industry} • {activeCompany.stage}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {companies.length > 1 && (
            <span className="text-xs text-gray-400">{companies.length} companies</span>
          )}
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {showDropdown && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 max-h-64 overflow-y-auto">
            {companies.map((company) => (
              <button
                key={company.id}
                onClick={() => handleSelectCompany(company.id)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="text-white font-medium text-sm">{company.name}</div>
                    <div className="text-gray-400 text-xs">
                      {company.industry} • {company.stage}
                    </div>
                  </div>
                </div>
                {activeCompany?.id === company.id && (
                  <Check className="w-4 h-4 text-primary-400" />
                )}
              </button>
            ))}
            
            <div className="border-t border-slate-700 p-2">
              <button
                onClick={() => {
                  setShowDropdown(false);
                  // Navigate to settings to add company
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-primary-400 hover:bg-slate-700 rounded-lg transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Company</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
