'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [dataTotals, setDataTotals] = useState({ sourceCount: 0, targetCount: 0 });
  const [plan, setPlan] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [runResult, setRunResult] = useState<any>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [dataRes, planRes, historyRes] = await Promise.all([
        fetch('/api/data'),
        fetch('/api/migration/plan'),
        fetch('/api/migration/history')
      ]);
      
      if (dataRes.ok) setDataTotals(await dataRes.json());
      if (planRes.ok) setPlan(await planRes.json());
      if (historyRes.ok) setHistory(await historyRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  const generatePlan = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const res = await fetch('/api/migration/plan?generate=true');
      if (res.ok) {
        setPlan(await res.json());
      } else {
        const error = await res.json().catch(() => null);
        setActionError(error?.error ?? 'Unable to generate the migration plan.');
      }
    } catch (e) {
      console.error(e);
      setActionError('Unable to reach the migration planner. Check that the dev server is running.');
    }
    setLoading(false);
  };

  const approvePlan = async () => {
    if (!plan) return;
    setLoading(true);
    try {
      const res = await fetch('/api/migration/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: plan.id })
      });
      if (res.ok) {
        await fetchData(); // Refresh state
      } else {
        const error = await res.json().catch(() => null);
        setActionError(error?.error ?? 'Unable to approve the migration plan.');
      }
    } catch (e) {
      console.error(e);
      setActionError('Unable to reach the migration planner.');
    }
    setLoading(false);
  };

  const executeDryRun = async () => {
    if (!plan) return;
    setLoading(true);
    setRunResult(null);
    try {
      const res = await fetch('/api/migration/dry-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id })
      });
      if (res.ok) {
        setRunResult(await res.json());
        await fetchData();
      } else {
        const error = await res.json().catch(() => null);
        setActionError(error?.error ?? 'Unable to run the dry run.');
      }
    } catch (e) {
      console.error(e);
      setActionError('Unable to reach the migration planner.');
    }
    setLoading(false);
  };

  const executeMigration = async () => {
    if (!plan) return;
    setLoading(true);
    setRunResult(null);
    try {
      const res = await fetch('/api/migration/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id })
      });
      if (res.ok) {
        setRunResult(await res.json());
        await fetchData();
      } else {
        const error = await res.json().catch(() => null);
        setActionError(error?.error ?? 'Unable to execute the migration.');
      }
    } catch (e) {
      console.error(e);
      setActionError('Unable to reach the migration planner.');
    }
    setLoading(false);
  };
  
  const rollbackRun = async (runId: number) => {
    setLoading(true);
    try {
      const res = await fetch('/api/migration/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId })
      });
      if (res.ok) {
        await fetchData();
      } else {
        const error = await res.json().catch(() => null);
        setActionError(error?.error ?? 'Unable to roll back the migration.');
      }
    } catch (e) {
      console.error(e);
      setActionError('Unable to reach the migration planner.');
    }
    setLoading(false);
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Agentic Data Migration Planner</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Reconciliation Workbench: HR Employees → SaaS Users
        </p>
      </header>

      <div className="grid-2 mb-8">
        <div className="glass-panel flex-col">
          <h3>Database Overview</h3>
          <div className="flex-between">
            <span>Source Records (Employees):</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--accent)' }}>{dataTotals.sourceCount}</span>
          </div>
          <div className="flex-between">
            <span>Target Records (Users):</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--success)' }}>{dataTotals.targetCount}</span>
          </div>
        </div>

        <div className="glass-panel flex-col">
          <h3>Migration Actions</h3>
          {actionError && (
            <p role="alert" style={{ color: 'var(--danger)' }}>
              {actionError}
            </p>
          )}
          {!plan && (
            <button className="btn" onClick={generatePlan} disabled={loading}>
              {loading ? 'Generating...' : '✨ Generate AI Plan'}
            </button>
          )}
          {plan && (
            <>
              <div className="flex-between">
                <span>Current Plan Version: v{plan.version}</span>
                <span className={`badge badge-${plan.status}`}>{plan.status}</span>
              </div>
              <div className="action-buttons">
                 {plan.status === 'draft' && (
                   <button className="btn btn-success" onClick={approvePlan} disabled={loading}>
                     Approve Plan
                   </button>
                 )}
                 <button className="btn btn-outline" onClick={executeDryRun} disabled={loading}>
                   Run Dry Run
                 </button>
                 {plan.status === 'approved' && (
                   <button className="btn" onClick={executeMigration} disabled={loading}>
                     Execute Migration
                   </button>
                 )}
                 <button className="btn btn-outline" onClick={generatePlan} disabled={loading}>
                   Regenerate Plan
                 </button>
              </div>
            </>
          )}
        </div>
      </div>

      {plan && (
        <div className="glass-panel mb-8">
          <h3>Plan Details & AI Insights</h3>
          <div className="grid-2 mt-4">
             <div>
                <h4 style={{ color: 'var(--warning)', marginBottom: '0.5rem' }}>Risks & Missing Fields</h4>
                <ul style={{ paddingLeft: '1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                   {plan.plan.risks?.map((r: string, i: number) => <li key={i}>{r}</li>)}
                   {plan.plan.missingOrIncompatible?.map((m: string, i: number) => <li key={i}>{m}</li>)}
                </ul>
             </div>
             <div>
                <h4 style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>Clarification Questions</h4>
                <ul style={{ paddingLeft: '1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                   {plan.plan.clarificationQuestions?.map((q: string, i: number) => <li key={i}>{q}</li>)}
                </ul>
             </div>
          </div>
          
          <h4 className="mt-4 mb-4">Proposed Mappings</h4>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Target Field</th>
                  <th>Source Field(s)</th>
                  <th>Transformation</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {plan.plan.mappings?.map((m: any, i: number) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{m.targetField}</td>
                    <td>{m.sourceFields.join(', ')}</td>
                    <td><span className="badge badge-draft">{m.transformation}</span></td>
                    <td style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{m.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {runResult && (
        <div className="glass-panel mb-8" style={{ borderLeft: '4px solid var(--accent)' }}>
           <h3>Run Results (ID: {runResult.runId})</h3>
           <div className="flex-between mt-4" style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
              <div style={{ textAlign: 'center' }}>
                 <div style={{ fontSize: '1.5rem' }}>{runResult.totalSource}</div>
                 <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Source</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                 <div style={{ fontSize: '1.5rem', color: 'var(--accent)' }}>{runResult.transformedCount}</div>
                 <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Transformed</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                 <div style={{ fontSize: '1.5rem', color: 'var(--success)' }}>{runResult.acceptedCount}</div>
                 <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Accepted</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                 <div style={{ fontSize: '1.5rem', color: 'var(--danger)' }}>{runResult.rejectedCount}</div>
                 <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Rejected</div>
              </div>
           </div>

           {runResult.rejectedCount > 0 && (
             <div className="mt-4">
               <h4>Quarantined Records</h4>
               <table className="data-table">
                 <thead>
                   <tr>
                     <th>Source ID</th>
                     <th>Error Details</th>
                     <th>Transformed Attempt</th>
                   </tr>
                 </thead>
                 <tbody>
                   {runResult.logs.filter((l: any) => l.status === 'rejected').map((l: any, i: number) => (
                     <tr key={i}>
                       <td>{l.source_record_id}</td>
                       <td style={{ color: 'var(--danger)', fontSize: '0.9rem' }}>{JSON.parse(l.error_details).join(', ')}</td>
                       <td style={{ fontSize: '0.8rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                         {l.transformed_data_json}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           )}
        </div>
      )}

      <div className="glass-panel">
        <h3>Execution History</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Status</th>
              <th>Date</th>
              <th>Target Inserted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h, i) => (
              <tr key={i}>
                <td>#{h.id}</td>
                <td>{h.run_type}</td>
                <td><span className={`badge badge-${h.status === 'completed' ? 'success' : 'draft'}`}>{h.status}</span></td>
                <td>{new Date(h.started_at).toLocaleString()}</td>
                <td>{h.target_inserted_count}</td>
                <td>
                  {h.run_type === 'execution' && h.status === 'completed' && h.target_inserted_count > 0 && (
                    <button className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }} onClick={() => rollbackRun(h.id)} disabled={loading}>
                      Rollback
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No history yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
