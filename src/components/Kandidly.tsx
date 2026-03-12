import { useState, useEffect, useCallback, useMemo } from 'react';
import { UserCheck, Save, RefreshCw, Plus, Trash2, FileText, Download, History, Users, LayoutGrid, Printer } from 'lucide-react';

interface KandidlyConfig {
  enabled: boolean;
}

interface CandidateInput {
  name: string;
  resume: string;
  interviewNotes: string;
}

function recommendationLabel(rec: string): string {
  if (rec === 'strong_fit') return 'Strong Yes';
  if (rec === 'possible_fit') return 'Yes';
  if (rec === 'weak_fit') return 'No';
  if (rec === 'maybe') return 'Maybe';
  return rec?.replace('_', ' ') ?? '';
}

interface ScreeningResult {
  name: string;
  score: number;
  score100?: number;
  skillsMatch?: number;
  experienceRelevance?: number;
  cultureFit?: number;
  redFlagScore?: number;
  fitSummary?: string;
  detailedFitNarrative?: string;
  experienceVsRequirements?: string[];
  strengths?: string[];
  gaps?: string[];
  redFlags?: string[];
  interviewFocusAreas?: string[];
  recommendation: 'strong_fit' | 'possible_fit' | 'weak_fit' | 'maybe';
  recommendationReasoning?: string;
}

interface HistoryRecord {
  id: string;
  createdAt: string;
  roleLabel: string;
  jobDescriptionSnippet?: string;
  candidates: ScreeningResult[];
  jdId?: string | null;
  candidateIds?: string[] | null;
  manualNotes?: string;
  updatedAt?: string;
}

interface SavedJD {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  roleType?: string;
  seniorityLevel?: string;
  mustHaves?: string;
  niceToHaves?: string;
  redFlags?: string;
  scoringWeights?: Record<string, number>;
}

interface SavedCandidate {
  id: string;
  name: string;
  resume: string;
  interviewNotes?: string;
  createdAt: string;
}

