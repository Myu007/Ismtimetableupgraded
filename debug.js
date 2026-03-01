import { useState } from 'react';
import Head from 'next/head';

const CAMPUS_ID = 7;

const ENDPOINTS_TO_TRY = [
  // Groups endpoints
  { label: 'GetGroups (courseId)', path: 'TimeTable/GetGroups', params: { courseId: 1, campusId: CAMPUS_ID } },
  { label: 'GetGroups (semesterId)', path: 'TimeTable/GetGroups', params: { semesterId: 1, id: CAMPUS_ID } },
  { label: 'IHSM GetGroups', path: 'TimeTable/IHSM_GetGroups', params: { courseId: 1, id: CAMPUS_ID } },
  { label: 'GetGroupsByCourse', path: 'TimeTable/GetGroupsByCourse', params: { courseId: 1, campusId: CAMPUS_ID } },
  // Schedule endpoints
  { label: 'GetStudentSchedule', path: 'TimeTable/GetStudentSchedule', params: { groupId: 1, campusId: CAMPUS_ID } },
  { label: 'StudentSchedule', path: 'TimeTable/StudentSchedule', params: { groupId: 1, id: CAMPUS_ID } },
  { label: 'GetSchedule', path: 'TimeTable/GetSchedule', params: { groupId: 1, campusId: CAMPUS_ID } },
  { label: 'GetWeekSchedule', path: 'TimeTable/GetWeekSchedule', params: { groupId: 1, campusId: CAMPUS_ID } },
  // Generic API
  { label: 'api/groups', path: 'api/groups', params: { courseId: 1 } },
  { label: 'api/schedule', path: 'api/schedule', params: { groupId: 1 } },
];

export default function DebugPage() {
  const [results, setResults] = useState({});
  const [testing, setTesting] = useState(false);

  const testAll = async () => {
    setTesting(true);
    const newResults = {};
    
    for (const ep of ENDPOINTS_TO_TRY) {
      const queryString = new URLSearchParams(ep.params).toString();
      const url = `/api/proxy?path=${ep.path}&${queryString}`;
      try {
        const res = await fetch(url);
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch { data = text; }
        newResults[ep.label] = {
          status: res.status,
          ok: res.ok,
          data: data,
          isUseful: res.ok && (Array.isArray(data) ? data.length > 0 : typeof data === 'object' && data !== null)
        };
      } catch (e) {
        newResults[ep.label] = { status: 'error', error: e.message };
      }
      setResults({ ...newResults });
    }
    setTesting(false);
  };

  return (
    <>
      <Head><title>ISM API Debug</title></Head>
      <div style={{ fontFamily: 'monospace', padding: 20, background: '#0a0e17', color: '#e2e8f0', minHeight: '100vh' }}>
        <h1 style={{ marginBottom: 20, color: '#00d4ff' }}>ISM API Endpoint Discovery</h1>
        <p style={{ marginBottom: 20, color: '#64748b' }}>
          This page tests various API endpoints to find which ones work. Share the results with the developer.
        </p>
        <button
          onClick={testAll}
          disabled={testing}
          style={{
            background: '#7c3aed', color: '#fff', border: 'none', padding: '12px 24px',
            borderRadius: 8, cursor: 'pointer', fontSize: 14, marginBottom: 30
          }}
        >
          {testing ? '⏳ Testing...' : '🔍 Test All Endpoints'}
        </button>

        {Object.entries(results).map(([label, result]) => (
          <div key={label} style={{
            background: result.isUseful ? '#052e16' : '#1f0000',
            border: `1px solid ${result.isUseful ? '#16a34a' : '#7f1d1d'}`,
            borderRadius: 8, padding: 16, marginBottom: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 18 }}>{result.isUseful ? '✅' : '❌'}</span>
              <strong style={{ color: result.isUseful ? '#4ade80' : '#f87171' }}>{label}</strong>
              <span style={{ color: '#64748b', fontSize: 12 }}>HTTP {result.status}</span>
            </div>
            <pre style={{ fontSize: 11, color: '#94a3b8', overflow: 'auto', maxHeight: 200 }}>
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </>
  );
}
