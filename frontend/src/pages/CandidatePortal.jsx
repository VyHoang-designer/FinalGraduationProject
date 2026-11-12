// ==============================================================================
// FILE: frontend/src/pages/CandidatePortal.jsx
// MÔ TẢ: Trang Cổng Thông Tin Ứng Viên (Job list, Banner, Sắp hết hạn)
// ==============================================================================

import { useState, useEffect, useMemo } from 'react';
import CandidateHeader from '../components/CandidateHeader';
import ApplyAIModal from '../components/ApplyAIModal';
import CandidateInterviewModal from '../components/CandidateInterviewModal';
import CVBuilderModal from '../components/CVBuilderModal';
import { fetchJobs, fetchAppliedJobs, fetchCandidateInterviews, getAssetUrl } from '../services/api';

// Helper: tính số ngày còn lại
function daysRemaining(expiredTime) {
  if (!expiredTime) return null;
  const now = new Date();
  const exp = new Date(expiredTime);
  const diff = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
  return diff;
}

const BANNER_IMAGES = [
  { id: 1, src: getAssetUrl('/images/banner.png'), alt: 'Khám phá việc làm IT cùng AI' },
  { id: 2, src: getAssetUrl('/images/banner2.png'), alt: 'Cơ hội nghề nghiệp công nghệ hấp dẫn' },
  { id: 3, src: getAssetUrl('/images/banner3.png'), alt: 'Đánh giá CV chuẩn ATS với AI' },
  { id: 4, src: getAssetUrl('/images/banner4.png'), alt: 'Kết nối việc làm IT hàng đầu' },
];

