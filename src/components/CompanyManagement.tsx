import { useState, useEffect } from 'react';
import { Building2, Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { companyService } from '../services/companyService';
import { INITIAL_COMPANIES } from '../data/initialCompanies';
import type { Company } from '../types/company';

export default function CompanyManagement() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Company>>({});

  useEffect(() => {
    loadCompanies();
    initializeDefaultCompanies();
  }, []);

  const loadCompanies = () => {
    setCompanies(companyService.getAllCompanies());
  };

  const initializeDefaultCompanies = () => {
    const existing = companyService.getAllCompanies();
    if (existing.length === 0) {
      // Initialize with default companies
      INITIAL_COMPANIES.forEach(company => {
        companyService.addCompany(company);
      });
      loadCompanies();
    }
  };

  const handleAdd = () => {
    setShowAddForm(true);
    setFormData({
      id: `company-${Date.now()}`,
      name: '',
      industry: '',
      stage: 'startup',
      currentGoals: [],
      keyMetrics: [],
      departments: [],
      keyStakeholders: [],
      settings: {
        timezone: 'America/New_York',
        workingHours: { start: '09:00', end: '18:00' },
        workingDays: [1, 2, 3, 4, 5],
        fiscalYearStart: '01-01',
        integrations: {
          newsEnabled: true,
          marketDataEnabled: true,
          competitorTrackingEnabled: true,
          industryInsightsEnabled: true,
        },
        aiSettings: {
          aggressiveness: 'balanced',
          focusAreas: [],
          priorityFramework: 'eisenhower',
        },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  const handleSave = () => {
    if (!formData.name || !formData.industry) {
      alert('Please fill in required fields: Company Name and Industry');
      return;
    }

    const company: Company = {
      ...formData,
      currentGoals: formData.currentGoals || [],
      keyMetrics: formData.keyMetrics || [],
      departments: formData.departments || [],
      keyStakeholders: formData.keyStakeholders || [],
    } as Company;

    if (editingId) {
      companyService.updateCompany(editingId, company);
      setEditingId(null);
    } else {
      companyService.addCompany(company);
    }

    setShowAddForm(false);
    setFormData({});
    loadCompanies();
  };

  const handleEdit = (company: Company) => {
    setFormData(company);
    setEditingId(company.id);
    setShowAddForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this company?')) {
      companyService.deleteCompany(id);
      loadCompanies();
    }
  };

  const handleSetActive = (id: string) => {
    companyService.setActiveCompany(id);
    loadCompanies();
  };

  const activeCompany = companyService.getActiveCompany();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Company Management</h2>
          <p className="text-gray-400">Configure and manage your companies for strategic analysis</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Company
        </button>
      </div>

      {/* Company List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {companies.map(company => (
          <div
            key={company.id}
            className={`bg-slate-800 rounded-lg p-6 border-2 transition-colors ${
              activeCompany?.id === company.id
                ? 'border-primary-600 shadow-lg shadow-primary-900/20'
                : 'border-slate-700'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <Building2 className={`w-6 h-6 ${activeCompany?.id === company.id ? 'text-primary-400' : 'text-gray-400'}`} />
                <div>
                  <h3 className="text-lg font-semibold text-white">{company.name}</h3>
                  <p className="text-sm text-gray-400">{company.industry}</p>
                </div>
              </div>
              {activeCompany?.id === company.id && (
                <span className="px-2 py-1 bg-primary-600 text-white text-xs rounded-md">
                  Active
                </span>
              )}
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-400">Stage:</span>
                <span className="text-white capitalize">{company.stage}</span>
              </div>
              {company.employees && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400">Employees:</span>
                  <span className="text-white">{company.employees}</span>
                </div>
              )}
              {company.description && (
                <p className="text-sm text-gray-400 mt-2">{company.description}</p>
              )}
            </div>

            {/* Current Goals */}
            {company.currentGoals.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-400 mb-2">CURRENT GOALS</p>
                <ul className="text-sm text-gray-300 space-y-1">
                  {company.currentGoals.slice(0, 3).map((goal, i) => (
                    <li key={i} className="truncate">• {goal}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-4 border-t border-slate-700">
              {activeCompany?.id !== company.id && (
                <button
                  onClick={() => handleSetActive(company.id)}
                  className="flex-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
                >
                  Set Active
                </button>
              )}
              <button
                onClick={() => handleEdit(company)}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(company.id)}
                className="px-3 py-1.5 bg-red-900/50 hover:bg-red-900 text-red-200 text-sm rounded transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">
                {editingId ? 'Edit Company' : 'Add New Company'}
              </h3>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingId(null);
                  setFormData({});
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Basic Info */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Company Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Othain Group"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Industry <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.industry || ''}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  placeholder="e.g., IT Consulting, SaaS, etc."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Stage</label>
                <select
                  value={formData.stage || 'startup'}
                  onChange={(e) => setFormData({ ...formData, stage: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                >
                  <option value="startup">Startup</option>
                  <option value="growth">Growth</option>
                  <option value="enterprise">Enterprise</option>
                  <option value="established">Established</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Number of Employees</label>
                <input
                  type="number"
                  value={formData.employees || ''}
                  onChange={(e) => setFormData({ ...formData, employees: parseInt(e.target.value) || undefined })}
                  placeholder="e.g., 50"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the company and its services"
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Current Goals (one per line)
                </label>
                <textarea
                  value={(formData.currentGoals || []).join('\n')}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    currentGoals: e.target.value.split('\n').filter(g => g.trim()) 
                  })}
                  placeholder="Expand AI services&#10;Acquire 10 new enterprise clients&#10;Launch new product line"
                  rows={4}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Competitors (comma-separated)
                </label>
                <input
                  type="text"
                  value={(formData.competitors || []).join(', ')}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    competitors: e.target.value.split(',').map(c => c.trim()).filter(c => c) 
                  })}
                  placeholder="Competitor A, Competitor B, Competitor C"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Target Market
                </label>
                <input
                  type="text"
                  value={formData.targetMarket || ''}
                  onChange={(e) => setFormData({ ...formData, targetMarket: e.target.value })}
                  placeholder="e.g., Mid-market enterprises in healthcare and finance"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 mt-6 pt-6 border-t border-slate-700">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
              >
                <Save className="w-4 h-4" />
                {editingId ? 'Update' : 'Add'} Company
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setEditingId(null);
                  setFormData({});
                }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Notice */}
      <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-4">
        <h3 className="text-green-400 font-semibold mb-2">🔒 Privacy Protected</h3>
        <p className="text-green-200 text-sm">
          All company data is stored locally on your machine. With local LLM (Ollama), 
          your sensitive company information NEVER leaves your computer.
        </p>
      </div>
    </div>
  );
}
