// ==============================================================================
// FILE: frontend/src/pages/ReportsPage.jsx
// MÔ TẢ: Trang báo cáo tuyển dụng - Dashboard tổng hợp phân tích dữ liệu
// ==============================================================================

import { useState, useEffect, useRef } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ============================================================================
// MINI CHART COMPONENTS (pure SVG, không cần thư viện)
// ============================================================================

/** Bar Chart SVG */
function BarChart({ data, width = 500, height = 220, barColor = '#4f46e5' }) {
  if (!data || data.length === 0) return <div className="report-chart-empty">Chưa có dữ liệu</div>;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const barW = Math.min(60, (width - 60) / data.length - 8);
  const chartH = height - 50;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="report-svg-chart">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
        <g key={i}>
          <line
            x1="50" y1={20 + chartH * (1 - ratio)}
            x2={width - 10} y2={20 + chartH * (1 - ratio)}
            stroke="#e2e8f0" strokeWidth="1"
          />
          <text x="45" y={24 + chartH * (1 - ratio)} textAnchor="end" fill="#64748b" fontSize="11" fontWeight="500">
            {Math.round(maxVal * ratio)}
          </text>
        </g>
      ))}
      {/* Bars */}
      {data.map((d, i) => {
        const bh = (d.value / maxVal) * chartH;
        const x = 55 + i * ((width - 65) / data.length) + ((width - 65) / data.length - barW) / 2;
        const y = 20 + chartH - bh;
        return (
          <g key={i}>
            <defs>
              <linearGradient id={`bar-g-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={barColor} stopOpacity="1" />
                <stop offset="100%" stopColor={barColor} stopOpacity="0.75" />
              </linearGradient>
            </defs>
            <rect x={x} y={y} width={barW} height={bh} rx="6" fill={`url(#bar-g-${i})`}>
              <animate attributeName="height" from="0" to={bh} dur="0.6s" fill="freeze" />
              <animate attributeName="y" from={20 + chartH} to={y} dur="0.6s" fill="freeze" />
            </rect>
            <text x={x + barW / 2} y={y - 6} textAnchor="middle" fill="#0f172a" fontSize="12" fontWeight="700">
              {d.value}
            </text>
            <text
              x={x + barW / 2}
              y={height - 4}
              textAnchor="middle"
              fill="#334155"
              fontSize="11"
              fontWeight="600"
              transform={d.label.length > 6 ? `rotate(-30, ${x + barW / 2}, ${height - 4})` : ''}
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Donut / Pie Chart SVG */
function DonutChart({ data, size = 200, donutWidth = 35 }) {
  if (!data || data.length === 0) return <div className="report-chart-empty">Chưa có dữ liệu</div>;
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div className="report-chart-empty">Chưa có dữ liệu</div>;

  const radius = (size - 20) / 2;
  const innerRadius = radius - donutWidth;
  const cx = size / 2;
  const cy = size / 2;

  let cumulativeAngle = -Math.PI / 2;

  const colors = ['#4f46e5', '#0284c7', '#d97706', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="donut-chart-wrapper">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {data.map((d, i) => {
          const angle = (d.value / total) * 2 * Math.PI;
          const startAngle = cumulativeAngle;
          const endAngle = startAngle + angle;
          cumulativeAngle = endAngle;

          const x1 = cx + radius * Math.cos(startAngle);
          const y1 = cy + radius * Math.sin(startAngle);
          const x2 = cx + radius * Math.cos(endAngle);
          const y2 = cy + radius * Math.sin(endAngle);
          const ix1 = cx + innerRadius * Math.cos(endAngle);
          const iy1 = cy + innerRadius * Math.sin(endAngle);
          const ix2 = cx + innerRadius * Math.cos(startAngle);
          const iy2 = cy + innerRadius * Math.sin(startAngle);

          const largeArc = angle > Math.PI ? 1 : 0;
          const path = [
            `M ${x1} ${y1}`,
            `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
            `L ${ix1} ${iy1}`,
            `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix2} ${iy2}`,
            'Z',
          ].join(' ');

          return (
            <path key={i} d={path} fill={colors[i % colors.length]} opacity="0.95">
              <title>{d.label}: {d.value} ({((d.value / total) * 100).toFixed(1)}%)</title>
            </path>
          );
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" fill="#0f172a" fontSize="22" fontWeight="800">{total}</text>
        <text x={cx} y={cy + 16} textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="600">Tổng</text>
      </svg>
      <div className="donut-legend">
        {data.map((d, i) => (
          <div key={i} className="donut-legend-item">
            <span className="donut-legend-dot" style={{ background: colors[i % colors.length] }} />
            <span className="donut-legend-label">{d.label}</span>
            <span className="donut-legend-val">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Horizontal Pipeline Funnel */
function PipelineFunnel({ data }) {
  const stages = [
    { key: 'applied', label: 'Ứng tuyển', color: '#4338ca', icon: '📋' },
    { key: 'screening', label: 'Sàng lọc', color: '#0891b2', icon: '🔍' },
    { key: 'interview', label: 'Phỏng vấn', color: '#d97706', icon: '🎤' },
    { key: 'offer', label: 'Đề nghị', color: '#7c3aed', icon: '📝' },
    { key: 'hired', label: 'Tuyển dụng', color: '#16a34a', icon: '✅' },
  ];
  const maxVal = Math.max(...stages.map(s => data[s.key] || 0), 1);

  return (
    <div className="pipeline-funnel">
      {stages.map((stage, i) => {
        const val = data[stage.key] || 0;
        const pct = (val / maxVal) * 100;
        return (
          <div key={stage.key} className="pipeline-stage">
            <div className="pipeline-stage-header">
              <span className="pipeline-stage-icon">{stage.icon}</span>
              <span className="pipeline-stage-label">{stage.label}</span>
              <span className="pipeline-stage-count" style={{ color: stage.color }}>{val}</span>
            </div>
            <div className="pipeline-stage-bar-bg">
              <div
                className="pipeline-stage-bar"
                style={{
                  width: `${Math.max(pct, 4)}%`,
                  background: `linear-gradient(90deg, ${stage.color}, ${stage.color}99)`,
                }}
              />
            </div>
            {i < stages.length - 1 && <div className="pipeline-arrow">▸</div>}
          </div>
        );
      })}
    </div>
  );
}

/** Sparkline mini chart for trend */
function SparkLine({ data, width = 300, height = 60, color = '#7c3aed' }) {
  if (!data || data.length < 2) return <div className="report-chart-empty" style={{ height }}>Chưa có dữ liệu xu hướng</div>;
  const maxVal = Math.max(...data.map(d => d.count), 1);
  const minVal = 0;
  const range = maxVal - minVal || 1;
  const padding = 10;
  const w = width - padding * 2;
  const h = height - padding * 2;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * w;
    const y = padding + h - ((d.count - minVal) / range) * h;
    return `${x},${y}`;
  });

  const areaPoints = [...points, `${padding + w},${padding + h}`, `${padding},${padding + h}`];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="report-sparkline">
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints.join(' ')} fill="url(#spark-fill)" />
      <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => {
        const x = padding + (i / (data.length - 1)) * w;
        const y = padding + h - ((d.count - minVal) / range) * h;
        return <circle key={i} cx={x} cy={y} r="3" fill={color} opacity="0.7"><title>{d.date}: {d.count}</title></circle>;
      })}
    </svg>
  );
}


// ============================================================================
// MAIN REPORTS PAGE
// ============================================================================
export default function ReportsPage({ globalSearchTerm }) {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchReportData();
  }, []);

  async function fetchReportData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/api/reports/overview`);
      if (!res.ok) throw new Error('Không thể tải dữ liệu báo cáo');
      const data = await res.json();
      setReportData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="reports-page">
        <div className="reports-loading">
          <div className="reports-loading-spinner" />
          <p>Đang tải báo cáo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reports-page">
        <div className="reports-error">
          <span className="reports-error-icon">⚠️</span>
          <p>{error}</p>
          <button onClick={fetchReportData} className="reports-retry-btn">Thử lại</button>
        </div>
      </div>
    );
  }

  if (!reportData) return null;

  const { summary, pipeline_stats, score_distribution, match_level_distribution, jd_stats, top_candidates, top_skills, application_trend } = reportData;

  // Prepare chart data
  const scoreChartData = Object.entries(score_distribution).map(([label, value]) => ({ label, value }));
  const levelChartData = Object.entries(match_level_distribution).map(([label, value]) => ({ label, value }));
  const skillsChartData = top_skills.map(s => ({ label: s.skill, value: s.count }));

  const tabs = [
    { id: 'overview', label: 'Tổng quan', icon: '📊' },
    { id: 'jobs', label: 'Theo vị trí', icon: '💼' },
    { id: 'candidates', label: 'Ứng viên nổi bật', icon: '⭐' },
    { id: 'skills', label: 'Kỹ năng', icon: '🛠️' },
  ];

  return (
    <div className="reports-page">
      {/* Page Header */}
      <div className="reports-header">
        <div className="reports-header-text">
          <h1 className="reports-title">📊 Báo cáo tuyển dụng</h1>
          <p className="reports-subtitle">Tổng hợp & phân tích dữ liệu tuyển dụng thông minh bằng AI</p>
        </div>
        <button onClick={fetchReportData} className="reports-refresh-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
          Làm mới
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="reports-kpi-grid">
        <div className="kpi-card kpi-card--purple">
          <div className="kpi-icon">💼</div>
          <div className="kpi-info">
            <span className="kpi-value">{summary.active_jobs}</span>
            <span className="kpi-label">Vị trí đang tuyển</span>
          </div>
          <span className="kpi-total">/{summary.total_jobs} tổng</span>
        </div>
        <div className="kpi-card kpi-card--cyan">
          <div className="kpi-icon">👥</div>
          <div className="kpi-info">
            <span className="kpi-value">{summary.total_candidates}</span>
            <span className="kpi-label">Ứng viên</span>
          </div>
        </div>
        <div className="kpi-card kpi-card--amber">
          <div className="kpi-icon">📄</div>
          <div className="kpi-info">
            <span className="kpi-value">{summary.total_applications}</span>
            <span className="kpi-label">Đơn ứng tuyển</span>
          </div>
        </div>
        <div className="kpi-card kpi-card--green">
          <div className="kpi-icon">🎯</div>
          <div className="kpi-info">
            <span className="kpi-value">{summary.avg_match_score}</span>
            <span className="kpi-label">Điểm TB AI</span>
          </div>
        </div>
        <div className="kpi-card kpi-card--rose">
          <div className="kpi-icon">🏢</div>
          <div className="kpi-info">
            <span className="kpi-value">{summary.total_companies}</span>
            <span className="kpi-label">Công ty</span>
          </div>
        </div>
        <div className="kpi-card kpi-card--teal">
          <div className="kpi-icon">📈</div>
          <div className="kpi-info">
            <span className="kpi-value">{summary.interview_rate}%</span>
            <span className="kpi-label">Tỷ lệ phỏng vấn</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="reports-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`reports-tab ${activeTab === tab.id ? 'reports-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="reports-content">
        {activeTab === 'overview' && (
          <div className="reports-overview-grid">
            {/* Pipeline Funnel */}
            <div className="report-card report-card--wide">
              <h3 className="report-card-title">🔄 Pipeline tuyển dụng</h3>
              <PipelineFunnel data={pipeline_stats} />
            </div>

            {/* Score Distribution */}
            <div className="report-card">
              <h3 className="report-card-title">📈 Phân bố điểm AI Matching</h3>
              <BarChart data={scoreChartData} width={420} height={220} barColor="#4f46e5" />
            </div>

            {/* Match Level Donut */}
            <div className="report-card">
              <h3 className="report-card-title">🎯 Mức độ phù hợp</h3>
              <DonutChart data={levelChartData} size={190} />
            </div>

            {/* Application Trend */}
            <div className="report-card report-card--wide">
              <h3 className="report-card-title">📅 Xu hướng ứng tuyển (30 ngày)</h3>
              <SparkLine data={application_trend} width={750} height={100} color="#0284c7" />
              {application_trend.length > 0 && (
                <div className="trend-summary">
                  <span>Tổng: <strong>{application_trend.reduce((s, d) => s + d.count, 0)}</strong> đơn</span>
                  <span>Cao nhất: <strong>{Math.max(...application_trend.map(d => d.count))}</strong>/ngày</span>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'jobs' && (
          <div className="reports-jobs-section">
            <div className="report-card report-card--full">
              <h3 className="report-card-title">💼 Thống kê theo vị trí tuyển dụng</h3>
              {jd_stats.length === 0 ? (
                <div className="report-chart-empty">Chưa có vị trí nào</div>
              ) : (
                <div className="jd-stats-table-wrapper">
                  <table className="jd-stats-table">
                    <thead>
                      <tr>
                        <th>Vị trí</th>
                        <th>Phòng ban</th>
                        <th>Địa điểm</th>
                        <th>Ứng viên</th>
                        <th>Điểm TB</th>
                        <th>Cao nhất</th>
                        <th>Pipeline</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jd_stats.map((jd) => (
                        <tr key={jd.jd_id}>
                          <td className="jd-stats-title">{jd.title}</td>
                          <td>{jd.department || '—'}</td>
                          <td>{jd.location || '—'}</td>
                          <td>
                            <span className="jd-count-badge">{jd.applicant_count}</span>
                          </td>
                          <td>
                            <span className={`score-badge ${jd.avg_score >= 70 ? 'score-high' : jd.avg_score >= 50 ? 'score-mid' : 'score-low'}`}>
                              {jd.avg_score}
                            </span>
                          </td>
                          <td>
                            <span className="score-badge score-high">{jd.max_score}</span>
                          </td>
                          <td>
                            <div className="jd-mini-pipeline">
                              {Object.entries(jd.pipeline).map(([status, count]) => (
                                count > 0 && (
                                  <span key={status} className={`mini-pipe-badge mini-pipe-${status}`} title={status}>
                                    {count}
                                  </span>
                                )
                              ))}
                              {Object.values(jd.pipeline).every(v => v === 0) && <span className="mini-pipe-empty">—</span>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'candidates' && (
          <div className="reports-candidates-section">
            <div className="report-card report-card--full">
              <h3 className="report-card-title">⭐ Top ứng viên nổi bật</h3>
              {top_candidates.length === 0 ? (
                <div className="report-chart-empty">Chưa có ứng viên nào ứng tuyển</div>
              ) : (
                <div className="top-candidates-grid">
                  {top_candidates.map((c, idx) => (
                    <div key={c.cv_id} className="top-candidate-card">
                      <div className="top-candidate-rank">#{idx + 1}</div>
                      <div className="top-candidate-avatar">
                        {c.avatar_url ? (
                          <img src={c.avatar_url} alt={c.full_name} />
                        ) : (
                          <div className="top-candidate-avatar-placeholder">
                            {c.full_name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                        )}
                      </div>
                      <div className="top-candidate-info">
                        <h4 className="top-candidate-name">{c.full_name}</h4>
                        <p className="top-candidate-email">{c.email}</p>
                        <div className="top-candidate-meta">
                          <span>🕐 {c.experience_years} năm KN</span>
                          <span>📄 {c.total_applications} đơn</span>
                        </div>
                      </div>
                      <div className="top-candidate-scores">
                        <div className="top-candidate-score-item">
                          <span className="top-candidate-score-label">Điểm TB</span>
                          <span className={`top-candidate-score-value ${c.avg_score >= 70 ? 'text-green' : c.avg_score >= 50 ? 'text-amber' : 'text-red'}`}>
                            {c.avg_score}
                          </span>
                        </div>
                        <div className="top-candidate-score-item">
                          <span className="top-candidate-score-label">Cao nhất</span>
                          <span className="top-candidate-score-value text-green">{c.best_score}</span>
                        </div>
                      </div>
                      <div className="top-candidate-skills">
                        {(Array.isArray(c.skills) ? c.skills : typeof c.skills === 'string' ? c.skills.split(/[\s,]+/).filter(Boolean) : []).slice(0, 6).map((s, si) => (
                          <span key={si} className="top-candidate-skill">{s}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'skills' && (
          <div className="reports-skills-section">
            <div className="report-card report-card--full">
              <h3 className="report-card-title">🛠️ Kỹ năng được yêu cầu nhiều nhất</h3>
              {skillsChartData.length === 0 ? (
                <div className="report-chart-empty">Chưa có dữ liệu kỹ năng</div>
              ) : (
                <div className="skills-chart-container">
                  <BarChart data={skillsChartData} width={700} height={280} barColor="#06b6d4" />
                  <div className="skills-list">
                    {top_skills.map((s, i) => (
                      <div key={i} className="skill-list-item">
                        <span className="skill-list-rank">#{i + 1}</span>
                        <span className="skill-list-name">{s.skill}</span>
                        <div className="skill-list-bar-bg">
                          <div
                            className="skill-list-bar"
                            style={{ width: `${(s.count / (top_skills[0]?.count || 1)) * 100}%` }}
                          />
                        </div>
                        <span className="skill-list-count">{s.count} JD</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