function JobCard({ job, showExpiry = false, onApplyClick, onContactClick, isApplied = false }) {
  const days = daysRemaining(job.expired_time);
  const isUrgent = days !== null && days <= 7 && days >= 0;
  const isExpired = days !== null && days < 0;

  return (
    <div className={`candidate-job-card ${isUrgent ? 'candidate-job-card--urgent' : ''}`}>
      <div className="candidate-job-card__bookmark">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#cbd5e1" stroke="none">
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
        </svg>
      </div>

      {/* Expiry Badge */}
      {showExpiry && isUrgent && (
        <div className="candidate-job-card__expiry-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          Còn {days} ngày
        </div>
      )}
      {showExpiry && isExpired && (
        <div className="candidate-job-card__expiry-badge candidate-job-card__expiry-badge--expired">
          Đã hết hạn
        </div>
      )}

      <div className="candidate-job-card__logo">
        <img 
          src={getAssetUrl(job.image) || `https://ui-avatars.com/api/?name=${encodeURIComponent(job.department || 'IT')}&background=0284c7&color=fff&size=128`} 
          alt="Company Logo" 
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(job.department || 'IT')}&background=0284c7&color=fff&size=128`;
          }}
        />
      </div>

      <h3 className="candidate-job-card__title" title={job.title}>{job.title}</h3>
      <div className="candidate-job-card__company">{job.department || 'Công ty Công nghệ'}</div>
      
      <div className="candidate-job-card__location">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
        <span>{job.location || 'Hồ Chí Minh'}</span>
      </div>

      <div className="candidate-job-card__tags">
        {(job.required_skills || []).slice(0, 3).map((skill, i) => (
          <span key={i} className="candidate-tag">{typeof skill === 'string' ? skill : skill.skill}</span>
        ))}
        {(job.required_skills || []).length > 3 && (
          <span className="candidate-tag candidate-tag--more">+{job.required_skills.length - 3}</span>
        )}
      </div>

      <div className="candidate-job-card__tags candidate-job-card__tags--meta">
        <span className="candidate-tag candidate-tag--meta">Full-time</span>
        <span className="candidate-tag candidate-tag--meta">{job.required_experience}+ năm KN</span>
        <span className="candidate-tag candidate-tag--meta">CNTT</span>
      </div>

      <div className="candidate-job-card__actions">
        {isApplied ? (
          <button 
            type="button"
            className="candidate-job-card__btn-apply candidate-job-card__btn-apply--applied" 
            disabled
            title="Bạn đã nộp hồ sơ cho vị trí tuyển dụng này"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>Đã ứng tuyển</span>
          </button>
        ) : (
          <button 
            type="button"
            className="candidate-job-card__btn-apply" 
            onClick={() => onApplyClick(job)}
            title="Ứng tuyển ngay & nhận phân tích AI Match"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
              <path d="M5 3v4M3 5h4M19 17v4M17 19h4"/>
            </svg>
            <span>Ứng tuyển AI</span>
          </button>
        )}

        <button
          type="button"
          className="candidate-job-card__btn-contact"
          onClick={() => onContactClick && onContactClick(job)}
          title="Liên hệ & Hỏi đáp với Nhà tuyển dụng về vị trí này"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <span>Liên hệ</span>
        </button>
      </div>
    </div>
  );
}

export default function CandidatePortal({ currentUser, onLogout, onNavigate, autoOpenCVBuilder = false }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobForApply, setSelectedJobForApply] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [interviews, setInterviews] = useState([]);
  const [selectedInterviewForModal, setSelectedInterviewForModal] = useState(null);
  const [isCVBuilderOpen, setIsCVBuilderOpen] = useState(autoOpenCVBuilder);

  // Carousel Banner State
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  // Tự động chuyển đổi ảnh banner sau khoảng 10 giây
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBannerIndex(prev => (prev + 1) % BANNER_IMAGES.length);
    }, 10000);
    return () => clearInterval(timer);
  }, [currentBannerIndex]);

  function handlePrevBanner(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setCurrentBannerIndex(prev => (prev === 0 ? BANNER_IMAGES.length - 1 : prev - 1));
  }

  function handleNextBanner(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setCurrentBannerIndex(prev => (prev + 1) % BANNER_IMAGES.length);
  }
  
  // Danh sách các Job ID đã nộp hồ sơ
  const [appliedJobIds, setAppliedJobIds] = useState(() => {
    try {
      const stored = localStorage.getItem(`applied_jobs_${currentUser?.id || 'guest'}`);
      return new Set(stored ? JSON.parse(stored) : []);
    } catch {
      return new Set();
    }
  });

  async function loadJobs() {
    try {
      const data = await fetchJobs(true);
      setJobs(data);
    } catch (err) {
      console.error("Lỗi khi tải việc làm:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadAppliedJobs() {
    if (!currentUser?.id) return;
    try {
      const data = await fetchAppliedJobs(currentUser.id);
      if (data?.applied_jd_ids) {
        setAppliedJobIds(prev => {
          const merged = new Set([...prev, ...data.applied_jd_ids]);
          localStorage.setItem(`applied_jobs_${currentUser.id}`, JSON.stringify(Array.from(merged)));
          return merged;
        });
      }
    } catch (err) {
      console.error("Lỗi khi tải việc đã ứng tuyển:", err);
    }
  }

  async function loadInterviews() {
    if (!currentUser?.id) return;
    try {
      const data = await fetchCandidateInterviews(currentUser.id);
      setInterviews(data || []);
    } catch (err) {
      console.error("Lỗi khi tải lịch phỏng vấn:", err);
    }
  }

  useEffect(() => {
    loadJobs();
    loadAppliedJobs();
    loadInterviews();
  }, [currentUser?.id]);

  function handleJobApplied(jobId) {
    if (jobId) {
      setAppliedJobIds(prev => {
        const next = new Set([...prev, jobId]);
        const storageKey = `applied_jobs_${currentUser?.id || 'guest'}`;
        localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
        return next;
      });
    }
    loadJobs();
  }

  const filteredJobs = useMemo(() => {
    if (!searchTerm) return jobs;
    const lowerSearch = searchTerm.toLowerCase();
    return jobs.filter(job => 
      (job.title || '').toLowerCase().includes(lowerSearch) ||
      (job.department || '').toLowerCase().includes(lowerSearch) ||
      (job.required_skills || []).some(s => (typeof s === 'string' ? s : s.skill).toLowerCase().includes(lowerSearch)) ||
      (job.location || '').toLowerCase().includes(lowerSearch)
    );
  }, [jobs, searchTerm]);

  // Danh sách công việc sắp hết hạn (<=14 ngày)
  const expiringJobs = useMemo(() => {
    return filteredJobs.filter(job => {
      const days = daysRemaining(job.expired_time);
      return days !== null && days >= 0 && days <= 14;
    }).sort((a, b) => daysRemaining(a.expired_time) - daysRemaining(b.expired_time));
  }, [filteredJobs]);

  function handleSwitchEmployer() {
    onNavigate('jobs');
  }

  // Tìm thư mời phỏng vấn mới nhất mà ứng viên chưa phản hồi
  const latestPendingInterview = useMemo(() => {
    return (interviews || []).find(inv => !inv.interview_info?.candidate_response);
  }, [interviews]);

  return (
    <div className="candidate-portal-layout">
      {/* HEADER */}
      <CandidateHeader 
        currentUser={currentUser} 
        onLogout={onLogout} 
        onSwitchToEmployer={handleSwitchEmployer}
        onNavigateProfile={() => onNavigate('profile')}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        interviews={interviews}
        onSelectInterview={setSelectedInterviewForModal}
        activeNav="jobs"
        onNavigate={onNavigate}
        onOpenCVBuilder={() => setIsCVBuilderOpen(true)}
      />

      <div className="candidate-portal-content">
        {/* BANNER THÔNG BÁO LỊCH PHỎNG VẤN NỔI BẬT */}
        {latestPendingInterview && (
          <div style={{
            margin: '20px 24px 0',
            padding: '16px 22px',
            background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)',
            border: '1px solid #bfdbfe',
            borderRadius: '14px',
            boxShadow: '0 4px 16px rgba(59, 130, 246, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #2563eb, #6366f1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.3rem',
                color: '#ffffff',
                flexShrink: 0,
                boxShadow: '0 4px 10px rgba(99, 102, 241, 0.3)',
              }}>
                🎉
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Thông báo Lời mời Phỏng vấn Mới!
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', marginTop: '2px' }}>
                  Bạn nhận được thư mời phỏng vấn vị trí <span style={{ color: '#4338ca' }}>{latestPendingInterview.job_title}</span>
                </div>
                <div style={{ fontSize: '0.84rem', color: '#475569', marginTop: '3px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <span>🏢 {latestPendingInterview.department}</span>
                  <span>⏰ {latestPendingInterview.interview_info?.scheduled_at ? new Date(latestPendingInterview.interview_info.scheduled_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Chưa định ngày'}</span>
                  <span>📍 {latestPendingInterview.interview_info?.location}</span>
                </div>
              </div>
            </div>

            <button
              className="btn btn--primary"
              onClick={() => setSelectedInterviewForModal(latestPendingInterview)}
              style={{
                padding: '9px 18px',
                fontSize: '0.88rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              <span>Xem & Xác nhận đi phỏng vấn ➔</span>
            </button>
          </div>
        )}

        {/* HERO BANNER CAROUSEL */}
        <div className="candidate-banner banner-container">
          {/* 4 Ảnh banner tự động chuyển đổi & crossfade mượt mà */}
          {BANNER_IMAGES.map((banner, index) => (
            <img 
              key={banner.id}
              src={banner.src} 
              alt={banner.alt} 
              className={`candidate-banner__img ${index === currentBannerIndex ? 'candidate-banner__img--active' : ''}`} 
              onError={(e) => {
                if (!e.currentTarget.src.includes('/image/banner')) {
                  e.currentTarget.src = e.currentTarget.src.replace('/images/banner', '/image/banner');
                }
              }}
            />
          ))}

          {/* Nút chuyển đổi < bên trái */}
          <button
            type="button"
            className="candidate-banner__arrow candidate-banner__arrow--prev"
            onClick={handlePrevBanner}
            aria-label="Banner trước"
            title="Banner trước"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {/* Nút chuyển đổi > bên phải */}
          <button
            type="button"
            className="candidate-banner__arrow candidate-banner__arrow--next"
            onClick={handleNextBanner}
            aria-label="Banner tiếp theo"
            title="Banner tiếp theo"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {/* Dấu chấm chỉ báo (Dots indicator) */}
          <div className="candidate-banner__dots">
            {BANNER_IMAGES.map((_, idx) => (
              <button
                key={idx}
                type="button"
                className={`candidate-banner__dot ${idx === currentBannerIndex ? 'candidate-banner__dot--active' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCurrentBannerIndex(idx);
                }}
                aria-label={`Chuyển tới banner ${idx + 1}`}
                title={`Banner ${idx + 1}`}
              />
            ))}
          </div>
          
          <div className="candidate-banner__actions" style={{ position: 'relative', zIndex: 20 }}>
            <button 
              type="button"
              className="btn-banner btn-banner--white" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsCVBuilderOpen(true);
              }}
              style={{ cursor: 'pointer', zIndex: 25 }}
            >
              ✨ TẠO CV TỰ ĐỘNG CÙNG AI
            </button>
            <button 
              type="button"
              className="btn-banner btn-banner--yellow" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (filteredJobs.length > 0) setSelectedJobForApply(filteredJobs[0]);
              }}
              style={{ cursor: 'pointer', zIndex: 25 }}
            >
              ĐÁNH GIÁ CV BẰNG AI
            </button>
          </div>
        </div>

        {/* SECTION: Việc tuyển gấp */}
        <div className="candidate-section">
          <div className="candidate-section__header">
            <h2 className="candidate-section__title">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              VIỆC TUYỂN GẤP
            </h2>
            <span className="candidate-section__count">{filteredJobs.length} vị trí đang tuyển</span>
          </div>

          {loading ? (
            <div className="candidate-loading">
              <span className="spinner" /> Đang tải danh sách việc làm...
            </div>
          ) : (
            <div className="candidate-job-grid">
              {filteredJobs.map(job => (
                <JobCard 
                  key={job.id} 
                  job={job} 
                  isApplied={appliedJobIds.has(job.id)} 
                  onApplyClick={setSelectedJobForApply}
                  onContactClick={(job) => onNavigate && onNavigate('contact', { job })}
                />
              ))}
            </div>
          )}
        </div>

        {/* SECTION: Sắp hết hạn */}
        {expiringJobs.length > 0 && (
          <div className="candidate-section">
            <div className="candidate-section__header">
              <h2 className="candidate-section__title candidate-section__title--expiring">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                SẮP HẾT HẠN ỨNG TUYỂN
              </h2>
              <div className="candidate-section__alert">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                Hãy nhanh tay ứng tuyển trước khi hết hạn!
              </div>
            </div>
            <div className="candidate-job-grid">
              {expiringJobs.map(job => (
                <JobCard 
                  key={`exp-${job.id}`} 
                  job={job} 
                  showExpiry 
                  isApplied={appliedJobIds.has(job.id)} 
                  onApplyClick={setSelectedJobForApply}
                  onContactClick={(job) => onNavigate && onNavigate('contact', { job })}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedJobForApply && (
        <ApplyAIModal 
          job={selectedJobForApply} 
          currentUser={currentUser}
          onClose={() => setSelectedJobForApply(null)} 
          onApplied={handleJobApplied}
        />
      )}

      {/* MODAL THƯ MỜI PHỎNG VẤN CHO ỨNG VIÊN */}
      {selectedInterviewForModal && (
        <CandidateInterviewModal 
          interview={selectedInterviewForModal}
          onClose={() => setSelectedInterviewForModal(null)}
          onResponded={(matchId, response, note) => {
            setInterviews(prev => prev.map(inv => {
              if (inv.match_id === matchId) {
                return {
                  ...inv,
                  interview_info: {
                    ...inv.interview_info,
                    candidate_response: response,
                    candidate_note: note,
                    status: response,
                  }
                };
              }
              return inv;
            }));
          }}
        />
      )}

      {/* MODAL TẠO CV TỰ ĐỘNG CÙNG AI */}
      <CVBuilderModal 
        isOpen={isCVBuilderOpen}
        onClose={() => setIsCVBuilderOpen(false)}
        currentUser={currentUser}
      />
      
      {/* FOOTER */}
      <footer className="candidate-footer">
        <div className="candidate-footer__inner">
          <div className="candidate-footer__col">
            <div className="candidate-footer__brand">
              <img src={getAssetUrl('/images/logo.png')} alt="AI Matcher Logo" />
              <span>AI MATCHER</span>
            </div>
            <p className="candidate-footer__desc">
              Nền tảng Tuyển dụng Thông minh — Kết nối CV và JD chính xác hơn với Trí tuệ Nhân tạo.
            </p>
            <div className="candidate-footer__social">
              <a href="#" aria-label="Facebook">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>
              <a href="#" aria-label="LinkedIn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
              <a href="#" aria-label="GitHub">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
              </a>
            </div>
          </div>

          <div className="candidate-footer__col">
            <h4>Dành cho Ứng viên</h4>
            <a href="#">Tìm việc làm</a>
            <a href="#" onClick={(e) => { e.preventDefault(); setIsCVBuilderOpen(true); }}>Tạo CV với AI</a>
            <a href="#">Đánh giá CV</a>
            <a href="#">Gợi ý việc làm</a>
          </div>

          <div className="candidate-footer__col">
            <h4>Dành cho Nhà tuyển dụng</h4>
            <a href="#">Đăng tin tuyển dụng</a>
            <a href="#">AI Matching</a>
            <a href="#">Quản lý ứng viên</a>
            <a href="#">Báo cáo tuyển dụng</a>
          </div>

          <div className="candidate-footer__col">
            <h4>Liên hệ</h4>
            <p>📧 support@aimatcher.vn</p>
            <p>📞 +84 8932 995 131</p>
            <p>📍 TP. Hồ Chí Minh, Việt Nam</p>
          </div>
        </div>

        <div className="candidate-footer__bottom">
          <span>© 2026 AI Matcher. All rights reserved.</span>
          <div className="candidate-footer__links">
            <a href="#">Điều khoản sử dụng</a>
            <a href="#">Chính sách bảo mật</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
