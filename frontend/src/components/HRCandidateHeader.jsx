import React from 'react';
import { getAvatarUrl } from '../services/api';

export default function HRCandidateHeader({ candidate, onRunAI, isLoading }) {
  if (!candidate) return null;

  const initials = candidate.full_name
    ? candidate.full_name.split(' ').map(w => w[0]).join('').slice(-2).toUpperCase()
    : 'UV';

  return (
    <div className="candidate-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: '#fff', padding: '20px 24px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
        {/* Avatar */}
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
          color: '#ffffff',
          fontWeight: 800,
          fontSize: '1.2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
          border: '2px solid #ffffff'
        }}>
          {candidate.avatar_url ? (
            <img 
              src={getAvatarUrl(candidate.avatar_url)} 
              alt={candidate.full_name} 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            initials
          )}
        </div>

        <div className="candidate-header__info">
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: '#0f172a', fontWeight: 700 }}>{candidate.full_name}</h2>
          <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '0.95rem' }}>
            ✉ {candidate.email || 'Chưa có email'} {candidate.phone ? `| 📞 ${candidate.phone}` : ''}
          </p>
        </div>
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

