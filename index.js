import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';

const CAMPUS_ID = 7; // IHSM

const SEMESTERS = [
  { value: 1, label: '1st Course · 1st Semester' },
  { value: 2, label: '1st Course · 2nd Semester' },
  { value: 3, label: '2nd Course · 3rd Semester' },
  { value: 4, label: '2nd Course · 4th Semester' },
  { value: 5, label: '3rd Course · 5th Semester' },
  { value: 6, label: '3rd Course · 6th Semester' },
  { value: 7, label: '4th Course · 7th Semester' },
  { value: 8, label: '4th Course · 8th Semester' },
  { value: 9, label: '5th Course · 9th Semester' },
  { value: 10, label: '5th Course · 10th Semester' },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const TIME_SLOTS = [
  { num: 1, time: '08:00–09:30' },
  { num: 2, time: '09:45–11:15' },
  { num: 3, time: '11:30–13:00' },
  { num: 4, time: '13:30–15:00' },
  { num: 5, time: '15:15–16:45' },
  { num: 6, time: '17:00–18:30' },
  { num: 7, time: '18:45–20:15' },
];

const SUBJECT_COLORS = [
  '#E63946', '#2A9D8F', '#E9C46A', '#F4A261', '#264653',
  '#A8DADC', '#457B9D', '#6A4C93', '#52B788', '#D62828',
  '#F77F00', '#023E8A', '#80B918', '#9D4EDD', '#C77DFF',
];

function getColor(subject, colorMap) {
  if (!colorMap[subject]) {
    const idx = Object.keys(colorMap).length % SUBJECT_COLORS.length;
    colorMap[subject] = SUBJECT_COLORS[idx];
  }
  return colorMap[subject];
}

function parseScheduleData(data) {
  if (!data || !Array.isArray(data)) return [];
  return data;
}

export default function Home() {
  const [semester, setSemester] = useState('');
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(false);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [error, setError] = useState('');
  const [colorMap] = useState({});
  const [currentWeek, setCurrentWeek] = useState('odd'); // odd or even
  const [viewMode, setViewMode] = useState('week'); // week or list
  const [lastUpdated, setLastUpdated] = useState(null);

  // Fetch groups when semester changes
  useEffect(() => {
    if (!semester) return;
    setGroupsLoading(true);
    setGroups([]);
    setSelectedGroup('');
    setSchedule([]);
    setError('');

    // Try multiple endpoint patterns
    const tryEndpoints = async () => {
      const endpoints = [
        `/api/proxy?path=TimeTable/GetGroups&courseId=${semester}&campusId=${CAMPUS_ID}`,
        `/api/proxy?path=TimeTable/GetGroups&semesterId=${semester}&id=${CAMPUS_ID}`,
        `/api/proxy?path=api/groups&courseId=${semester}&campusId=${CAMPUS_ID}`,
        `/api/proxy?path=TimeTable/IHSM_GetGroups&courseId=${semester}&id=${CAMPUS_ID}`,
      ];

      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              return data;
            }
            // Handle {data: [...]} format
            if (data && Array.isArray(data.data) && data.data.length > 0) {
              return data.data;
            }
            if (data && Array.isArray(data.groups) && data.groups.length > 0) {
              return data.groups;
            }
          }
        } catch (e) {
          continue;
        }
      }
      return null;
    };

    tryEndpoints().then(data => {
      if (data) {
        setGroups(data);
      } else {
        setError('Could not load groups. The ISM server may be unavailable.');
      }
      setGroupsLoading(false);
    });
  }, [semester]);

  // Fetch schedule when group changes
  const fetchSchedule = useCallback(async (groupId) => {
    if (!groupId) return;
    setLoading(true);
    setError('');

    const today = new Date().toISOString().split('T')[0];

    const endpoints = [
      `/api/proxy?path=TimeTable/GetStudentSchedule&groupId=${groupId}&campusId=${CAMPUS_ID}`,
      `/api/proxy?path=TimeTable/StudentSchedule&groupId=${groupId}&id=${CAMPUS_ID}`,
      `/api/proxy?path=TimeTable/GetSchedule&groupId=${groupId}&campusId=${CAMPUS_ID}&date=${today}`,
      `/api/proxy?path=TimeTable/IHSM_GetSchedule&groupId=${groupId}&id=${CAMPUS_ID}`,
      `/api/proxy?path=api/schedule?groupId=${groupId}&campusId=${CAMPUS_ID}`,
    ];

    let found = false;
    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint);
        if (res.ok) {
          const data = await res.json();
          let scheduleData = null;
          if (Array.isArray(data) && data.length > 0) scheduleData = data;
          else if (data?.data && Array.isArray(data.data)) scheduleData = data.data;
          else if (data?.schedule && Array.isArray(data.schedule)) scheduleData = data.schedule;

          if (scheduleData && scheduleData.length > 0) {
            setSchedule(scheduleData);
            setLastUpdated(new Date());
            found = true;
            break;
          }
        }
      } catch (e) {
        continue;
      }
    }

    if (!found) {
      setError('Could not load schedule. Please try again or check the ISM timetable site directly.');
      setSchedule([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedGroup) fetchSchedule(selectedGroup);
  }, [selectedGroup, fetchSchedule]);

  // Build week grid from schedule
  const buildGrid = () => {
    const grid = {};
    DAYS.forEach(day => { grid[day] = {}; });

    schedule.forEach(item => {
      const day = item.dayName || item.day || item.DayName || item.Day;
      const slotNum = item.lessonNumber || item.number || item.Number || item.LessonNumber || item.num;
      const week = item.weekType || item.week || item.WeekType || item.Week || 'both';

      if (day && slotNum) {
        const dayKey = normDay(day);
        if (dayKey && grid[dayKey] !== undefined) {
          const weekFilter = currentWeek === 'odd' ? ['odd', '1', 'нечет', 'both', 'all', ''] : ['even', '2', 'чет', 'both', 'all', ''];
          const weekLower = String(week).toLowerCase();
          if (weekFilter.some(w => weekLower.includes(w)) || week === null || week === undefined) {
            if (!grid[dayKey][slotNum]) grid[dayKey][slotNum] = [];
            grid[dayKey][slotNum].push(item);
          }
        }
      }
    });
    return grid;
  };

  const normDay = (day) => {
    if (!day) return null;
    const d = String(day).toLowerCase().trim();
    if (d.includes('mon') || d === 'пн' || d === 'понедельник' || d === '1') return 'Monday';
    if (d.includes('tue') || d === 'вт' || d === 'вторник' || d === '2') return 'Tuesday';
    if (d.includes('wed') || d === 'ср' || d === 'среда' || d === '3') return 'Wednesday';
    if (d.includes('thu') || d === 'чт' || d === 'четверг' || d === '4') return 'Thursday';
    if (d.includes('fri') || d === 'пт' || d === 'пятница' || d === '5') return 'Friday';
    if (d.includes('sat') || d === 'сб' || d === 'суббота' || d === '6') return 'Saturday';
    return null;
  };

  const grid = buildGrid();
  const hasSchedule = schedule.length > 0;

  const getGroupLabel = (g) => g.name || g.groupName || g.GroupName || g.Name || g.title || String(g.id || g.Id || g);
  const getGroupId = (g) => g.id || g.Id || g.groupId || g.GroupId || g;

  const getSubject = (item) => item.subject || item.Subject || item.subjectName || item.SubjectName || item.discipline || item.Discipline || '—';
  const getTeacher = (item) => item.teacher || item.Teacher || item.teacherName || item.TeacherName || item.fio || item.Fio || '';
  const getRoom = (item) => item.room || item.Room || item.roomName || item.RoomName || item.audience || item.Audience || '';
  const getLessonType = (item) => item.lessonType || item.LessonType || item.type || item.Type || '';

  return (
    <>
      <Head>
        <title>ISM Timetable — IHSM Schedule</title>
        <meta name="description" content="Fast, beautiful timetable viewer for ISM IHSM students" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>

      <style global jsx>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        
        :root {
          --bg: #0A0E17;
          --surface: #111827;
          --surface2: #1a2332;
          --border: #1f2d42;
          --accent: #00D4FF;
          --accent2: #7C3AED;
          --text: #E2E8F0;
          --text-muted: #64748B;
          --text-dim: #94A3B8;
          --success: #10B981;
          --warning: #F59E0B;
          --radius: 12px;
        }

        html, body {
          background: var(--bg);
          color: var(--text);
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
          overflow-x: hidden;
        }

        ::selection { background: var(--accent); color: #000; }

        .app {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 20px 80px;
        }

        /* Header */
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 0 32px;
          border-bottom: 1px solid var(--border);
          margin-bottom: 36px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .logo-mark {
          width: 44px;
          height: 44px;
          background: linear-gradient(135deg, var(--accent), var(--accent2));
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Space Mono', monospace;
          font-weight: 700;
          font-size: 13px;
          color: #fff;
          letter-spacing: -1px;
          flex-shrink: 0;
        }

        .logo-text h1 {
          font-size: 20px;
          font-weight: 600;
          letter-spacing: -0.5px;
          line-height: 1.1;
        }

        .logo-text p {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 2px;
          font-family: 'Space Mono', monospace;
        }

        .badge {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(0, 212, 255, 0.1);
          border: 1px solid rgba(0, 212, 255, 0.2);
          color: var(--accent);
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-family: 'Space Mono', monospace;
        }

        .badge-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent);
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        /* Selectors */
        .controls {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 32px;
        }

        @media (max-width: 640px) {
          .controls { grid-template-columns: 1fr; }
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .field label {
          font-size: 11px;
          font-family: 'Space Mono', monospace;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .select-wrap {
          position: relative;
        }

        .select-wrap::after {
          content: '▾';
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          pointer-events: none;
          font-size: 14px;
        }

        select {
          width: 100%;
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--text);
          padding: 12px 40px 12px 16px;
          border-radius: var(--radius);
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          appearance: none;
          cursor: pointer;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        select:hover { border-color: #2d4156; }
        select:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px rgba(0,212,255,0.1); }
        select option { background: var(--surface2); }
        select:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Toolbar */
        .toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .toolbar-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .week-toggle {
          display: flex;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          overflow: hidden;
        }

        .week-toggle button {
          padding: 8px 16px;
          font-size: 13px;
          font-family: 'Space Mono', monospace;
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.15s;
        }

        .week-toggle button.active {
          background: var(--accent2);
          color: #fff;
        }

        .view-toggle {
          display: flex;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 8px;
          overflow: hidden;
        }

        .view-toggle button {
          padding: 8px 14px;
          font-size: 13px;
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.15s;
        }

        .view-toggle button.active {
          background: var(--surface2);
          color: var(--text);
        }

        .refresh-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-dim);
          font-size: 13px;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          transition: all 0.15s;
        }

        .refresh-btn:hover { border-color: var(--accent); color: var(--accent); }

        .timestamp {
          font-size: 11px;
          color: var(--text-muted);
          font-family: 'Space Mono', monospace;
        }

        /* Empty state */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 20px;
          text-align: center;
          border: 1px dashed var(--border);
          border-radius: 16px;
          background: var(--surface);
        }

        .empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
          opacity: 0.5;
        }

        .empty-state h2 {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 8px;
          color: var(--text-dim);
        }

        .empty-state p {
          font-size: 14px;
          color: var(--text-muted);
          max-width: 340px;
          line-height: 1.6;
        }

        /* Error */
        .error-banner {
          background: rgba(220, 38, 38, 0.1);
          border: 1px solid rgba(220, 38, 38, 0.3);
          border-radius: 10px;
          padding: 14px 18px;
          color: #FCA5A5;
          font-size: 13px;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        /* Loading */
        .loading-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 12px;
        }

        .skeleton {
          background: linear-gradient(90deg, var(--surface) 25%, var(--surface2) 50%, var(--surface) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 8px;
          height: 80px;
        }

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .loading-spinner {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--text-muted);
          font-size: 14px;
          padding: 40px 0;
          justify-content: center;
        }

        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid var(--border);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        /* WEEK GRID */
        .week-grid {
          display: grid;
          grid-template-columns: 80px repeat(6, 1fr);
          gap: 0;
          border: 1px solid var(--border);
          border-radius: 16px;
          overflow: hidden;
          background: var(--surface);
        }

        .grid-header {
          display: contents;
        }

        .grid-corner {
          background: var(--surface2);
          padding: 14px 10px;
          border-right: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          font-size: 11px;
          color: var(--text-muted);
          font-family: 'Space Mono', monospace;
          text-align: center;
        }

        .grid-day-header {
          background: var(--surface2);
          padding: 14px 10px;
          border-right: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          text-align: center;
        }

        .grid-day-header:last-child { border-right: none; }

        .day-name {
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 1px;
        }

        .day-today .day-name { color: var(--accent); }

        .grid-row {
          display: contents;
        }

        .grid-time {
          background: var(--surface);
          padding: 10px 6px;
          border-right: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
        }

        .grid-row:last-child .grid-time { border-bottom: none; }
        .grid-row:last-child .grid-cell { border-bottom: none; }

        .time-num {
          font-family: 'Space Mono', monospace;
          font-size: 16px;
          font-weight: 700;
          color: var(--text-dim);
          line-height: 1;
        }

        .time-range {
          font-size: 9px;
          color: var(--text-muted);
          font-family: 'Space Mono', monospace;
          line-height: 1.3;
          white-space: pre;
        }

        .grid-cell {
          padding: 6px;
          border-right: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          min-height: 80px;
          position: relative;
        }

        .grid-cell:last-child { border-right: none; }

        .grid-cell.has-class { background: rgba(255,255,255,0.01); }

        .class-card {
          border-radius: 8px;
          padding: 8px 10px;
          height: 100%;
          min-height: 70px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          position: relative;
          overflow: hidden;
          cursor: default;
          transition: transform 0.15s, filter 0.15s;
        }

        .class-card:hover { transform: scale(1.01); filter: brightness(1.1); }

        .class-card::before {
          content: '';
          position: absolute;
          left: 0; top: 0; bottom: 0;
          width: 3px;
          background: rgba(255,255,255,0.4);
          border-radius: 3px 0 0 3px;
        }

        .class-subject {
          font-size: 11px;
          font-weight: 600;
          line-height: 1.3;
          color: #fff;
        }

        .class-type {
          font-size: 9px;
          font-family: 'Space Mono', monospace;
          opacity: 0.8;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .class-meta {
          margin-top: auto;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .class-teacher {
          font-size: 10px;
          opacity: 0.85;
          line-height: 1.2;
        }

        .class-room {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 9px;
          font-family: 'Space Mono', monospace;
          background: rgba(0,0,0,0.2);
          padding: 2px 6px;
          border-radius: 4px;
          opacity: 0.9;
          align-self: flex-start;
        }

        /* LIST VIEW */
        .list-view {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .list-day {
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
        }

        .list-day-header {
          background: var(--surface2);
          padding: 14px 20px;
          display: flex;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid var(--border);
        }

        .list-day-name {
          font-weight: 600;
          font-size: 15px;
        }

        .list-day-count {
          font-size: 11px;
          color: var(--text-muted);
          background: var(--border);
          padding: 2px 8px;
          border-radius: 12px;
          font-family: 'Space Mono', monospace;
        }

        .list-classes {
          display: flex;
          flex-direction: column;
        }

        .list-class-item {
          display: grid;
          grid-template-columns: 80px 4px 1fr auto;
          gap: 16px;
          align-items: center;
          padding: 14px 20px;
          border-bottom: 1px solid var(--border);
          transition: background 0.1s;
        }

        .list-class-item:last-child { border-bottom: none; }
        .list-class-item:hover { background: var(--surface2); }

        .list-time {
          text-align: center;
        }

        .list-time-num {
          font-family: 'Space Mono', monospace;
          font-size: 22px;
          font-weight: 700;
          color: var(--text-dim);
          line-height: 1;
        }

        .list-time-range {
          font-size: 10px;
          color: var(--text-muted);
          font-family: 'Space Mono', monospace;
          margin-top: 2px;
        }

        .list-color-bar {
          width: 4px;
          height: 48px;
          border-radius: 2px;
          flex-shrink: 0;
        }

        .list-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .list-subject {
          font-size: 14px;
          font-weight: 600;
          color: var(--text);
        }

        .list-teacher {
          font-size: 12px;
          color: var(--text-muted);
        }

        .list-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
        }

        .list-room-tag {
          background: var(--surface2);
          border: 1px solid var(--border);
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-family: 'Space Mono', monospace;
          color: var(--text-dim);
        }

        .list-type-tag {
          font-size: 10px;
          font-family: 'Space Mono', monospace;
          padding: 2px 8px;
          border-radius: 12px;
          background: rgba(124, 58, 237, 0.2);
          color: #C4B5FD;
        }

        /* Responsive */
        @media (max-width: 900px) {
          .week-grid {
            grid-template-columns: 50px repeat(6, 1fr);
          }
          .class-teacher, .class-type { display: none; }
          .class-subject { font-size: 10px; }
        }

        @media (max-width: 640px) {
          .week-grid {
            display: none;
          }
          .header { padding: 16px 0 20px; }
        }

        /* Footer */
        .footer {
          text-align: center;
          padding: 32px 0;
          font-size: 12px;
          color: var(--text-muted);
          font-family: 'Space Mono', monospace;
          border-top: 1px solid var(--border);
          margin-top: 48px;
        }

        .footer a { color: var(--accent); text-decoration: none; }
      `}</style>

      <div className="app">
        {/* Header */}
        <header className="header">
          <div className="logo">
            <div className="logo-mark">ISM</div>
            <div className="logo-text">
              <h1>IHSM Timetable</h1>
              <p>International School of Medicine</p>
            </div>
          </div>
          <div className="badge">
            <div className="badge-dot" />
            LIVE · REALTIME
          </div>
        </header>

        {/* Controls */}
        <div className="controls">
          <div className="field">
            <label>Course & Semester</label>
            <div className="select-wrap">
              <select value={semester} onChange={e => setSemester(e.target.value)}>
                <option value="">Select semester...</option>
                {SEMESTERS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label>Group {groupsLoading && <span style={{ marginLeft: 6, opacity: 0.6 }}>Loading...</span>}</label>
            <div className="select-wrap">
              <select
                value={selectedGroup}
                onChange={e => setSelectedGroup(e.target.value)}
                disabled={!semester || groupsLoading || groups.length === 0}
              >
                <option value="">{groups.length === 0 && semester ? 'No groups found' : 'Select group...'}</option>
                {groups.map((g, i) => (
                  <option key={i} value={getGroupId(g)}>{getGroupLabel(g)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="error-banner">
            ⚠️ {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="loading-spinner">
            <div className="spinner" />
            Fetching schedule from ISM servers...
          </div>
        )}

        {/* Toolbar */}
        {hasSchedule && !loading && (
          <div className="toolbar">
            <div className="toolbar-left">
              <div className="week-toggle">
                <button className={currentWeek === 'odd' ? 'active' : ''} onClick={() => setCurrentWeek('odd')}>ODD</button>
                <button className={currentWeek === 'even' ? 'active' : ''} onClick={() => setCurrentWeek('even')}>EVEN</button>
                <button className={currentWeek === 'both' ? 'active' : ''} onClick={() => setCurrentWeek('both')}>ALL</button>
              </div>
              <div className="view-toggle">
                <button className={viewMode === 'week' ? 'active' : ''} onClick={() => setViewMode('week')}>⊞ Week</button>
                <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>≡ List</button>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {lastUpdated && (
                <span className="timestamp">
                  Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              <button className="refresh-btn" onClick={() => fetchSchedule(selectedGroup)}>
                ↻ Refresh
              </button>
            </div>
          </div>
        )}

        {/* Week Grid */}
        {hasSchedule && !loading && viewMode === 'week' && (
          <div className="week-grid">
            {/* Header */}
            <div className="grid-corner">SLOT</div>
            {DAYS.map((day, i) => {
              const today = new Date().getDay(); // 0=Sun
              const dayOfWeek = i + 1; // Mon=1
              const isToday = today === dayOfWeek;
              return (
                <div key={day} className={`grid-day-header ${isToday ? 'day-today' : ''}`}>
                  <div className="day-name">{DAY_SHORT[i]}</div>
                </div>
              );
            })}

            {/* Time slots */}
            {TIME_SLOTS.map(slot => (
              <div key={slot.num} className="grid-row">
                <div className="grid-time">
                  <div className="time-num">{slot.num}</div>
                  <div className="time-range">{slot.time.split('–').join('\n')}</div>
                </div>
                {DAYS.map((day) => {
                  const classes = grid[day]?.[slot.num] || grid[day]?.[String(slot.num)] || [];
                  return (
                    <div key={day} className={`grid-cell ${classes.length > 0 ? 'has-class' : ''}`}>
                      {classes.map((cls, i) => {
                        const subject = getSubject(cls);
                        const color = getColor(subject, colorMap);
                        return (
                          <div
                            key={i}
                            className="class-card"
                            style={{ background: color + '25', borderLeft: `3px solid ${color}` }}
                            title={`${subject}\n${getTeacher(cls)}\nRoom: ${getRoom(cls)}`}
                          >
                            <div className="class-subject" style={{ color: color }}>{subject}</div>
                            {getLessonType(cls) && (
                              <div className="class-type" style={{ color: color }}>{getLessonType(cls)}</div>
                            )}
                            <div className="class-meta">
                              {getTeacher(cls) && <div className="class-teacher">{getTeacher(cls)}</div>}
                              {getRoom(cls) && (
                                <div className="class-room">🚪 {getRoom(cls)}</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {/* List View */}
        {hasSchedule && !loading && viewMode === 'list' && (
          <div className="list-view">
            {DAYS.map(day => {
              const dayClasses = [];
              TIME_SLOTS.forEach(slot => {
                const classes = grid[day]?.[slot.num] || grid[day]?.[String(slot.num)] || [];
                classes.forEach(cls => dayClasses.push({ ...cls, slot }));
              });
              if (dayClasses.length === 0) return null;

              return (
                <div key={day} className="list-day">
                  <div className="list-day-header">
                    <span className="list-day-name">{day}</span>
                    <span className="list-day-count">{dayClasses.length} class{dayClasses.length !== 1 ? 'es' : ''}</span>
                  </div>
                  <div className="list-classes">
                    {dayClasses.map((cls, i) => {
                      const subject = getSubject(cls);
                      const color = getColor(subject, colorMap);
                      return (
                        <div key={i} className="list-class-item">
                          <div className="list-time">
                            <div className="list-time-num">{cls.slot.num}</div>
                            <div className="list-time-range">{cls.slot.time}</div>
                          </div>
                          <div className="list-color-bar" style={{ background: color }} />
                          <div className="list-info">
                            <div className="list-subject" style={{ color }}>{subject}</div>
                            {getTeacher(cls) && <div className="list-teacher">👤 {getTeacher(cls)}</div>}
                          </div>
                          <div className="list-right">
                            {getRoom(cls) && <div className="list-room-tag">{getRoom(cls)}</div>}
                            {getLessonType(cls) && <div className="list-type-tag">{getLessonType(cls)}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!hasSchedule && !loading && !error && (
          <div className="empty-state">
            <div className="empty-icon">📅</div>
            <h2>{!semester ? 'Select a semester' : !selectedGroup ? 'Select your group' : 'No schedule found'}</h2>
            <p>
              {!semester
                ? 'Choose your course and semester to get started.'
                : !selectedGroup
                ? 'Pick your group number to see the timetable.'
                : 'No classes found for this group. Try refreshing or selecting a different week.'}
            </p>
          </div>
        )}

        <footer className="footer">
          <p>ISM IHSM Timetable Viewer · Data sourced from <a href="https://timetable.ism.edu.kg" target="_blank" rel="noopener noreferrer">timetable.ism.edu.kg</a></p>
          <p style={{ marginTop: 6, opacity: 0.5 }}>Always up-to-date · Refreshes on every load</p>
        </footer>
      </div>
    </>
  );
}
