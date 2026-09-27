// ==============================================================================
// FILE: frontend/src/pages/CandidatePortal.jsx
// MÔ TẢ: Trang Cổng Thông Tin Ứng Viên (Job list, Banner, Sắp hết hạn)
// ==============================================================================

import { useState, useEffect, useMemo } from 'react';
import CandidateHeader from '../components/CandidateHeader';
import ApplyAIModal from '../components/ApplyAIModal';
import { fetchJobs } from '../services/api';

// Helper: tính số ngày còn lại
function daysRemaining(expiredTime) {
  if (!expiredTime) return null;
  const now = new Date();
  const exp = new Date(expiredTime);
  const diff = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
  return diff;
}

function JobCard({ job, showExpiry = false, onApplyClick }) {
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
          src={job.image || `https://ui-avatars.com/api/?name=${job.department || 'IT'}&background=random&size=128`} 
          alt="Company Logo" 
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
          <span key={i} className="candidate-tag">{skill}</span>
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

      <button className="candidate-job-card__apply" onClick={() => onApplyClick(job)}>
        Ứng tuyển ngay bằng AI
      </button>
    </div>
  );
}

export default function CandidatePortal({ currentUser, onLogout, onNavigate }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJobForApply, setSelectedJobForApply] = useState(null);

  useEffect(() => {
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
    loadJobs();
  }, []);

  // Danh sách công việc sắp hết hạn (<=14 ngày)
  const expiringJobs = useMemo(() => {
    return jobs.filter(job => {
      const days = daysRemaining(job.expired_time);
      return days !== null && days >= 0 && days <= 14;
    }).sort((a, b) => daysRemaining(a.expired_time) - daysRemaining(b.expired_time));
  }, [jobs]);

  function handleSwitchEmployer() {
    onNavigate('jobs');
  }

  return (
    <div className="candidate-portal-layout">
      {/* HEADER */}
      <CandidateHeader 
        currentUser={currentUser} 
        onLogout={onLogout} 
        onSwitchToEmployer={handleSwitchEmployer} 
      />

      <div className="candidate-portal-content">
        {/* HERO BANNER */}
        <div className="candidate-banner">
          <img src="/images/banner.png" alt="Khám phá việc làm IT cùng AI" className="candidate-banner__img" />
          
          <div className="candidate-banner__actions">
            <button className="btn-banner btn-banner--white">TẠO CV TỰ ĐỘNG CÙNG AI</button>
            <button className="btn-banner btn-banner--yellow">ĐÁNH GIÁ CV BẰNG AI</button>
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
            <span className="candidate-section__count">{jobs.length} vị trí đang tuyển</span>
          </div>

          {loading ? (
            <div className="candidate-loading">
              <span className="spinner" /> Đang tải danh sách việc làm...
            </div>
          ) : (
            <div className="candidate-job-grid">
              {jobs.map(job => <JobCard key={job.id} job={job} onApplyClick={setSelectedJobForApply} />)}
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
              {expiringJobs.map(job => <JobCard key={`exp-${job.id}`} job={job} showExpiry onApplyClick={setSelectedJobForApply} />)}
            </div>
          </div>
        )}
      </div>

      {selectedJobForApply && (
        <ApplyAIModal 
          job={selectedJobForApply} 
          currentUser={currentUser}
          onClose={() => setSelectedJobForApply(null)} 
        />
      )}
      
      {/* FOOTER */}
      <footer className="candidate-footer">
        <div className="candidate-footer__inner">
          <div className="candidate-footer__col">
            <div className="candidate-footer__brand">
              <img src="/images/logo.png" alt="AI Matcher Logo" />
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
            <a href="#">Tạo CV với AI</a>
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
