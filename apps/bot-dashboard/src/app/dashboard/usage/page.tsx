'use client';

import StatCard from '@/components/ui/StatCard';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import DataTable from '@/components/ui/DataTable';
import {
  usageSummary,
  dailyUsageFixed,
  operationLogs,
  type OperationLog,
} from '@/lib/mock-data';

function BarChart() {
  const data = dailyUsageFixed;
  const maxVal = Math.max(...data.map((d) => Math.max(d.aiCalls, d.apiCalls / 4)));
  const chartHeight = 200;
  const barWidth = 100 / data.length;

  return (
    <div className="bg-white rounded-xl border border-[#d8d3de] p-4 md:p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-[#4b4355]">每日用量趨勢</h2>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#A89BB5]" />
            AI Calls
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-[#7B8FA1]/40" />
            API Calls (÷4)
          </span>
        </div>
      </div>

      {/* SVG Bar Chart */}
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          <svg viewBox={`0 0 1000 ${chartHeight + 40}`} className="w-full" aria-label="每日用量長條圖">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = chartHeight - ratio * chartHeight;
              return (
                <g key={ratio}>
                  <line x1="40" y1={y} x2="990" y2={y} stroke="#d8d3de" strokeWidth="0.5" strokeDasharray={ratio === 0 ? '' : '4,4'} />
                  <text x="35" y={y + 4} textAnchor="end" fill="#7b7387" fontSize="10">
                    {Math.round(maxVal * ratio)}
                  </text>
                </g>
              );
            })}

            {/* Bars */}
            {data.map((d, i) => {
              const x = 45 + (i / data.length) * 940;
              const w = (940 / data.length) * 0.35;
              const aiH = (d.aiCalls / maxVal) * chartHeight;
              const apiH = ((d.apiCalls / 4) / maxVal) * chartHeight;

              return (
                <g key={d.date}>
                  {/* API bar (behind) */}
                  <rect
                    x={x}
                    y={chartHeight - apiH}
                    width={w}
                    height={apiH}
                    rx="2"
                    fill="#7B8FA1"
                    opacity="0.3"
                  />
                  {/* AI bar (front) */}
                  <rect
                    x={x + w + 1}
                    y={chartHeight - aiH}
                    width={w}
                    height={aiH}
                    rx="2"
                    fill="#A89BB5"
                  />
                  {/* Date label (every 5th) */}
                  {i % 5 === 0 && (
                    <text
                      x={x + w}
                      y={chartHeight + 16}
                      textAnchor="middle"
                      fill="#7b7387"
                      fontSize="9"
                    >
                      {d.date}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}

export default function UsagePage() {
  const logColumns = [
    { key: 'time', label: '時間', hideOnMobile: true },
    { key: 'user', label: '用戶' },
    { key: 'intent', label: '意圖' },
    {
      key: 'status',
      label: '狀態',
      render: (row: OperationLog) => (
        <Badge
          variant={row.status === 'success' ? 'success' : 'failed'}
          label={row.status === 'success' ? '✅' : '❌'}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#4b4355]">📊 用量統計</h1>
        <p className="text-sm text-[#7b7387] mt-1">查看 Bot 使用量與操作紀錄</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon="🤖"
          label="本月 AI Calls"
          value={usageSummary.aiCalls}
          trend={`/ ${usageSummary.aiCallsLimit}`}
          color="#A89BB5"
        />
        <StatCard
          icon="📡"
          label="API Calls"
          value={usageSummary.apiCalls.toLocaleString()}
          color="#7B8FA1"
        />
        <StatCard
          icon="✅"
          label="操作成功率"
          value={`${usageSummary.successRate}%`}
          color="#A8B5A2"
        />
        <StatCard
          icon="👥"
          label="活躍用戶"
          value={usageSummary.activeUsers}
          color="#C4A9A1"
        />
      </div>

      {/* Plan Usage Progress */}
      <div className="bg-white rounded-xl border border-[#d8d3de] p-4 md:p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#4b4355] mb-4">方案用量</h2>
        <ProgressBar
          current={usageSummary.aiCalls}
          limit={usageSummary.aiCallsLimit}
          label="AI Calls 用量"
        />
      </div>

      {/* Bar Chart */}
      <BarChart />

      {/* Operation Logs */}
      <div className="bg-white rounded-xl border border-[#d8d3de] p-4 md:p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#4b4355] mb-4">操作紀錄</h2>
        <DataTable<OperationLog & Record<string, unknown>>
          columns={logColumns}
          data={operationLogs as (OperationLog & Record<string, unknown>)[]}
          emptyMessage="尚無操作紀錄"
          mobileCard={(row, i) => (
            <div key={i} className="bg-[#F5F0F7]/50 rounded-lg p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-medium text-[#4b4355] text-sm">{row.intent}</span>
                <Badge
                  variant={row.status === 'success' ? 'success' : 'failed'}
                  label={row.status === 'success' ? '✅' : '❌'}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-[#7b7387]">
                <span>{row.user}</span>
                <span>{row.time}</span>
              </div>
            </div>
          )}
        />
      </div>
    </div>
  );
}
