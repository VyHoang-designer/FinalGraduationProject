import { useState } from 'react';

/**
 * Component hiển thị Đánh giá Đa tiêu chí Toàn diện (Skills, Experience, Projects, Education)
 * theo mô hình Trọng số (Weight) và Mức độ (m = 0..1.0) từ Gemini LLM.
 */
export default function UnifiedCriteriaAssessment({ 
  result, 
  title = "Đánh giá Đa Tiêu chí Toàn diện (Gemini AI)" 
}) {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'skills' | 'experience' | 'projects' | 'education'

  if (!result) return null;

  const pillarScores = result.pillar_scores || result.feature_details?.pillar_scores || {};
  const allCriteria = result.all_criteria_details || result.feature_details?.all_criteria_details;
  const legacySkills = result.skill_details || [];
  const candidateSummary = result.candidate_summary || result.feature_details?.candidate_summary;

  // Xây dựng danh sách tiêu chí theo từng nhóm
  const skillsList = allCriteria?.skills || legacySkills || [];
  const expList = allCriteria?.experience || [];
  const projList = allCriteria?.projects || [];
  const eduList = allCriteria?.education || [];

  const getFilteredList = () => {
    switch (activeTab) {
      case 'skills':
        return skillsList;
      case 'experience':
        return expList;
      case 'projects':
        return projList;
      case 'education':
        return eduList;
      case 'all':
      default:
        return [
          ...skillsList,
          ...expList,
          ...projList,
          ...eduList
        ];
    }
  };

  const displayList = getFilteredList();

  if (!displayList || displayList.length === 0) {
    return null;
  }

  const getPillarLabel = (pillar) => {
    switch (pillar) {
      case 'experience': return { label: 'Kinh nghiệm', icon: '💼', color: '#6366f1' };
      case 'projects': return { label: 'Dự án', icon: '🚀', color: '#0ea5e9' };
      case 'education': return { label: 'Học vấn', icon: '🎓', color: '#8b5cf6' };
      case 'skills':
      default: return { label: 'Kỹ năng', icon: '⚡', color: '#10b981' };
    }
  };

  const getImportanceLabel = (imp) => {
    if (imp === 'supporting') return { text: 'Bổ trợ (x2)', bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' };
    if (imp === 'preferred') return { text: 'Điểm cộng (x1)', bg: '#f8fafc', color: '#475569', border: '#cbd5e1' };
    return { text: 'Cốt lõi (x3)', bg: '#fef2f2', color: '#991b1b', border: '#fecaca' };
  };

  const getLevelBadge = (level, mVal) => {
    const m = typeof mVal === 'number' ? mVal : (typeof level === 'number' ? level / 4.0 : 0);
    const lvlNum = typeof level === 'number' ? level : Math.round(m * 4);

    if (m >= 0.75) {
      return { text: `Mức ${lvlNum} (m=${m})`, bg: '#dcfce7', color: '#15803d' };
    } else if (m >= 0.5) {
      return { text: `Mức ${lvlNum} (m=${m})`, bg: '#e0f2fe', color: '#0369a1' };
    } else if (m >= 0.25) {
      return { text: `Mức ${lvlNum} (m=${m})`, bg: '#fef3c7', color: '#b45309' };
    } else {
      return { text: `Mức 0 (m=0)`, bg: '#fee2e2', color: '#b91c1c' };
    }
  };

  return (
    <div className="unified-criteria-assessment" style={{
      marginTop: '20px',
      background: '#ffffff',
      borderRadius: '12px',
      border: '1px solid #e2e8f0',
      padding: '18px 20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
    }}>
      {/* Tiêu đề & Summary */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🤖</span> {title}
        </h4>
        {pillarScores && Object.keys(pillarScores).length > 0 && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {pillarScores.skills !== undefined && (
              <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '6px', background: '#ecfdf5', color: '#047857', fontWeight: 600 }}>
                ⚡ Kỹ năng: {pillarScores.skills}%
              </span>
            )}
            {pillarScores.experience !== undefined && (
              <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '6px', background: '#eef2ff', color: '#4338ca', fontWeight: 600 }}>
                💼 Kinh nghiệm: {pillarScores.experience}%
              </span>
            )}
            {pillarScores.projects !== undefined && (
              <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '6px', background: '#f0f9ff', color: '#0369a1', fontWeight: 600 }}>
                🚀 Dự án: {pillarScores.projects}%
              </span>
            )}
            {pillarScores.education !== undefined && (
              <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '6px', background: '#faf5ff', color: '#6b21a8', fontWeight: 600 }}>
                🎓 Học vấn: {pillarScores.education}%
              </span>
            )}
          </div>
        )}
      </div>

      {candidateSummary && (
        <div style={{
          marginBottom: '14px',
          padding: '10px 14px',
          background: '#f8fafc',
          borderLeft: '4px solid #3b82f6',
          borderRadius: '4px',
          fontSize: '0.86rem',
          color: '#334155',
          lineHeight: '1.45'
        }}>
          <strong>Đánh giá tóm tắt:</strong> {candidateSummary}
        </div>
      )}

      {/* Tabs Filter */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            border: activeTab === 'all' ? '1px solid #3b82f6' : '1px solid #cbd5e1',
            background: activeTab === 'all' ? '#eff6ff' : '#ffffff',
            color: activeTab === 'all' ? '#1d4ed8' : '#64748b'
          }}
        >
          Tất cả ({skillsList.length + expList.length + projList.length + eduList.length})
        </button>
        {skillsList.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab('skills')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              border: activeTab === 'skills' ? '1px solid #10b981' : '1px solid #cbd5e1',
              background: activeTab === 'skills' ? '#ecfdf5' : '#ffffff',
              color: activeTab === 'skills' ? '#047857' : '#64748b'
            }}
          >
            ⚡ Kỹ năng ({skillsList.length})
          </button>
        )}
        {expList.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab('experience')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              border: activeTab === 'experience' ? '1px solid #6366f1' : '1px solid #cbd5e1',
              background: activeTab === 'experience' ? '#eef2ff' : '#ffffff',
              color: activeTab === 'experience' ? '#4338ca' : '#64748b'
            }}
          >
            💼 Kinh nghiệm ({expList.length})
          </button>
        )}
        {projList.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab('projects')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              border: activeTab === 'projects' ? '1px solid #0ea5e9' : '1px solid #cbd5e1',
              background: activeTab === 'projects' ? '#f0f9ff' : '#ffffff',
              color: activeTab === 'projects' ? '#0369a1' : '#64748b'
            }}
          >
            🚀 Dự án ({projList.length})
          </button>
        )}
        {eduList.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab('education')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              border: activeTab === 'education' ? '1px solid #8b5cf6' : '1px solid #cbd5e1',
              background: activeTab === 'education' ? '#faf5ff' : '#ffffff',
              color: activeTab === 'education' ? '#6b21a8' : '#64748b'
            }}
          >
            🎓 Học vấn ({eduList.length})
          </button>
        )}
      </div>

      {/* Bảng Tiêu chí & Trọng số & Mức độ */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
              <th style={{ padding: '10px 12px', width: '32%' }}>TIÊU CHÍ & TRỌNG SỐ</th>
              <th style={{ padding: '10px 12px', width: '18%' }}>MỨC ĐỘ (M)</th>
              <th style={{ padding: '10px 12px', width: '50%' }}>LÝ DO & BẰNG CHỨNG TỪ CV</th>
            </tr>
          </thead>
          <tbody>
            {displayList.map((item, idx) => {
              const name = item.name || item.skill || 'Tiêu chí';
              const pInfo = getPillarLabel(item.pillar);
              const impInfo = getImportanceLabel(item.importance);
              const lvlInfo = getLevelBadge(item.level, item.m);
              const evidenceList = item.evidence || [];

              return (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                    <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '3px' }}>
                      {name}
                    </div>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: pInfo.color, fontWeight: 500 }}>
                        {pInfo.icon} {pInfo.label}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontWeight: 600,
                        background: impInfo.bg,
                        color: impInfo.color,
                        border: `1px solid ${impInfo.border}`
                      }}>
                        {impInfo.text}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                    <span style={{
                      display: 'inline-block',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: lvlInfo.bg,
                      color: lvlInfo.color
                    }}>
                      {lvlInfo.text}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', verticalAlign: 'top', color: '#475569', lineHeight: '1.4' }}>
                    <div style={{ marginBottom: evidenceList.length > 0 ? '6px' : 0 }}>
                      <strong>Lý do:</strong> {item.reason || 'Không có mô tả'}
                    </div>
                    {evidenceList.length > 0 && evidenceList[0]?.quote && (
                      <div style={{
                        fontStyle: 'italic',
                        color: '#475569',
                        fontSize: '12px',
                        background: '#f8fafc',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        borderLeft: '3px solid #cbd5e1'
                      }}>
                        <strong>Bằng chứng:</strong> "{evidenceList[0].quote}"
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
