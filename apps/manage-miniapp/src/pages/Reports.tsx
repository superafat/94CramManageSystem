import React, { useState, useMemo } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import '../utils/chart-setup';
import { BRANCH_ID } from '../App';
import { useApi } from '../hooks/useApi';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { PullToRefresh } from '../components/PullToRefresh';
import { useToast } from '../components/Toast';
import { formatCurrency } from '../utils/format';
import { getUserRole } from '../utils/auth';

type Period = 'week' | 'month' | 'semester';

/** Convert period label to YYYY-MM format that the API expects */
function periodToYearMonth(p: Period): string {
  const now = new Date();
  switch (p) {
    case 'week':
    case 'month':
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    case 'semester': {
      // Semester: Jan-Jun → same year Jan, Sep-Dec → same year Sep
      const m = now.getMonth(); // 0-indexed
      const startMonth = m < 7 ? '01' : '09';
      return `${now.getFullYear()}-${startMonth}`;
    }
    default:
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
}

const Reports: React.FC = () => {
  const userRole = getUserRole();
  const [period, setPeriod] = useState<Period>('month');
  const { showToast } = useToast();

  const canViewRevenue = ['superadmin', 'admin', 'staff'].includes(userRole);

  // API expects YYYY-MM format, not "week"/"month"/"semester"
  const apiPeriod = periodToYearMonth(period);

  const { data: rawData, loading, error, refetch } = useApi<any>(
    `/admin/reports/branch/${BRANCH_ID}?period=${apiPeriod}`,
    { retry: true, cacheTime: 2 * 60 * 1000 }
  );

  const handleRefresh = async () => {
    await refetch();
    showToast('success', '報表已更新');
  };

  // Transform API response into displayable data
  const reportData = useMemo(() => {
    if (!rawData) return null;

    const summary = rawData.summary || {};
    const students = rawData.students || [];
    const courseStats = rawData.courseStats || [];

    // Build grade distribution from students
    const gradeDistribution = students.slice(0, 8).map((s: any) => ({
      name: s.name || s.studentName || '?',
      grade: s.avgScore ?? s.avgGrade ?? 0,
    }));

    // Build revenue by course from courseStats or students
    const revenueByClass = courseStats.length > 0
      ? courseStats.map((c: any) => ({
          name: c.courseName || c.name || '?',
          revenue: c.revenue || c.totalRevenue || 0,
        }))
      : students.slice(0, 5).map((s: any) => ({
          name: (s.courses || s.subjects || ['未知'])[0] || '未知',
          revenue: s.revenue || 0,
        }));

    // Build attendance data
    const attendanceData = {
      present: Math.round((summary.avgAttendanceRate || 0) * 100),
      absent: Math.round((1 - (summary.avgAttendanceRate || 0)) * 100),
    };

    // Build risk data
    const churnAlerts = rawData.churnAlerts || [];
    const highRisk = students.filter((s: any) => s.riskLevel === 'high').length + 
                     churnAlerts.filter((a: any) => a.riskLevel === 'high').length;
    const medRisk = students.filter((s: any) => s.riskLevel === 'medium').length +
                    churnAlerts.filter((a: any) => a.riskLevel === 'medium').length;

    return {
      summary: {
        totalStudents: summary.totalStudents || summary.activeStudents || 0,
        avgAttendance: Math.round((summary.avgAttendanceRate || 0) * 100),
        avgGrade: summary.avgGrade || 0,
        totalRevenue: summary.totalRevenue || 0,
        highRisk,
        medRisk,
      },
      gradeDistribution,
      revenueByClass,
      attendanceData,
    };
  }, [rawData]);

  if (loading) {
    return (
      <div style={{ padding: '1rem' }}>
        <LoadingSkeleton type="card" count={3} />
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</p>
        <p style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#c9a9a6' }}>
          載入報表失敗
        </p>
        <p style={{ fontSize: '0.875rem', marginBottom: '1rem', color: '#6b7280' }}>
          {error?.message || '未知錯誤'}
        </p>
        <button
          onClick={() => refetch()}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#8fa89a',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
          }}
        >
          重試
        </button>
      </div>
    );
  }

  const attendanceChartData = {
    labels: ['出席', '缺席'],
    datasets: [{
      data: [reportData.attendanceData.present, reportData.attendanceData.absent],
      backgroundColor: ['#8fa89a', '#c9a9a6'],
      borderWidth: 0,
    }],
  };

  const gradeChartData = {
    labels: reportData.gradeDistribution.map((d: any) => d.name),
    datasets: [{
      label: '平均成績',
      data: reportData.gradeDistribution.map((d: any) => d.grade),
      backgroundColor: ['#94a7b8', '#c9a9a6', '#b8a5c4', '#c4b5a0', '#8fa89a', '#94a7b8', '#c9a9a6', '#b8a5c4'],
      borderRadius: 8,
    }],
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-4">
        {/* Period selector */}
        <div className="flex gap-2">
          {([
            { key: 'week', label: '本週' },
            { key: 'month', label: '本月' },
            { key: 'semester', label: '本學期' },
          ] as const).map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                background: period === p.key ? '#94a7b8' : 'white',
                color: period === p.key ? 'white' : '#6b7280',
                border: '1px solid #94a7b8',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <SummaryCard label="在籍學生" value={`${reportData.summary.totalStudents}人`} color="#8fa89a" />
          <SummaryCard label="平均出席" value={`${reportData.summary.avgAttendance}%`} color={reportData.summary.avgAttendance >= 80 ? '#8fa89a' : '#c9a9a6'} />
          <SummaryCard label="平均成績" value={`${reportData.summary.avgGrade.toFixed(1)}`} color="#94a7b8" />
          {canViewRevenue && (
            <SummaryCard label="總營收" value={formatCurrency(reportData.summary.totalRevenue)} color="#c9a9a6" />
          )}
          {!canViewRevenue && (
            <SummaryCard label="風險人數" value={`${reportData.summary.highRisk}人`} color="#b8a5c4" />
          )}
        </div>

        {/* Risk alert */}
        {reportData.summary.highRisk > 0 && (
          <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: '#c9a9a622', border: '1px solid #c9a9a6' }}>
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-semibold text-sm" style={{ color: '#c9a9a6' }}>
                {reportData.summary.highRisk} 位高風險 · {reportData.summary.medRisk} 位中風險
              </p>
            </div>
          </div>
        )}

        {/* Attendance Chart */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold mb-3" style={{ color: '#4a5568' }}>📊 出席統計</h3>
          <div className="h-48">
            <Doughnut 
              data={attendanceChartData} 
              options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} 
            />
          </div>
        </div>

        {/* Grade Chart */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold mb-3" style={{ color: '#4a5568' }}>📚 學生成績</h3>
          <div className="h-48">
            <Bar 
              data={gradeChartData} 
              options={{ 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, max: 100 } }
              }} 
            />
          </div>
        </div>

        {/* Revenue chart (admin only) */}
        {canViewRevenue && reportData.revenueByClass.length > 0 && reportData.revenueByClass.some((r: any) => r.revenue > 0) && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold mb-3" style={{ color: '#4a5568' }}>💰 課程營收</h3>
            <div className="h-48">
              <Doughnut 
                data={{
                  labels: reportData.revenueByClass.map((r: any) => r.name),
                  datasets: [{
                    data: reportData.revenueByClass.map((r: any) => r.revenue),
                    backgroundColor: ['#c9a9a6', '#94a7b8', '#b8a5c4', '#8fa89a', '#c4b5a0'],
                    borderWidth: 0,
                  }],
                }} 
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} 
              />
            </div>
          </div>
        )}
      </div>
    </PullToRefresh>
  );
};

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="text-xs mb-1" style={{ color: '#6b7280' }}>{label}</div>
      <div className="text-xl font-bold" style={{ color }}>{value}</div>
    </div>
  );
}

export default Reports;