export default function Kandidly() {
  const [config, setConfig] = useState<KandidlyConfig>({ enabled: false });
  const [fullConfig, setFullConfig] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [jobDescription, setJobDescription] = useState('');
  const [candidates, setCandidates] = useState<CandidateInput[]>([{ name: '', resume: '', interviewNotes: '' }]);
  const [screening, setScreening] = useState(false);
  const [results, setResults] = useState<ScreeningResult[] | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [jds, setJds] = useState<SavedJD[]>([]);
  const [candidatesRepo, setCandidatesRepo] = useState<SavedCandidate[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [selectedJdId, setSelectedJdId] = useState<string | null>(null);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [forceRerun, setForceRerun] = useState(false);
  const [previousScreeningMessage, setPreviousScreeningMessage] = useState<string | null>(null);
  const [showAddJd, setShowAddJd] = useState(false);
  const [showAddCandidate, setShowAddCandidate] = useState(false);
  const [newJdTitle, setNewJdTitle] = useState('');
  const [newJdContent, setNewJdContent] = useState('');
  const [newJdRoleType, setNewJdRoleType] = useState('');
  const [newJdSeniority, setNewJdSeniority] = useState('');
  const [newJdMustHaves, setNewJdMustHaves] = useState('');
  const [newJdNiceToHaves, setNewJdNiceToHaves] = useState('');
  const [newJdRedFlags, setNewJdRedFlags] = useState('');
  const [newCandidateName, setNewCandidateName] = useState('');
  const [newCandidateResume, setNewCandidateResume] = useState('');
  const [newCandidateNotes, setNewCandidateNotes] = useState('');
  const [compareView, setCompareView] = useState(false);
  const [manualNotesByRecord, setManualNotesByRecord] = useState<Record<string, string>>({});
  const [savingNotesId, setSavingNotesId] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        setFullConfig(data);
        const k = data.kandidly || {};
        setConfig({ enabled: k.enabled === true });
      }
    } catch (e) {
      console.warn('Kandidly config load failed:', e);
      setMessage({ type: 'error', text: 'Could not load config. Is the backend running?' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/kandidly/history');
      const data = await res.json();
      if (res.ok && data.entries) setHistory(data.entries);
    } catch (_) {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const loadRepos = useCallback(async () => {
    setReposLoading(true);
    try {
      const [jRes, cRes] = await Promise.all([
        fetch('/api/kandidly/jds'),
        fetch('/api/kandidly/candidates'),
      ]);
      const jData = await jRes.json();
      const cData = await cRes.json();
      if (jRes.ok && jData.jds) setJds(jData.jds);
      if (cRes.ok && cData.candidates) setCandidatesRepo(cData.candidates);
    } catch (_) {
      setJds([]);
      setCandidatesRepo([]);
    } finally {
      setReposLoading(false);
    }
  }, []);

  useEffect(() => {
    if (config.enabled) loadHistory();
  }, [config.enabled, loadHistory]);

  useEffect(() => {
    if (config.enabled) loadRepos();
  }, [config.enabled, loadRepos]);

  const handleSave = async () => {
    if (!fullConfig) return;
    setSaving(true);
    setMessage(null);
    try {
      const updated = { ...fullConfig, kandidly: config };
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        setFullConfig(updated);
        setMessage({ type: 'success', text: 'Settings saved.' });
      } else {
        const err = await res.json().catch(() => ({}));
        setMessage({ type: 'error', text: err.error || 'Save failed.' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Could not save. Check backend.' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result ?? ''));
      r.onerror = () => reject(new Error('Failed to read file'));
      r.readAsText(file, 'UTF-8');
    });
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    const name = file.name.toLowerCase();
    if (name.endsWith('.txt')) return readFileAsText(file);
    if (name.endsWith('.doc') || name.endsWith('.docx')) {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/kandidly/extract-text', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok || !data.text) throw new Error(data.error || 'Could not extract text from Word file.');
      return data.text;
    }
    throw new Error('Use .txt, .doc, or .docx');
  };

  const handleJDFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await extractTextFromFile(file);
      setJobDescription(text);
      setMessage({ type: 'success', text: `Loaded JD from ${file.name}` });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Could not read file.' });
    }
    e.target.value = '';
  };

  const handleResumeFile = async (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await extractTextFromFile(file);
      setCandidates((prev) => {
        const next = [...prev];
        next[idx] = { ...next[idx], resume: text, name: next[idx].name || file.name.replace(/\.[^.]+$/, '') };
        return next;
      });
      setMessage({ type: 'success', text: `Loaded resume from ${file.name}` });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Could not read file.' });
    }
    e.target.value = '';
  };

  const addCandidate = () => {
    setCandidates((prev) => [...prev, { name: '', resume: '', interviewNotes: '' }]);
  };

  const removeCandidate = (idx: number) => {
    setCandidates((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : [{ name: '', resume: '', interviewNotes: '' }]));
  };

  const updateCandidate = (idx: number, field: keyof CandidateInput, value: string) => {
    setCandidates((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const handleScreen = async () => {
    const useRepo = selectedJdId && selectedCandidateIds.length > 0;
    const jd = jobDescription.trim();
    const valid = candidates.filter((c) => c.resume.trim().length > 0);
    if (!useRepo) {
      if (!jd) {
        setMessage({ type: 'error', text: 'Enter or upload the job description, or select a saved JD below.' });
        return;
      }
      if (valid.length === 0) {
        setMessage({ type: 'error', text: 'Add at least one candidate with resume text, or select saved candidates.' });
        return;
      }
    }
    setScreening(true);
    setMessage(null);
    setResults(null);
    setPreviousScreeningMessage(null);
    try {
      const body = useRepo
        ? { jdId: selectedJdId, candidateIds: selectedCandidateIds, forceRerun }
        : {
            jobDescription: jd,
            candidates: valid.map((c) => ({
              name: c.name.trim() || undefined,
              resume: c.resume.trim(),
              interviewNotes: c.interviewNotes.trim() || undefined,
            })),
          };
      const res = await fetch('/api/kandidly/screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.previousScreening) {
          setPreviousScreeningMessage(data.message || 'Already screened. Check "Rerun screening" and click Screen to run again.');
          setResults(data.candidates || []);
        } else {
          setResults(data.candidates || []);
          setMessage({ type: 'success', text: `Screened ${(data.candidates || []).length} candidate(s). Report sent to your email and WhatsApp.` });
          setJobDescription('');
          setCandidates([{ name: '', resume: '', interviewNotes: '' }]);
          setSelectedJdId(null);
          setSelectedCandidateIds([]);
          setResults(null);
          loadHistory();
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Screening failed.' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Request failed. Is the backend running? Enable Kandidly in config and save.' });
    } finally {
      setScreening(false);
      setTimeout(() => setMessage(null), 8000);
    }
  };

  const handleRerun = async (record: HistoryRecord) => {
    if (!record.jdId || !record.candidateIds?.length) return;
    setScreening(true);
    setMessage(null);
    setResults(null);
    setPreviousScreeningMessage(null);
    try {
      const res = await fetch('/api/kandidly/screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jdId: record.jdId, candidateIds: record.candidateIds, forceRerun: true }),
      });
      const data = await res.json();
      if (res.ok && data.success && !data.previousScreening) {
        setMessage({ type: 'success', text: `Reran screening for ${record.roleLabel}. Report sent to email and WhatsApp.` });
        loadHistory();
        loadRepos();
      } else {
        setMessage({ type: 'error', text: data.error || 'Rerun failed.' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Rerun failed. Is the backend running?' });
    } finally {
      setScreening(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleSaveJd = async () => {
    const t = newJdTitle.trim();
    const c = newJdContent.trim();
    if (!t || !c) {
      setMessage({ type: 'error', text: 'Title and content required.' });
      return;
    }
    try {
      const body: Record<string, unknown> = { title: t, content: c };
      if (newJdRoleType.trim()) body.roleType = newJdRoleType.trim();
      if (newJdSeniority.trim()) body.seniorityLevel = newJdSeniority.trim();
      if (newJdMustHaves.trim()) body.mustHaves = newJdMustHaves.trim();
      if (newJdNiceToHaves.trim()) body.niceToHaves = newJdNiceToHaves.trim();
      if (newJdRedFlags.trim()) body.redFlags = newJdRedFlags.trim();
      const res = await fetch('/api/kandidly/jds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNewJdTitle('');
        setNewJdContent('');
        setNewJdRoleType('');
        setNewJdSeniority('');
        setNewJdMustHaves('');
        setNewJdNiceToHaves('');
        setNewJdRedFlags('');
        setShowAddJd(false);
        loadRepos();
        setMessage({ type: 'success', text: 'JD saved.' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save JD.' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Could not save JD.' });
    }
  };

  const handleSaveCandidate = async () => {
    const n = newCandidateName.trim();
    const r = newCandidateResume.trim();
    if (!n || !r) {
      setMessage({ type: 'error', text: 'Name and resume required.' });
      return;
    }
    try {
      const res = await fetch('/api/kandidly/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: n, resume: r, interviewNotes: newCandidateNotes.trim() || undefined }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNewCandidateName('');
        setNewCandidateResume('');
        setNewCandidateNotes('');
        setShowAddCandidate(false);
        loadRepos();
        setMessage({ type: 'success', text: 'Candidate saved.' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save candidate.' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Could not save candidate.' });
    }
  };

  const toggleCandidateSelection = (id: string) => {
    setSelectedCandidateIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const candidateTrackerList = useMemo(() => {
    const list: { name: string; roleLabel: string; score: number; score100?: number; recommendation: string; createdAt: string; recordId: string }[] = [];
    for (const record of history) {
      for (const c of record.candidates || []) {
        list.push({
          name: c.name || 'Unknown',
          roleLabel: record.roleLabel || 'Screening',
          score: c.score ?? 0,
          score100: (c as ScreeningResult).score100,
          recommendation: c.recommendation || '',
          createdAt: record.createdAt,
          recordId: record.id,
        });
      }
    }
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  }, [history]);

  const handleSaveManualNotes = async (recordId: string, notes: string) => {
    setSavingNotesId(recordId);
    try {
      const res = await fetch(`/api/kandidly/history/${recordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manualNotes: notes }),
      });
      if (res.ok) {
        setManualNotesByRecord((prev) => ({ ...prev, [recordId]: notes }));
        loadHistory();
      }
    } catch (_) {}
    setSavingNotesId(null);
  };

  const handlePrintScorecard = () => {
    const data = results && results.length > 0 ? results : null;
    if (!data) return;
    const win = window.open('', '_blank');
    if (!win) return;
    const score100 = (r: ScreeningResult) => typeof r.score100 === 'number' ? r.score100 : (r.score ?? 0) * 10;
    win.document.write(`
      <!DOCTYPE html><html><head><title>Kandidly Scorecard</title><style>
        body{ font-family: system-ui,sans-serif; padding: 20px; color: #1f2937; }
        h1{ font-size: 1.25rem; }
        .disclaimer{ background: #fef3c7; padding: 8px 12px; margin-bottom: 16px; font-size: 12px; }
        .candidate{ border: 1px solid #e5e7eb; padding: 16px; margin-bottom: 16px; }
        .meta{ margin-bottom: 8px; }
        ul{ margin: 4px 0; padding-left: 20px; }
      </style></head><body>
      <p class="disclaimer">AI score is advisory only, not a final hiring decision.</p>
      ${data.map((r, i) => `
        <div class="candidate">
          <div class="meta"><strong>${r.name || `Candidate ${i + 1}`}</strong> — ${score100(r)}/100 — ${recommendationLabel(r.recommendation)}</div>
          ${r.fitSummary ? `<p>${r.fitSummary}</p>` : ''}
          ${r.strengths?.length ? `<p><strong>Top strengths:</strong><ul>${(r.strengths.slice(0, 3)).map((s) => `<li>${s}</li>`).join('')}</ul></p>` : ''}
          ${r.gaps?.length ? `<p><strong>Top concerns:</strong><ul>${(r.gaps.slice(0, 3)).map((g) => `<li>${g}</li>`).join('')}</ul></p>` : ''}
        </div>
      `).join('')}
      </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px] text-gray-400">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="config-card">
        <h2 className="config-heading flex items-center gap-2" id="kandidly-config">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/20 to-indigo-600/20 flex items-center justify-center">
            <UserCheck className="text-violet-400" size={24} />
          </div>
          Kandidly
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          Hiring screener: paste or upload the <strong>job description</strong> and <strong>candidate resumes</strong> (Word .doc/.docx or .txt) and optional interview notes. You can also email the agent with Word attachments (JD + resumes) and get insights by reply. Kandidly scores each candidate’s fit and recommends strong_fit / possible_fit / weak_fit.
        </p>

        <div className="space-y-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setConfig((c) => ({ ...c, enabled: e.target.checked }))}
              className="rounded border-gray-500 bg-gray-600 text-lobster-500 focus:ring-lobster-500"
            />
            <span className="text-sm font-medium text-white">Enable Kandidly</span>
          </label>
          <button type="button" onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save size={16} />}
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
        {message && (
          <p className={`text-sm mt-2 ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>{message.text}</p>
        )}
      </section>

      <div className="lg:grid lg:grid-cols-[minmax(280px,1fr)_1.6fr] lg:gap-8 space-y-8 lg:space-y-0">
      <aside className="space-y-6">
      <section className="config-card">
        <div className="p-3 rounded-lg bg-violet-900/20 border border-violet-700/40 mb-4">
          <p className="text-sm text-violet-200">
            <strong>Screen via email or WhatsApp:</strong> Send &quot;Screen [candidate name] for [role/JD title]&quot; to use saved JD and candidate (or attach JD + resumes). If already screened, you’ll see the previous result and can reply &quot;rerun&quot; to run again.</p>
        </div>
        <h3 className="text-lg font-semibold text-gray-200 mb-2">JD repository</h3>
        <p className="text-sm text-gray-400 mb-3">Save JDs to run screenings by role name (e.g. &quot;Screen Jane for Senior Engineer&quot; in email/WhatsApp).</p>
        {reposLoading ? (
          <p className="text-sm text-gray-500 mb-3">Loading…</p>
        ) : (
          <>
            <ul className="space-y-2 mb-3">
              {jds.map((jd) => (
                <li key={jd.id} className="flex flex-wrap items-center justify-between gap-2 p-2 rounded bg-gray-800/50 border border-gray-700">
                  <span className="font-medium text-gray-200">{jd.title}</span>
                  <span className="text-xs text-gray-500">{jd.content.slice(0, 80)}…</span>
                  <button type="button" onClick={() => { setSelectedJdId(jd.id); setJobDescription(jd.content); }} className="btn-secondary text-sm">Use this JD</button>
                </li>
              ))}
            </ul>
            {!showAddJd ? (
              <button type="button" onClick={() => setShowAddJd(true)} className="btn-secondary flex items-center gap-2 mb-4">
                <Plus size={16} /> Add JD
              </button>
            ) : (
              <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700 mb-4 space-y-3">
                <input type="text" placeholder="JD title (e.g. Senior Engineer)" value={newJdTitle} onChange={(e) => setNewJdTitle(e.target.value)} className="config-input w-full" />
                <textarea placeholder="Full job description…" value={newJdContent} onChange={(e) => setNewJdContent(e.target.value)} className="config-input w-full min-h-[120px]" rows={4} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-gray-500">Role type (optional)</label>
                    <select value={newJdRoleType} onChange={(e) => setNewJdRoleType(e.target.value)} className="config-input w-full mt-0.5">
                      <option value="">—</option>
                      <option value="technical">Technical</option>
                      <option value="leadership">Leadership</option>
                      <option value="sales">Sales</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Seniority (optional)</label>
                    <select value={newJdSeniority} onChange={(e) => setNewJdSeniority(e.target.value)} className="config-input w-full mt-0.5">
                      <option value="">—</option>
                      <option value="junior">Junior</option>
                      <option value="mid">Mid</option>
                      <option value="senior">Senior</option>
                      <option value="lead">Lead</option>
                      <option value="executive">Executive</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Must-haves (optional)</label>
                  <textarea placeholder="One per line or paragraph" value={newJdMustHaves} onChange={(e) => setNewJdMustHaves(e.target.value)} className="config-input w-full min-h-[60px] mt-0.5" rows={2} />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Nice-to-haves (optional)</label>
                  <textarea placeholder="One per line or paragraph" value={newJdNiceToHaves} onChange={(e) => setNewJdNiceToHaves(e.target.value)} className="config-input w-full min-h-[60px] mt-0.5" rows={2} />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Red flags to watch (optional)</label>
                  <textarea placeholder="e.g. job hopping, gaps" value={newJdRedFlags} onChange={(e) => setNewJdRedFlags(e.target.value)} className="config-input w-full min-h-[50px] mt-0.5" rows={1} />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={handleSaveJd} className="btn-primary">Save JD</button>
                  <button type="button" onClick={() => { setShowAddJd(false); setNewJdTitle(''); setNewJdContent(''); setNewJdRoleType(''); setNewJdSeniority(''); setNewJdMustHaves(''); setNewJdNiceToHaves(''); setNewJdRedFlags(''); }} className="btn-secondary">Cancel</button>
                </div>
              </div>
            )}
          </>
        )}
        {selectedJdId && <p className="text-sm text-violet-400 mb-2">Using JD: {jds.find((j) => j.id === selectedJdId)?.title}</p>}
        <h3 className="text-lg font-semibold text-gray-200 mb-2 mt-6">Job description (JD)</h3>
        <p className="text-sm text-gray-400 mb-3">Paste the role requirements, or upload a Word (.doc/.docx) or .txt file. Or select a saved JD above.</p>
        <div className="flex flex-wrap gap-2 mb-2">
          <label className="btn-secondary flex items-center gap-2 cursor-pointer">
            <FileText size={16} />
            Upload JD (.doc, .docx, .txt)
            <input type="file" accept=".txt,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleJDFile} className="hidden" />
          </label>
        </div>
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste or type the full job description, role requirements, must-haves, nice-to-haves…"
          className="config-input w-full min-h-[180px] font-mono text-sm"
          rows={8}
        />
      </section>
      </aside>

      <div className="space-y-6">
      <section className="config-card">
        <h3 className="text-lg font-semibold text-gray-200 mb-2">Candidate repository</h3>
        <p className="text-sm text-gray-400 mb-3">Save candidates to screen by name (e.g. &quot;Screen John for Senior Engineer&quot; in email/WhatsApp). Select one or more for the next screening.</p>
        {reposLoading ? (
          <p className="text-sm text-gray-500 mb-3">Loading…</p>
        ) : (
          <>
            <ul className="space-y-2 mb-3">
              {candidatesRepo.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 p-2 rounded bg-gray-800/50 border border-gray-700">
                  <span className="font-medium text-gray-200">{c.name}</span>
                  <span className="text-xs text-gray-500">{c.resume.slice(0, 60)}…</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={selectedCandidateIds.includes(c.id)} onChange={() => toggleCandidateSelection(c.id)} className="rounded border-gray-500 bg-gray-600 text-violet-500" />
                    <span className="text-sm">Use for screening</span>
                  </label>
                </li>
              ))}
            </ul>
            {!showAddCandidate ? (
              <button type="button" onClick={() => setShowAddCandidate(true)} className="btn-secondary flex items-center gap-2 mb-4">
                <Plus size={16} /> Add candidate
              </button>
            ) : (
              <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700 mb-4 space-y-3">
                <input type="text" placeholder="Candidate name" value={newCandidateName} onChange={(e) => setNewCandidateName(e.target.value)} className="config-input w-full" />
                <textarea placeholder="Resume text…" value={newCandidateResume} onChange={(e) => setNewCandidateResume(e.target.value)} className="config-input w-full min-h-[120px]" rows={4} />
                <textarea placeholder="Interview notes (optional)" value={newCandidateNotes} onChange={(e) => setNewCandidateNotes(e.target.value)} className="config-input w-full min-h-[60px]" rows={2} />
                <div className="flex gap-2">
                  <button type="button" onClick={handleSaveCandidate} className="btn-primary">Save candidate</button>
                  <button type="button" onClick={() => { setShowAddCandidate(false); setNewCandidateName(''); setNewCandidateResume(''); setNewCandidateNotes(''); }} className="btn-secondary">Cancel</button>
                </div>
              </div>
            )}
          </>
        )}
        {selectedCandidateIds.length > 0 && <p className="text-sm text-violet-400 mb-2">Selected for screening: {selectedCandidateIds.map((id) => candidatesRepo.find((x) => x.id === id)?.name).filter(Boolean).join(', ')}</p>}
      </section>

      <section className="config-card">
        <h3 className="text-lg font-semibold text-gray-200 mb-2">Candidates (paste or upload)</h3>
        <p className="text-sm text-gray-400 mb-4">Add one or more candidates below. For each, paste the resume (or upload .txt) and optionally add interview notes. Or select saved candidates above.</p>
        {candidates.map((c, idx) => (
          <div key={idx} className="p-4 rounded-lg bg-gray-800/50 border border-gray-700 mb-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-sm font-medium text-gray-300">Candidate {idx + 1}</span>
              <button type="button" onClick={() => removeCandidate(idx)} className="text-red-400 hover:text-red-300 flex items-center gap-1 text-sm">
                <Trash2 size={14} /> Remove
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-gray-500">Name (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Jane Doe"
                  value={c.name}
                  onChange={(e) => updateCandidate(idx, 'name', e.target.value)}
                  className="config-input w-full"
                />
              </div>
              <div className="flex items-end">
                <label className="btn-secondary flex items-center gap-2 cursor-pointer w-full justify-center">
                  <FileText size={14} />
                  Upload resume (.doc, .docx, .txt)
                  <input type="file" accept=".txt,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => handleResumeFile(idx, e)} className="hidden" />
                </label>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500">Resume (paste or upload) *</label>
              <textarea
                value={c.resume}
                onChange={(e) => updateCandidate(idx, 'resume', e.target.value)}
                placeholder="Paste full resume / CV text here…"
                className="config-input w-full min-h-[120px] font-mono text-sm"
                rows={5}
              />
            </div>
            <div className="mt-2">
              <label className="text-xs text-gray-500">Interview notes (optional)</label>
              <textarea
                value={c.interviewNotes}
                onChange={(e) => updateCandidate(idx, 'interviewNotes', e.target.value)}
                placeholder="Paste any interview notes or feedback…"
                className="config-input w-full min-h-[60px] text-sm"
                rows={2}
              />
            </div>
          </div>
        ))}
        <button type="button" onClick={addCandidate} className="btn-secondary flex items-center gap-2">
          <Plus size={16} /> Add candidate
        </button>
      </section>

      <section className="config-card">
        {previousScreeningMessage && (
          <div className="p-3 rounded-lg bg-amber-900/20 border border-amber-700/40 mb-4">
            <p className="text-sm text-amber-200">{previousScreeningMessage}</p>
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input type="checkbox" checked={forceRerun} onChange={(e) => setForceRerun(e.target.checked)} className="rounded border-gray-500 bg-gray-600 text-amber-500" />
              <span className="text-sm">Rerun screening</span>
            </label>
          </div>
        )}
        <button
          type="button"
          onClick={handleScreen}
          disabled={screening || !config.enabled || ((!jobDescription.trim() || candidates.every((c) => !c.resume.trim())) && !(selectedJdId && selectedCandidateIds.length > 0))}
          className="btn-primary flex items-center gap-2"
        >
          {screening ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserCheck size={18} />}
          {screening ? 'Screening…' : 'Screen candidates'}
        </button>
        {!config.enabled && (
          <p className="text-amber-400 text-sm mt-2">Enable Kandidly above and save, then run the screen.</p>
        )}
      </section>

      {results && results.length > 0 && (
      <section className="config-card">
        <h3 className="text-lg font-semibold text-gray-200 mb-4">Screening results</h3>
        <p className="text-xs text-amber-200/90 mb-4 rounded-lg bg-amber-900/20 border border-amber-700/40 px-3 py-2">AI score is advisory only, not a final hiring decision. Use alongside human judgment.</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {results.length >= 2 && (
            <button type="button" onClick={() => setCompareView((v) => !v)} className="btn-secondary flex items-center gap-1 text-sm">
              <LayoutGrid size={14} /> {compareView ? 'Hide comparison' : 'Compare top 3'}
            </button>
          )}
          <button type="button" onClick={handlePrintScorecard} className="btn-secondary flex items-center gap-1 text-sm">
            <Printer size={14} /> Print / PDF
          </button>
        </div>
          <div className={compareView && results.length >= 2 ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-6'}>
            {(compareView && results.length >= 2 ? results.slice(0, 3) : results).map((r, i) => (
              <div key={i} className="p-4 rounded-lg bg-gray-800 border border-gray-700">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="font-medium text-white">{r.name || `Candidate ${i + 1}`}</span>
                  <span className={`text-sm font-semibold px-2 py-0.5 rounded ${
                    r.recommendation === 'strong_fit' ? 'bg-green-900/50 text-green-400' :
                    r.recommendation === 'possible_fit' || r.recommendation === 'maybe' ? 'bg-amber-900/50 text-amber-400' : 'bg-gray-700 text-gray-400'
                  }`}>
                    {recommendationLabel(r.recommendation)}
                  </span>
                  <span className="text-lg font-mono text-violet-400">{typeof r.score100 === 'number' ? `${r.score100}/100` : `${(r.score ?? 0) * 10}/100`}</span>
                </div>
                {(r.skillsMatch != null || r.experienceRelevance != null || r.cultureFit != null || r.redFlagScore != null) && (
                  <div className="flex flex-wrap gap-3 mb-2 text-xs">
                    {r.skillsMatch != null && <span className="text-gray-400">Skills: <span className="text-violet-400 font-mono">{r.skillsMatch}</span></span>}
                    {r.experienceRelevance != null && <span className="text-gray-400">Experience: <span className="text-violet-400 font-mono">{r.experienceRelevance}</span></span>}
                    {r.cultureFit != null && <span className="text-gray-400">Culture: <span className="text-violet-400 font-mono">{r.cultureFit}</span></span>}
                    {r.redFlagScore != null && <span className="text-gray-400">Red flags: <span className="text-violet-400 font-mono">{r.redFlagScore}</span></span>}
                  </div>
                )}
                {r.fitSummary && <p className="text-sm text-gray-300 mb-2">{r.fitSummary}</p>}
                {r.detailedFitNarrative && <p className="text-sm text-gray-400 mb-3">{r.detailedFitNarrative}</p>}
                {r.experienceVsRequirements && r.experienceVsRequirements.length > 0 && (
                  <div className="mb-2">
                    <span className="text-xs font-medium text-gray-500">Experience vs requirements</span>
                    <ul className="list-disc list-inside text-sm text-gray-400">
                      {r.experienceVsRequirements.map((s, j) => <li key={j}>{s}</li>)}
                    </ul>
                  </div>
                )}
                {r.strengths && r.strengths.length > 0 && (
                  <div className="mb-2">
                    <span className="text-xs font-medium text-gray-500">Top 3 strengths</span>
                    <ul className="list-disc list-inside text-sm text-gray-400">
                      {(r.strengths.slice(0, 3)).map((s, j) => <li key={j}>{s}</li>)}
                    </ul>
                  </div>
                )}
                {r.gaps && r.gaps.length > 0 && (
                  <div className="mb-2">
                    <span className="text-xs font-medium text-gray-500">Top 3 concerns</span>
                    <ul className="list-disc list-inside text-sm text-gray-400">
                      {(r.gaps.slice(0, 3)).map((g, j) => <li key={j}>{g}</li>)}
                    </ul>
                  </div>
                )}
                {r.redFlags && r.redFlags.length > 0 && (
                  <div className="mb-2">
                    <span className="text-xs font-medium text-amber-500">Red flags</span>
                    <ul className="list-disc list-inside text-sm text-gray-400">
                      {r.redFlags.map((f, j) => <li key={j}>{f}</li>)}
                    </ul>
                  </div>
                )}
                {r.interviewFocusAreas && r.interviewFocusAreas.length > 0 && (
                  <div className="mb-2">
                    <span className="text-xs font-medium text-gray-500">{(r.recommendation === 'possible_fit' || r.recommendation === 'maybe') ? 'Suggested follow-up questions (if proceeding)' : 'Interview focus'}</span>
                    <ul className="list-disc list-inside text-sm text-gray-400">
                      {r.interviewFocusAreas.map((a, j) => <li key={j}>{a}</li>)}
                    </ul>
                  </div>
                )}
                {r.recommendationReasoning && <p className="text-sm text-gray-500 italic mt-2">{r.recommendationReasoning}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="config-card">
        <h3 className="text-lg font-semibold text-gray-200 mb-2 flex items-center gap-2">
          <Users size={20} />
          Candidate tracker
        </h3>
        <p className="text-sm text-gray-400 mb-4">All screened candidates across roles with scores.</p>
        {candidateTrackerList.length === 0 && !historyLoading && <p className="text-sm text-gray-500">No candidates screened yet.</p>}
        <ul className="space-y-2 max-h-[240px] overflow-y-auto">
          {candidateTrackerList.slice(0, 100).map((item, i) => (
            <li key={`${item.recordId}-${item.name}-${i}`} className="flex flex-wrap items-center justify-between gap-2 p-2 rounded bg-gray-800/50 border border-gray-700 text-sm">
              <span className="font-medium text-gray-200">{item.name}</span>
              <span className="text-gray-500">{item.roleLabel}</span>
              <span className="text-violet-400 font-mono">{typeof item.score100 === 'number' ? `${item.score100}/100` : `${item.score * 10}/100`}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${item.recommendation === 'strong_fit' ? 'bg-green-900/50' : item.recommendation === 'possible_fit' || item.recommendation === 'maybe' ? 'bg-amber-900/50' : 'bg-gray-700'}`}>{recommendationLabel(item.recommendation)}</span>
              <span className="text-gray-500 text-xs">{new Date(item.createdAt).toLocaleDateString()}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="config-card">
        <h3 className="text-lg font-semibold text-gray-200 mb-2 flex items-center gap-2">
          <History size={20} />
          Past screenings
        </h3>
        <p className="text-xs text-amber-200/90 mb-2 rounded-lg bg-amber-900/20 border border-amber-700/40 px-3 py-2">AI score is advisory only, not a final hiring decision.</p>
        <p className="text-sm text-gray-400 mb-4">Easy reference: role, candidates, and score. Download full report as CSV or JSON.</p>
        <button type="button" onClick={loadHistory} disabled={historyLoading} className="btn-secondary mb-4 flex items-center gap-2">
          {historyLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw size={16} />}
          {historyLoading ? 'Loading…' : 'Refresh'}
        </button>
        {history.length === 0 && !historyLoading && <p className="text-sm text-gray-500">No screenings yet. Run a screen above.</p>}
        <ul className="space-y-3">
          {history.map((record) => (
            <li key={record.id} className="p-4 rounded-lg bg-gray-800/50 border border-gray-700 flex flex-wrap gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-white">{record.roleLabel}</span>
                  <span className="text-gray-500 text-sm">{new Date(record.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {(record.candidates || []).map((c, i) => (
                    <span key={i} className="text-sm text-gray-400">
                      {c.name || `Candidate ${i + 1}`}: <span className="text-violet-400 font-mono">{typeof (c as ScreeningResult).score100 === 'number' ? `${(c as ScreeningResult).score100}/100` : `${(c.score ?? 0) * 10}/100`}</span>
                      <span className={`ml-1 text-xs px-1.5 py-0.5 rounded ${c.recommendation === 'strong_fit' ? 'bg-green-900/50' : c.recommendation === 'possible_fit' || c.recommendation === 'maybe' ? 'bg-amber-900/50' : 'bg-gray-700'}`}>
                        {recommendationLabel(c.recommendation)}
                      </span>
                    </span>
                  ))}
                </div>
                <div className="mt-3">
                  <label className="text-xs text-gray-500">Manual notes</label>
                  <div className="flex gap-2 mt-1">
                    <textarea
                      value={manualNotesByRecord[record.id] ?? record.manualNotes ?? ''}
                      onChange={(e) => setManualNotesByRecord((prev) => ({ ...prev, [record.id]: e.target.value }))}
                      placeholder="Add your own notes…"
                      className="config-input w-full min-h-[60px] text-sm"
                      rows={2}
                    />
                    <button type="button" onClick={() => handleSaveManualNotes(record.id, manualNotesByRecord[record.id] ?? record.manualNotes ?? '')} disabled={savingNotesId === record.id} className="btn-secondary text-sm self-end shrink-0">
                      {savingNotesId === record.id ? '…' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {record.jdId && record.candidateIds && record.candidateIds.length > 0 && (
                  <button type="button" onClick={() => handleRerun(record)} disabled={screening} className="btn-secondary flex items-center gap-1 text-sm">
                    <RefreshCw size={14} /> Rerun
                  </button>
                )}
                <a href={`/api/kandidly/history/${record.id}/export?format=csv`} download className="btn-secondary flex items-center gap-1 text-sm">
                  <Download size={14} /> CSV
                </a>
                <a href={`/api/kandidly/history/${record.id}/export?format=json`} download className="btn-secondary flex items-center gap-1 text-sm">
                  <Download size={14} /> JSON
                </a>
              </div>
            </li>
          ))}
        </ul>
      </section>

      </div>
      </div>
    </div>
  );
}
