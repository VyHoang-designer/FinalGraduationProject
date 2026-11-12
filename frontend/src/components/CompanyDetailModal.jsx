// ==============================================================================
// FILE: frontend/src/components/CompanyDetailModal.jsx
// MÔ TẢ: Modal chi tiết Doanh nghiệp / Công ty tuyển dụng
//         - Xem thông tin văn hóa, phúc lợi, quy mô, địa chỉ
//         - Xem danh sách các việc làm đang mở tuyển dụng của công ty
//         - Cho phép ứng viên ứng tuyển ngay bằng AI
// ==============================================================================

import { useState, useEffect } from 'react';
import { fetchCompanyDetail, getAssetUrl } from '../services/api';

export default function CompanyDetailModal({ companyId, initialCompany, onClose, onApplyJob }) {
  const [company, setCompany] = useState(initialCompany || null);
  const [loading, setLoading] = useState(!initialCompany?.active_jobs);
  const [activeTab, setActiveTab] = useState('about'); // 'about' | 'jobs'

  useEffect(() => {
    if (companyId) {
      loadDetail();
    }
  }, [companyId]);

  async function loadDetail() {
    try {
      setLoading(true);
      const data = await fetchCompanyDetail(companyId);
      setCompany(data);
    } catch (err) {
      console.error('Lỗi tải chi tiết công ty:', err);
    } finally {
      setLoading(false);
    }
  }

  if (!company && loading) {
    return (
      <div className="modal-overlay" onClick={onClose} style={{ zIndex: 12000 }}>
        <div className="modal-content" style={{ maxWidth: '800px', width: '92%', padding: '40px', textAlign: 'center' }}>
          <span className="spinner" style={{ marginBottom: '12px' }} />
          <div>Đang tải thông tin doanh nghiệp...</div>
        </div>
      </div>
    );
  }

  if (!company) return null;

  const jobs = company.active_jobs || [];

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 12000 }}>
      <div 
        className="modal-content"
        style={{
          maxWidth: '860px',
          width: '92%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          borderRadius: '18px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* COVER BANNER */}
        <div style={{ position: 'relative', height: '170px', background: '#0f172a', overflow: 'hidden' }}>
          <img 
            src={getAssetUrl(company.cover_image) || "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&h=400&fit=crop"} 
            alt="Company Cover"
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
          />
          <button 
            className="modal-close" 
            onClick={onClose}
            style={{ position: 'absolute', top: '16px', right: '16px', color: '#ffffff', background: 'rgba(0,0,0,0.4)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
          >
            ✕
          </button>
        </div>

        {/* HEADER INFO WITH OVERLAPPING LOGO */}
        <div style={{ padding: '0 32px 18px', background: '#ffffff', borderBottom: '1px solid #e2e8f0', position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px', marginTop: '-46px', position: 'relative', zIndex: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px' }}>
              {/* Logo */}
              <div style={{
                width: '92px',
                height: '92px',
                borderRadius: '16px',
                background: '#ffffff',
                border: '3px solid #ffffff',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                overflow: 'hidden',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                zIndex: 10,
              }}>
                <img 
                  src={company.logo || `https://ui-avatars.com/api/?name=${company.name}&background=random&size=128`} 
                  alt={company.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              {/* Title & Tagline */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#1e293b' }}>
                    {company.name}
                  </h2>
                  <span style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                    ⭐ {company.rating || 4.8}
                  </span>
                </div>
                <div style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '3px', fontWeight: 500 }}>
                  {company.tagline || 'Doanh nghiệp Công nghệ Tiên phong'}
                </div>
              </div>
            </div>

            {/* Website Link */}
            {company.website && (
              <a 
                href={company.website} 
                target="_blank" 
                rel="noreferrer"
                className="btn btn--outline btn--sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem' }}
              >
                <span>🌐 Website chính thức</span>
                <span>↗</span>
              </a>
            )}
          </div>

          {/* META TAGS */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '16px', fontSize: '0.85rem', color: '#475569' }}>
            <span>🏢 <strong>Lĩnh vực:</strong> {company.industry || 'Công nghệ thông tin'}</span>
            <span>📍 <strong>Trụ sở:</strong> {company.location || 'Chưa cập nhật'}</span>
            <span>👥 <strong>Quy mô:</strong> {company.company_size || '100-500 nhân sự'}</span>
            <span>🔥 <strong>Đang tuyển:</strong> <span style={{ color: '#059669', fontWeight: 700 }}>{jobs.length} vị trí</span></span>
          </div>

          {/* TABS */}
          <div style={{ display: 'flex', gap: '24px', marginTop: '18px', borderBottom: '1px solid #e2e8f0' }}>
            <button
              onClick={() => setActiveTab('about')}
              style={{
                padding: '10px 4px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'about' ? '3px solid #4f46e5' : '3px solid transparent',
                color: activeTab === 'about' ? '#4f46e5' : '#64748b',
                fontWeight: 700,
                fontSize: '0.92rem',
                cursor: 'pointer',
              }}
            >
              🏢 Giới thiệu & Văn hóa
            </button>
            <button
              onClick={() => setActiveTab('jobs')}
              style={{
                padding: '10px 4px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'jobs' ? '3px solid #4f46e5' : '3px solid transparent',
                color: activeTab === 'jobs' ? '#4f46e5' : '#64748b',
                fontWeight: 700,
                fontSize: '0.92rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>💼 Vị trí tuyển dụng</span>
              <span style={{
                background: activeTab === 'jobs' ? '#4f46e5' : '#e2e8f0',
                color: activeTab === 'jobs' ? '#ffffff' : '#475569',
                padding: '1px 7px',
                borderRadius: '10px',
                fontSize: '0.74rem',
                fontWeight: 800,
              }}>
                {jobs.length}
              </span>
            </button>
          </div>
        </div>

        {/* BODY SCROLL */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', background: '#f8fafc' }}>
          
          {/* TAB 1: ABOUT */}
          {activeTab === 'about' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Giới thiệu */}
              <div style={{ background: '#ffffff', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>
                  📖 Giới thiệu Doanh nghiệp
                </h4>
                <p style={{ margin: 0, fontSize: '0.92rem', color: '#475569', lineHeight: '1.65' }}>
                  {company.description || 'Chưa cập nhật mô tả chi tiết cho doanh nghiệp này.'}
                </p>
              </div>

              {/* Chế độ đãi ngộ & Phúc lợi */}
              {company.benefits && company.benefits.length > 0 && (
                <div style={{ background: '#ffffff', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>
                    🎁 Quyền lợi & Phúc lợi tiêu biểu
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                    {company.benefits.map((b, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 14px',
                        background: '#f8fafc',
                        borderRadius: '10px',
                        fontSize: '0.88rem',
                        color: '#334155',
                        border: '1px solid #f1f5f9'
                      }}>
                        <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span>
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: JOBS */}
          {activeTab === 'jobs' && (
            <div>
              {jobs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', background: '#ffffff', borderRadius: '14px', border: '1px dashed #cbd5e1' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📭</div>
                  <h4 style={{ margin: '0 0 4px', color: '#334155' }}>Hiện tại chưa có vị trí mở tuyển</h4>
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem' }}>Vui lòng quay lại sau hoặc theo dõi các vị trí tuyển dụng khác.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {jobs.map(job => (
                    <div 
                      key={job.id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '14px',
                        padding: '18px 20px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '14px',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                      }}
                    >
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>
                          {job.title}
                        </h4>
                        <div style={{ fontSize: '0.84rem', color: '#64748b', display: 'flex', gap: '12px', marginTop: '6px', flexWrap: 'wrap' }}>
                          <span>📍 {job.location || company.location || 'Chưa cập nhật'}</span>
                          <span>⏳ {job.required_experience || 0}+ năm KN</span>
                          <span>💼 Toàn thời gian</span>
                        </div>
                        {job.required_skills && job.required_skills.length > 0 && (
                          <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                            {job.required_skills.slice(0, 4).map((sk, i) => (
                              <span key={i} className="candidate-tag" style={{ fontSize: '11px', padding: '2px 8px' }}>
                                {typeof sk === 'string' ? sk : sk.skill}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        className="btn btn--primary"
                        onClick={() => {
                          onClose();
                          if (onApplyJob) onApplyJob(job);
                        }}
                        style={{
                          padding: '9px 18px',
                          fontSize: '0.86rem',
                          fontWeight: 700,
                          background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                          boxShadow: '0 4px 10px rgba(99, 102, 241, 0.25)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Ứng tuyển ngay bằng AI ➔
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div style={{ padding: '14px 32px', background: '#ffffff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn--outline" onClick={onClose} style={{ padding: '8px 22px' }}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
