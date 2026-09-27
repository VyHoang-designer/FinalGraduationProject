import React from 'react';

export default function HRCandidateHeader({ candidate, onRunAI, isLoading }) {
  if (!candidate) return null;

  return (
    <div className="candidate-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
      <div className="candidate-header__info">
        <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a' }}>{candidate.full_name}</h2>
        <p style={{ margin: '5px 0 0', color: '#64748b' }}>{candidate.email} | {candidate.phone || 'Chưa cập nhật SĐT'}</p>
      </div>
      <div className="candidate-header__actions">
        <button 
          className="btn btn--primary" 
          onClick={onRunAI} 
          disabled={isLoading}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          {isLoading ? <span className="spinner spinner--sm" /> : '🪄'}
          {isLoading ? 'Đang phân tích...' : 'Phân tích AI Match (1 CV - N JD)'}
        </button>
      </div>
    </div>
  );
}
