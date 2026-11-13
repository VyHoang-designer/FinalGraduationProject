// ==============================================================================
// FILE: frontend/src/components/CVBuilderModal.jsx
// MÔ TẢ: Modal Tạo CV Tự Động Cùng AI (LLM Gemini) - Wizard & Live A4 Preview
// ==============================================================================

import { useState, useEffect, useRef } from 'react';
import { 
  generateAICV, saveGeneratedCV, fetchMyGeneratedCVs, deleteGeneratedCV, 
  applyGeneratedCVToJob, evaluateGeneratedCVMatch, confirmApplyGeneratedCV, fetchJobs 
} from '../services/api';

const COLOR_THEMES = [
  { id: 'navy', name: 'Navy Blue', primary: '#1e40af', secondary: '#eff6ff', accent: '#3b82f6' },
  { id: 'indigo', name: 'Indigo Tech', primary: '#4f46e5', secondary: '#eef2ff', accent: '#6366f1' },
  { id: 'emerald', name: 'Emerald Pro', primary: '#047857', secondary: '#ecfdf5', accent: '#10b981' },
  { id: 'slate', name: 'Slate Dark', primary: '#334155', secondary: '#f8fafc', accent: '#64748b' },
  { id: 'rose', name: 'Crimson Rose', primary: '#be123c', secondary: '#fff1f2', accent: '#f43f5e' },
];

const SUGGESTED_SKILLS = [
  'React', 'JavaScript', 'TypeScript', 'Node.js', 'Python', 'FastAPI', 
  'PostgreSQL', 'Docker', 'Git', 'HTML/CSS', 'TailwindCSS', 'Redux', 
  'RESTful API', 'SQL', 'MongoDB', 'AWS', 'CI/CD', 'Figma', 'Agile/Scrum'
];

function safeArray(val) {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string' && val.trim()) return val.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}

export default function CVBuilderModal({ isOpen, onClose, currentUser, targetJob = null }) {
  // Wizard steps: 1: Info & Avatar, 2: Education & Skills, 3: Projects & Exp, 4: Live Editor & Preview
  const [activeStep, setActiveStep] = useState(1);
  const [activeTab, setActiveTab] = useState('wizard'); // 'wizard' | 'saved_cvs'

  // Form State
  const [targetJobTitle, setTargetJobTitle] = useState(targetJob?.title || 'Lập trình viên');
  const [templateId, setTemplateId] = useState('modern'); // 'modern' | 'classic'
  const [colorTheme, setColorTheme] = useState(COLOR_THEMES[0]);
  const [cvTitle, setCvTitle] = useState('CV - ' + (targetJob?.title || 'Lập trình viên'));
  const [cvLanguage, setCvLanguage] = useState('vi');

  // Personal Info & Avatar
  const [personalInfo, setPersonalInfo] = useState({
    full_name: currentUser?.full_name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    address: 'TP. Hồ Chí Minh',
    avatar_url: currentUser?.avatar_url || '',
    show_avatar: true,
    links: ['github.com/profile', 'linkedin.com/in/profile']
  });

  const [rawSummary, setRawSummary] = useState('');
  
  // Education
  const [education, setEducation] = useState([
    { school: 'Đại học Bách Khoa TP.HCM', major: 'Công nghệ Thông tin', graduation_year: '2026', gpa: '3.4/4.0' }
  ]);

  // Skills
  const [skills, setSkills] = useState(['JavaScript', 'React', 'Python', 'FastAPI', 'PostgreSQL', 'Git']);
  const [skillInput, setSkillInput] = useState('');

  // Projects
  const [projects, setProjects] = useState([
    {
      id: 'proj_1',
      name: 'Website Tuyển dụng AI Matcher',
      technologies: ['React', 'FastAPI', 'PostgreSQL'],
      my_role: 'Full-stack & AI API',
      tasks: 'Thiết kế giao diện người dùng và viết API đối sánh CV ứng viên tự động',
      result: 'Hệ thống vận hành trơn tru với phản hồi dưới 150ms'
    }
  ]);

  // Experiences
  const [experiences, setExperiences] = useState([]);

  // LLM State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState('');
  const [generatedData, setGeneratedData] = useState(null);
  const [currentCVId, setCurrentCVId] = useState(null);

  // Saved CVs List
  const [savedCVs, setSavedCVs] = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Fallback lấy userId từ localStorage nếu prop currentUser chưa kịp truyền
  const effectiveUserId = currentUser?.id || (() => {
    try {
      const saved = localStorage.getItem('aimatcher_current_user');
      return saved ? JSON.parse(saved)?.id : null;
    } catch {
      return null;
    }
  })();

  // Jobs for applying
  const [availableJobs, setAvailableJobs] = useState([]);
  const [selectedApplyJobId, setSelectedApplyJobId] = useState(targetJob?.id || '');
  const [isApplying, setIsApplying] = useState(false);
  const [applySuccessMsg, setApplySuccessMsg] = useState('');

  // AI Matching Evaluation & Apply Confirmation
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [isConfirmApplying, setIsConfirmApplying] = useState(false);
  const [hasAppliedSuccessfully, setHasAppliedSuccessfully] = useState(false);

  // Zoom level for A4 paper preview
  const [zoomLevel, setZoomLevel] = useState(1);
  const printAreaRef = useRef(null);

  // Tải danh sách CV đã lưu ngay khi mở modal hoặc khi tab/user thay đổi
  useEffect(() => {
    if (isOpen) {
      loadSavedCVs();
    }
  }, [isOpen, activeTab, currentUser?.id]);

  useEffect(() => {
    const handleCVUpdate = () => {
      loadSavedCVs();
    };
    window.addEventListener('cv_database_updated', handleCVUpdate);
    return () => {
      window.removeEventListener('cv_database_updated', handleCVUpdate);
    };
  }, [currentUser?.id, effectiveUserId]);

  // Fetch Jobs list for Quick Apply
  useEffect(() => {
    if (isOpen) {
      fetchJobs().then(jobs => setAvailableJobs(jobs || [])).catch(() => {});
    }
  }, [isOpen]);

  async function loadSavedCVs() {
    setLoadingSaved(true);
    try {
      const uId = currentUser?.id || effectiveUserId;
      const res = await fetchMyGeneratedCVs(uId);
      if (res?.success) {
        setSavedCVs(res.cvs || []);
      }
    } catch (e) {
      console.error('Lỗi khi tải danh sách CV đã lưu:', e);
    } finally {
      setLoadingSaved(false);
    }
  }

  // Handle Avatar File Upload
  function handleAvatarFileChange(e) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        alert('Vui lòng chọn ảnh dung lượng dưới 3MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        setPersonalInfo(prev => ({
          ...prev,
          avatar_url: uploadEvent.target.result
        }));
      };
      reader.readAsDataURL(file);
    }
  }

  // Add / Remove Skill
  function handleAddSkill(skillToAdd) {
    const s = (skillToAdd || skillInput).trim();
    if (s && !skills.includes(s)) {
      setSkills(prev => [...prev, s]);
      setSkillInput('');
    }
  }

  function handleRemoveSkill(sToRemove) {
    setSkills(prev => prev.filter(s => s !== sToRemove));
  }

  // Add / Remove / Edit Project
  function handleAddProject() {
    const newProj = {
      id: 'proj_' + Date.now(),
      name: 'Dự án mới',
      technologies: [],
      my_role: 'Thành viên phát triển',
      tasks: '',
      result: ''
    };
    setProjects(prev => [...prev, newProj]);
  }

  function handleRemoveProject(id) {
    setProjects(prev => prev.filter(p => p.id !== id));
  }

  function handleUpdateProject(id, field, value) {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  }

  // Call Gemini AI Generation
  async function handleTriggerAIGenerate() {
    if (!personalInfo.full_name) {
      alert('Vui lòng nhập họ và tên của bạn');
      setActiveStep(1);
      return;
    }

    setIsGenerating(true);
    setGenerateProgress('Đang gửi dữ kiện tới Gemini LLM...');

    const payload = {
      target_job_title: targetJobTitle,
      language: cvLanguage,
      template_id: templateId,
      personal_info: personalInfo,
      raw_summary: rawSummary,
      education: education,
      skills: skills,
      projects: projects,
      experiences: experiences
    };

    try {
      setTimeout(() => setGenerateProgress('Đang tinh chỉnh động từ hành động theo chuẩn STAR...'), 800);
      setTimeout(() => setGenerateProgress('Đang chuẩn hóa phân nhóm kỹ năng chuẩn ATS...'), 1600);

      const res = await generateAICV(payload);
      if (res?.success && res.data) {
        const data = res.data;
        setGeneratedData({
          headline: data.headline || targetJobTitle,
          professional_summary: data.professional_summary,
          skills_categorized: data.skills_categorized || {},
          polished_projects: data.polished_projects || [],
          polished_experiences: data.polished_experiences || [],
          personal_info: personalInfo,
          education: education,
          skills: skills
        });
        setActiveStep(4); // Switch to Live Split Preview & Editor
      } else {
        alert('Không thể tạo nội dung CV. Vui lòng thử lại.');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi tạo CV: ' + (err.message || 'Lỗi kết nối'));
    } finally {
      setIsGenerating(false);
      setGenerateProgress('');
    }
  }

  // Save CV
  async function handleSaveCV(isSilent = false) {
    const silent = typeof isSilent === 'boolean' ? isSilent : false;
    
    // Chuẩn bị dữ liệu nếu chưa qua bước LLM
    const finalDataToSave = generatedData || {
      headline: targetJobTitle,
      professional_summary: rawSummary || `${personalInfo.full_name || 'Ứng viên'} - ${targetJobTitle}`,
      skills_categorized: { 'Kỹ năng': skills },
      polished_projects: projects.map(p => ({
        name: p.name,
        role: p.my_role,
        technologies: p.technologies,
        bullet_points: [p.tasks, p.result].filter(Boolean)
      })),
      polished_experiences: experiences
    };

    setIsSaving(true);
    try {
      const uId = currentUser?.id ? Number(currentUser.id) : (effectiveUserId ? Number(effectiveUserId) : null);
      const payload = {
        user_id: uId,
        title: cvTitle || `CV - ${personalInfo.full_name || targetJobTitle}`,
        language: cvLanguage,
        template_id: templateId,
        target_job_title: targetJobTitle,
        avatar_url: personalInfo.avatar_url,
        raw_input: {
          id: currentCVId,
          personal_info: personalInfo,
          education,
          skills,
          projects,
          experiences
        },
        llm_output: finalDataToSave,
        final_data: {
          ...finalDataToSave,
          personal_info: personalInfo,
          template_id: templateId,
          theme_color: colorTheme.primary
        }
      };

      const res = await saveGeneratedCV(payload);
      if (res?.success) {
        setCurrentCVId(res.cv_id);
        
        // Tải lại ngay danh sách hồ sơ để số lượng bên "Hồ sơ đã lưu" cập nhật cộng lên 1 ngay lập tức
        await loadSavedCVs();
        window.dispatchEvent(new CustomEvent('cv_database_updated'));

        const successMsg = '🎉 Đã lưu CV thành công vào tài khoản của bạn!';
        setToastMessage(successMsg);
        setTimeout(() => setToastMessage(null), 4000);

        if (!silent) {
          alert(successMsg);
        }
        return res.cv_id;
      } else {
        throw new Error(res?.message || 'Không thể lưu CV');
      }
    } catch (err) {
      console.error('Lỗi khi lưu CV:', err);
      const errorMsg = 'Lỗi khi lưu CV: ' + (err.message || 'Không xác định');
      setToastMessage('❌ ' + errorMsg);
      setTimeout(() => setToastMessage(null), 5000);
      if (!silent) alert(errorMsg);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }

  // Load a Saved CV into Editor
  function handleSelectSavedCV(savedItem) {
    try {
      const raw = savedItem.raw_input || {};
      const finalData = savedItem.final_data || savedItem.llm_output || {};

      setCvTitle(savedItem.title);
      setTargetJobTitle(savedItem.target_job_title || 'Lập trình viên');
      setTemplateId(savedItem.template_id || 'modern');
      setCvLanguage(savedItem.language || 'vi');
      setCurrentCVId(savedItem.id);

      if (raw.personal_info) setPersonalInfo(raw.personal_info);
      if (raw.education) setEducation(raw.education);
      if (raw.skills) setSkills(raw.skills);
      if (raw.projects) setProjects(raw.projects);
      if (raw.experiences) setExperiences(raw.experiences);

      setGeneratedData(finalData);
      setActiveTab('wizard');
      setActiveStep(4);
    } catch (e) {
      console.error('Error loading saved CV', e);
    }
  }

  // Delete a Saved CV
  async function handleDeleteSavedCV(e, id) {
    e.stopPropagation();
    if (!window.confirm('Bạn có chắc muốn xóa bản CV này không?')) return;
    try {
      await deleteGeneratedCV(id);
      setSavedCVs(prev => prev.filter(c => c.id !== id));
      if (currentCVId === id) setCurrentCVId(null);
      window.dispatchEvent(new CustomEvent('cv_database_updated'));
    } catch (err) {
      alert('Lỗi xóa CV: ' + err.message);
    }
  }

  // Bước 1: Gọi AI đánh giá độ phù hợp trước khi quyết định nộp
  async function handleStartAIEvaluation() {
    if (!selectedApplyJobId) {
      alert('Vui lòng chọn công việc đang tuyển để AI đánh giá độ phù hợp.');
      return;
    }

    setIsEvaluating(true);
    setEvaluationResult(null);
    setHasAppliedSuccessfully(false);
    try {
      let cvIdToUse = currentCVId;
      if (!cvIdToUse) {
        cvIdToUse = await handleSaveCV(true);
      } else {
        await handleSaveCV(true);
      }

      if (!cvIdToUse) {
        throw new Error('Chưa thể lưu dữ liệu CV để tiến hành đánh giá.');
      }

      const res = await evaluateGeneratedCVMatch(cvIdToUse, selectedApplyJobId);
      if (res?.success) {
        setEvaluationResult(res);
        setShowEvalModal(true);
      }
    } catch (err) {
      alert('Lỗi khi đánh giá AI: ' + err.message);
    } finally {
      setIsEvaluating(false);
    }
  }

  // Bước 2: Xác nhận nộp CV sau khi xem kết quả đánh giá AI
  async function handleConfirmApply() {
    if (!evaluationResult) return;
    setIsConfirmApplying(true);
    try {
      const payload = {
        jd_id: Number(evaluationResult.jd_id),
        cand_cv_id: Number(evaluationResult.cand_cv_id),
        match_score: Number(evaluationResult.match_score),
        match_level: evaluationResult.match_level,
        feature_details: evaluationResult.feature_details,
        custom_criteria_results: evaluationResult.custom_criteria_results,
        skill_details: evaluationResult.skill_details,
      };

      const res = await confirmApplyGeneratedCV(evaluationResult.cv_id, payload);
      if (res?.success) {
        setApplySuccessMsg(res.message);
        setHasAppliedSuccessfully(true);
      }
    } catch (err) {
      alert('Lỗi khi nộp CV: ' + err.message);
    } finally {
      setIsConfirmApplying(false);
    }
  }

  // Print / Export PDF A4 chuẩn đúng 1 trang cách ly
  function handlePrintPDF() {
    const printElement = printAreaRef.current;
    if (!printElement) {
      window.print();
      return;
    }

    // 1. Tạo iframe ẩn chuyên dụng để in tách biệt hoàn toàn khỏi cây DOM của ứng dụng
    let iframe = document.getElementById('cv-print-iframe');
    if (iframe) {
      try { document.body.removeChild(iframe); } catch {}
    }
    iframe = document.createElement('iframe');
    iframe.id = 'cv-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    // 2. Clone phần tử trang CV A4 và gỡ bỏ scale preview
    const clone = printElement.cloneNode(true);
    clone.style.transform = 'none';
    clone.style.boxShadow = 'none';
    clone.style.margin = '0';

    // 3. Lấy toàn bộ styles từ document hiện tại
    let styles = '';
    const styleTags = document.querySelectorAll('style, link[rel="stylesheet"]');
    styleTags.forEach(tag => {
      styles += tag.outerHTML;
    });

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${cvTitle || personalInfo.full_name || 'CV'}</title>
          ${styles}
          <style>
            @page {
              size: A4 portrait;
              margin: 0mm !important;
            }
            *, *::before, *::after {
              box-sizing: border-box !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              width: 210mm !important;
              height: 297mm !important;
              max-height: 297mm !important;
              overflow: hidden !important;
              background: #ffffff !important;
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
            }
            .cv-a4-paper {
              width: 210mm !important;
              height: 297mm !important;
              max-height: 297mm !important;
              min-height: 297mm !important;
              overflow: hidden !important;
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
              transform: none !important;
              page-break-after: avoid !important;
              page-break-inside: avoid !important;
              break-after: avoid !important;
              break-inside: avoid !important;
              box-sizing: border-box !important;
            }
            /* Đảm bảo layout 1 trang chuẩn không bị tràn qua trang 2 */
            .cv-modern-grid {
              height: 297mm !important;
              max-height: 297mm !important;
              min-height: 297mm !important;
              overflow: hidden !important;
            }
            .cv-modern-sidebar {
              padding: 16mm 6mm 12mm 6mm !important;
              gap: 12px !important;
              height: 297mm !important;
              max-height: 297mm !important;
              box-sizing: border-box !important;
            }
            .cv-modern-main {
              padding: 16mm 8mm 12mm 8mm !important;
              gap: 12px !important;
              height: 297mm !important;
              max-height: 297mm !important;
              box-sizing: border-box !important;
            }
            .cv-classic-layout {
              padding: 14mm 14mm !important;
              gap: 10px !important;
              height: 297mm !important;
              max-height: 297mm !important;
              overflow: hidden !important;
              box-sizing: border-box !important;
            }
            .cv-paper-project-item {
              margin-bottom: 6px !important;
            }
            .cv-project-bullets li {
              margin-bottom: 2px !important;
              line-height: 1.35 !important;
            }
            .cv-summary-text {
              line-height: 1.4 !important;
              margin: 4px 0 !important;
            }
          </style>
        </head>
        <body>
          ${clone.outerHTML}
        </body>
      </html>
    `);
    doc.close();

    // 4. In trực tiếp qua iframe
    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (err) {
        console.error('Lỗi khi in qua iframe:', err);
        window.print();
      }
    }, 500);
  }

  if (!isOpen) return null;

  return (
    <div className="cv-modal-backdrop">
      <div className="cv-modal-container" style={{ position: 'relative' }}>
        {/* TOAST THÔNG BÁO NỔI */}
        {toastMessage && (
          <div style={{
            position: 'absolute',
            top: '64px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: toastMessage.includes('❌') ? '#ef4444' : '#10b981',
            color: '#ffffff',
            padding: '10px 24px',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '0.95rem',
            boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'cvFadeIn 0.2s ease-out'
          }}>
            <span>{toastMessage}</span>
          </div>
        )}
        
        {/* MODAL TOPBAR */}
        <header className="cv-modal-topbar">
          <div className="cv-modal-topbar__left">
            <div className="cv-modal-logo">
              <span className="cv-modal-logo__icon">✨</span>
              <div>
                <h2 className="cv-modal-logo__title">AI CV Builder</h2>
                <span className="cv-modal-logo__sub">Chuẩn hóa ATS cùng Gemini</span>
              </div>
            </div>

            {/* TAB TOGGLE: TẠO MỚI / CV ĐÃ LƯU */}
            <div className="cv-modal-tabs">
              <button 
                className={`cv-tab-btn ${activeTab === 'wizard' ? 'active' : ''}`}
                onClick={() => setActiveTab('wizard')}
              >
                Trình soạn thảo
              </button>
              <button 
                className={`cv-tab-btn ${activeTab === 'saved_cvs' ? 'active' : ''}`}
                onClick={() => setActiveTab('saved_cvs')}
              >
                Hồ sơ đã lưu ({savedCVs.length})
              </button>
            </div>
          </div>

          <div className="cv-modal-topbar__right">
            {activeTab === 'wizard' && activeStep === 4 && (
              <>
                <button 
                  className="cv-btn cv-btn--outline" 
                  onClick={() => handleSaveCV(false)} 
                  title="Lưu phiên bản vào tài khoản"
                  disabled={isSaving}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/>
                    <polyline points="7 3 7 8 15 8"/>
                  </svg>
                  {isSaving ? 'Đang lưu...' : 'Lưu CV'}
                </button>

                <button className="cv-btn cv-btn--primary" onClick={handlePrintPDF} title="In hoặc Tải về PDF A4 chuẩn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9V2h12v7"/>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                    <rect x="6" y="14" width="12" height="8"/>
                  </svg>
                  Xuất PDF A4
                </button>
              </>
            )}

            <button className="cv-modal-close-btn" onClick={onClose} title="Đóng modal">
              &times;
            </button>
          </div>
        </header>

        {/* BODY AREA */}
        <div className="cv-modal-body">
          {activeTab === 'saved_cvs' ? (
            /* TAB: HỒ SƠ ĐÃ LƯU */
            <div className="cv-saved-list-container">
              <div className="cv-saved-list__header">
                <h3>Danh sách CV của bạn ({savedCVs.length})</h3>
                <button className="cv-btn cv-btn--primary" onClick={() => { setActiveTab('wizard'); setActiveStep(1); }}>
                  + Tạo thêm bản CV mới
                </button>
              </div>

              {loadingSaved ? (
                <div className="cv-loading-box">Đang tải danh sách CV...</div>
              ) : savedCVs.length === 0 ? (
                <div className="cv-empty-box">
                  <span style={{ fontSize: '40px' }}>📄</span>
                  <p>Bạn chưa có bản CV nào được lưu.</p>
                  <button className="cv-btn cv-btn--primary" onClick={() => { setActiveTab('wizard'); setActiveStep(1); }}>
                    Bắt đầu tạo CV cùng AI
                  </button>
                </div>
              ) : (
                <div className="cv-saved-grid">
                  {savedCVs.map(item => (
                    <div 
                      key={item.id} 
                      className={`cv-saved-card ${currentCVId === item.id ? 'active' : ''}`}
                      onClick={() => handleSelectSavedCV(item)}
                    >
                      <div className="cv-saved-card__thumb">
                        <div className="cv-mini-preview">
                          <span className="cv-mini-line"></span>
                          <span className="cv-mini-line short"></span>
                          <span className="cv-mini-box"></span>
                        </div>
                      </div>
                      <div className="cv-saved-card__info">
                        <h4 className="cv-saved-card__title">{item.title}</h4>
                        <div className="cv-saved-card__meta">
                          <span>{item.target_job_title || 'Chuyên viên IT'}</span> • 
                          <span>{item.template_id === 'modern' ? 'Mẫu Hiện đại' : 'Mẫu Cổ điển'}</span>
                        </div>
                        <span className="cv-saved-card__date">
                          Cập nhật: {new Date(item.updated_at).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                      <div className="cv-saved-card__actions">
                        <button className="cv-btn-icon" onClick={(e) => handleDeleteSavedCV(e, item.id)} title="Xóa bản CV này">
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* TAB: TRÌNH SOẠN THẢO (WIZARD HOẶC LIVE SPLIT VIEW) */
            <>
              {activeStep < 4 ? (
                /* WIZARD FORM 3 BƯỚC */
                <div className="cv-wizard-layout">
                  {/* STEPPER BREADCRUMB */}
                  <div className="cv-stepper">
                    <div className={`cv-step-item ${activeStep >= 1 ? 'completed' : ''} ${activeStep === 1 ? 'current' : ''}`}>
                      <span className="cv-step-number">1</span>
                      <span className="cv-step-label">Thông tin & Ảnh thẻ</span>
                    </div>
                    <div className="cv-step-connector"></div>
                    <div className={`cv-step-item ${activeStep >= 2 ? 'completed' : ''} ${activeStep === 2 ? 'current' : ''}`}>
                      <span className="cv-step-number">2</span>
                      <span className="cv-step-label">Học vấn & Kỹ năng</span>
                    </div>
                    <div className="cv-step-connector"></div>
                    <div className={`cv-step-item ${activeStep >= 3 ? 'completed' : ''} ${activeStep === 3 ? 'current' : ''}`}>
                      <span className="cv-step-number">3</span>
                      <span className="cv-step-label">Dự án & Kinh nghiệm</span>
                    </div>
                  </div>

                  {/* FORM CONTENT */}
                  <div className="cv-wizard-card">
                    {/* BƯỚC 1: THÔNG TIN & AVATAR */}
                    {activeStep === 1 && (
                      <div className="cv-step-content">
                        <div className="cv-step-header">
                          <h3>1. Thiết lập Vị trí Mục tiêu & Thông tin Cá nhân</h3>
                          <p>Dữ liệu này sẽ là tiêu đề cốt lõi trên hồ sơ của bạn.</p>
                        </div>

                        <div className="cv-form-row">
                          <div className="cv-form-group flex-2">
                            <label>Tên Bản CV</label>
                            <input 
                              type="text" 
                              className="cv-input" 
                              value={cvTitle} 
                              onChange={e => setCvTitle(e.target.value)} 
                              placeholder="VD: CV Frontend Developer - 2026"
                            />
                          </div>
                          <div className="cv-form-group flex-2">
                            <label>Vị trí Công việc Ứng tuyển Mục tiêu *</label>
                            <input 
                              type="text" 
                              className="cv-input" 
                              value={targetJobTitle} 
                              onChange={e => setTargetJobTitle(e.target.value)} 
                              placeholder="VD: Full-stack Developer / React Specialist"
                            />
                          </div>
                          <div className="cv-form-group flex-1">
                            <label>Ngôn ngữ</label>
                            <select className="cv-input" value={cvLanguage} onChange={e => setCvLanguage(e.target.value)}>
                              <option value="vi">Tiếng Việt</option>
                              <option value="en">English</option>
                            </select>
                          </div>
                        </div>

                        {/* AVATAR UPLOAD & TOGGLE SECTION */}
                        <div className="cv-avatar-section">
                          <div className="cv-avatar-preview-box">
                            {personalInfo.avatar_url ? (
                              <img src={personalInfo.avatar_url} alt="Candidate Avatar" className="cv-avatar-img" />
                            ) : (
                              <div className="cv-avatar-placeholder">
                                <span>{personalInfo.full_name ? personalInfo.full_name.charAt(0).toUpperCase() : 'CV'}</span>
                              </div>
                            )}
                          </div>

                          <div className="cv-avatar-controls">
                            <h4 className="cv-avatar-title">Ảnh Chân dung / Ảnh thẻ của Ứng viên</h4>
                            <p className="cv-avatar-desc">
                              Khuyến khích dùng ảnh chân dung rõ mặt, lịch sự. Hỗ trợ JPG, PNG (tối đa 3MB).
                            </p>

                            <div className="cv-avatar-actions">
                              <label className="cv-btn cv-btn--sm cv-btn--outline" style={{ cursor: 'pointer' }}>
                                📁 Chọn ảnh từ máy
                                <input type="file" accept="image/*" onChange={handleAvatarFileChange} style={{ display: 'none' }} />
                              </label>

                              {personalInfo.avatar_url && (
                                <button 
                                  className="cv-btn cv-btn--sm cv-btn--danger-text"
                                  onClick={() => setPersonalInfo(p => ({ ...p, avatar_url: '' }))}
                                >
                                  Xóa ảnh
                                </button>
                              )}

                              <label className="cv-toggle-label">
                                <input 
                                  type="checkbox" 
                                  checked={personalInfo.show_avatar} 
                                  onChange={e => setPersonalInfo(p => ({ ...p, show_avatar: e.target.checked }))} 
                                />
                                <span className="cv-toggle-text">
                                  <strong>Hiển thị ảnh trên CV</strong> (Tắt nếu muốn tạo CV Pure-ATS theo chuẩn chống định kiến)
                                </span>
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* PERSONAL CONTACTS */}
                        <div className="cv-form-row">
                          <div className="cv-form-group flex-1">
                            <label>Họ và Tên *</label>
                            <input 
                              type="text" 
                              className="cv-input" 
                              value={personalInfo.full_name} 
                              onChange={e => setPersonalInfo({ ...personalInfo, full_name: e.target.value })} 
                              placeholder="VD: Nguyễn Văn A"
                            />
                          </div>
                          <div className="cv-form-group flex-1">
                            <label>Email Liên hệ</label>
                            <input 
                              type="email" 
                              className="cv-input" 
                              value={personalInfo.email} 
                              onChange={e => setPersonalInfo({ ...personalInfo, email: e.target.value })} 
                              placeholder="VD: vana@gmail.com"
                            />
                          </div>
                          <div className="cv-form-group flex-1">
                            <label>Số Điện thoại</label>
                            <input 
                              type="text" 
                              className="cv-input" 
                              value={personalInfo.phone} 
                              onChange={e => setPersonalInfo({ ...personalInfo, phone: e.target.value })} 
                              placeholder="VD: 0901234567"
                            />
                          </div>
                        </div>

                        <div className="cv-form-row">
                          <div className="cv-form-group flex-1">
                            <label>Địa điểm / Tỉnh Thành</label>
                            <input 
                              type="text" 
                              className="cv-input" 
                              value={personalInfo.address} 
                              onChange={e => setPersonalInfo({ ...personalInfo, address: e.target.value })} 
                              placeholder="VD: TP. Hồ Chí Minh"
                            />
                          </div>
                          <div className="cv-form-group flex-2">
                            <label>Liên kết Chuyên môn (GitHub, LinkedIn, Portfolio)</label>
                            <input 
                              type="text" 
                              className="cv-input" 
                              value={personalInfo.links?.join(', ')} 
                              onChange={e => setPersonalInfo({ ...personalInfo, links: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} 
                              placeholder="github.com/myname, linkedin.com/in/myname"
                            />
                          </div>
                        </div>

                        <div className="cv-form-group">
                          <label>Tóm tắt / Định hướng nghề nghiệp sơ khởi (Tùy chọn)</label>
                          <textarea 
                            rows={2} 
                            className="cv-input" 
                            value={rawSummary} 
                            onChange={e => setRawSummary(e.target.value)} 
                            placeholder="Ghi ngắn gọn 1-2 câu về thế mạnh của bạn. Gemini sẽ trau chuốt lại thành đoạn Summary ấn tượng."
                          />
                        </div>
                      </div>
                    )}

                    {/* BƯỚC 2: HỌC VẤN & KỸ NĂNG */}
                    {activeStep === 2 && (
                      <div className="cv-step-content">
                        <div className="cv-step-header">
                          <h3>2. Học vấn & Kỹ năng Chuyên môn</h3>
                          <p>Khai báo trung thực để AI phân loại các nhóm năng lực theo tiêu chuẩn ATS.</p>
                        </div>

                        {/* HỌC VẤN */}
                        <div className="cv-sub-section">
                          <h4 className="cv-sub-title">🎓 Trình độ Học vấn</h4>
                          {education.map((edu, idx) => (
                            <div key={idx} className="cv-form-row cv-box-card">
                              <div className="cv-form-group flex-2">
                                <label>Trường Đại học / Cao đẳng</label>
                                <input 
                                  type="text" 
                                  className="cv-input" 
                                  value={edu.school} 
                                  onChange={e => {
                                    const next = [...education];
                                    next[idx].school = e.target.value;
                                    setEducation(next);
                                  }} 
                                />
                              </div>
                              <div className="cv-form-group flex-2">
                                <label>Chuyên ngành</label>
                                <input 
                                  type="text" 
                                  className="cv-input" 
                                  value={edu.major} 
                                  onChange={e => {
                                    const next = [...education];
                                    next[idx].major = e.target.value;
                                    setEducation(next);
                                  }} 
                                />
                              </div>
                              <div className="cv-form-group flex-1">
                                <label>Năm Tốt nghiệp</label>
                                <input 
                                  type="text" 
                                  className="cv-input" 
                                  value={edu.graduation_year} 
                                  onChange={e => {
                                    const next = [...education];
                                    next[idx].graduation_year = e.target.value;
                                    setEducation(next);
                                  }} 
                                />
                              </div>
                              <div className="cv-form-group flex-1">
                                <label>GPA (Tùy chọn)</label>
                                <input 
                                  type="text" 
                                  className="cv-input" 
                                  value={edu.gpa} 
                                  onChange={e => {
                                    const next = [...education];
                                    next[idx].gpa = e.target.value;
                                    setEducation(next);
                                  }} 
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* KỸ NĂNG */}
                        <div className="cv-sub-section">
                          <h4 className="cv-sub-title">⚡ Kỹ năng Công nghệ & Công cụ</h4>
                          
                          <div className="cv-skill-input-bar">
                            <input 
                              type="text" 
                              className="cv-input" 
                              placeholder="Nhập kỹ năng rồi bấm Thêm hoặc Enter (VD: React, Docker...)"
                              value={skillInput}
                              onChange={e => setSkillInput(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSkill(); }}}
                            />
                            <button className="cv-btn cv-btn--primary" onClick={() => handleAddSkill()}>
                              + Thêm Kỹ năng
                            </button>
                          </div>

                          {/* TAGS HIỆN TẠI */}
                          <div className="cv-tag-list">
                            {skills.map(s => (
                              <span key={s} className="cv-tag">
                                {s}
                                <button className="cv-tag-remove" onClick={() => handleRemoveSkill(s)}>&times;</button>
                              </span>
                            ))}
                          </div>

                          {/* GỢI Ý KỸ NĂNG PHỔ BIẾN */}
                          <div className="cv-suggested-skills">
                            <span className="cv-suggest-label">Gợi ý nhanh:</span>
                            {SUGGESTED_SKILLS.filter(s => !skills.includes(s)).slice(0, 10).map(s => (
                              <button key={s} className="cv-suggest-chip" onClick={() => handleAddSkill(s)}>
                                + {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* BƯỚC 3: DỰ ÁN & KINH NGHIỆM */}
                    {activeStep === 3 && (
                      <div className="cv-step-content">
                        <div className="cv-step-header">
                          <h3>3. Dự án & Kinh nghiệm Thực tế</h3>
                          <p>Ghi rõ phần việc bạn trực tiếp thực hiện. AI sẽ diễn đạt bằng các động từ hành động mạnh mẽ.</p>
                        </div>

                        {projects.map((proj, idx) => (
                          <div key={proj.id} className="cv-project-card">
                            <div className="cv-project-card__header">
                              <h4>Dự án #{idx + 1}</h4>
                              {projects.length > 1 && (
                                <button className="cv-btn-icon cv-btn-danger" onClick={() => handleRemoveProject(proj.id)}>
                                  Xóa dự án
                                </button>
                              )}
                            </div>

                            <div className="cv-form-row">
                              <div className="cv-form-group flex-2">
                                <label>Tên Dự án *</label>
                                <input 
                                  type="text" 
                                  className="cv-input" 
                                  value={proj.name} 
                                  onChange={e => handleUpdateProject(proj.id, 'name', e.target.value)}
                                  placeholder="VD: Nền tảng tuyển dụng AI Matcher"
                                />
                              </div>
                              <div className="cv-form-group flex-2">
                                <label>Vai trò của bạn *</label>
                                <input 
                                  type="text" 
                                  className="cv-input" 
                                  value={proj.my_role} 
                                  onChange={e => handleUpdateProject(proj.id, 'my_role', e.target.value)}
                                  placeholder="VD: Lập trình viên Backend & API"
                                />
                              </div>
                              <div className="cv-form-group flex-2">
                                <label>Công nghệ sử dụng</label>
                                <input 
                                  type="text" 
                                  className="cv-input" 
                                  value={proj.technologies?.join(', ')} 
                                  onChange={e => handleUpdateProject(proj.id, 'technologies', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                  placeholder="React, FastAPI, PostgreSQL"
                                />
                              </div>
                            </div>

                            <div className="cv-form-group">
                              <label>Bạn trực tiếp làm những việc gì? (Nhiệm vụ cá nhân) *</label>
                              <textarea 
                                rows={2} 
                                className="cv-input" 
                                value={proj.tasks} 
                                onChange={e => handleUpdateProject(proj.id, 'tasks', e.target.value)}
                                placeholder="VD: Thiết kế RESTful API xác thực JWT, kết nối mô hình đối sánh ứng viên, viết unit test..."
                              />
                            </div>

                            <div className="cv-form-group">
                              <label>Kết quả / Thành quả đạt được là gì?</label>
                              <input 
                                type="text" 
                                className="cv-input" 
                                value={proj.result} 
                                onChange={e => handleUpdateProject(proj.id, 'result', e.target.value)}
                                placeholder="VD: Hệ thống chạy mượt mà, phản hồi API dưới 150ms, hoàn thành đúng tiến độ"
                              />
                            </div>
                          </div>
                        ))}

                        <button className="cv-btn cv-btn--outline" onClick={handleAddProject}>
                          + Thêm Dự án Khác
                        </button>
                      </div>
                    )}

                    {/* WIZARD ACTIONS FOOTER */}
                    <div className="cv-wizard-footer">
                      <div>
                        {activeStep > 1 && (
                          <button className="cv-btn cv-btn--outline" onClick={() => setActiveStep(prev => prev - 1)}>
                            ← Quay lại
                          </button>
                        )}
                      </div>

                      <div className="cv-wizard-footer__right">
                        {activeStep < 3 ? (
                          <button className="cv-btn cv-btn--primary" onClick={() => setActiveStep(prev => prev + 1)}>
                            Tiếp tục →
                          </button>
                        ) : (
                          <button 
                            className="cv-btn cv-btn--ai" 
                            onClick={handleTriggerAIGenerate}
                            disabled={isGenerating}
                          >
                            {isGenerating ? (
                              <>
                                <span className="cv-spinner" /> {generateProgress || 'AI đang xử lý...'}
                              </>
                            ) : (
                              '✨ BIÊN TẬP CV CÙNG AI GEMINI'
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* BƯỚC 4: LIVE SPLIT VIEW (SMART EDITOR TRÁI - A4 PREVIEW PHẢI) */
                <div className="cv-split-view">
                  
                  {/* CỘT TRÁI: SMART EDITOR & TOOLBAR */}
                  <div className="cv-editor-column">
                    <div className="cv-editor-toolbar">
                      <div className="cv-toolbar-item">
                        <label>Mẫu CV:</label>
                        <select className="cv-select-sm" value={templateId} onChange={e => setTemplateId(e.target.value)}>
                          <option value="modern">Hiện đại (Modern Tech - 2 Cột)</option>
                          <option value="classic">Tối giản (Classic ATS - 1 Cột)</option>
                        </select>
                      </div>

                      <div className="cv-toolbar-item">
                        <label>Tông màu:</label>
                        <div className="cv-color-picker">
                          {COLOR_THEMES.map(theme => (
                            <button 
                              key={theme.id}
                              className={`cv-color-dot ${colorTheme.id === theme.id ? 'active' : ''}`}
                              style={{ backgroundColor: theme.primary }}
                              onClick={() => setColorTheme(theme)}
                              title={theme.name}
                            />
                          ))}
                        </div>
                      </div>

                      <button className="cv-btn cv-btn--sm cv-btn--outline" onClick={() => setActiveStep(1)}>
                        ⚙️ Sửa Dữ kiện
                      </button>
                    </div>

                    {/* SMART IN-PLACE EDIT ACCORDIONS */}
                    <div className="cv-editor-scroll">
                      {/* Tiêu đề & Tóm tắt */}
                      <div className="cv-edit-card">
                        <h4 className="cv-edit-card__title">🎯 Chức danh & Tóm tắt Nghề nghiệp</h4>
                        <input 
                          type="text" 
                          className="cv-input mb-2" 
                          value={generatedData?.headline || ''}
                          onChange={e => setGeneratedData({ ...generatedData, headline: e.target.value })}
                        />
                        <textarea 
                          rows={4} 
                          className="cv-input" 
                          value={generatedData?.professional_summary || ''}
                          onChange={e => setGeneratedData({ ...generatedData, professional_summary: e.target.value })}
                        />
                      </div>

                      {/* Phân loại Kỹ năng */}
                      <div className="cv-edit-card">
                        <h4 className="cv-edit-card__title">⚡ Kỹ năng Đã Phân Nhóm (ATS)</h4>
                        {generatedData?.skills_categorized && Object.entries(generatedData.skills_categorized).map(([cat, skList]) => (
                          <div key={cat} className="cv-skill-group-row">
                            <strong>{cat}:</strong>
                            <span>{safeArray(skList).join(', ')}</span>
                          </div>
                        ))}
                      </div>

                      {/* Dự án đã biên tập */}
                      <div className="cv-edit-card">
                        <h4 className="cv-edit-card__title">🚀 Dự án (Biên tập theo chuẩn STAR)</h4>
                        {generatedData?.polished_projects?.map((proj, pIdx) => (
                          <div key={proj.ref_id || pIdx} className="cv-edit-project-item">
                            <input 
                              type="text" 
                              className="cv-input-bold mb-1"
                              value={proj.name}
                              onChange={e => {
                                const next = [...generatedData.polished_projects];
                                next[pIdx].name = e.target.value;
                                setGeneratedData({ ...generatedData, polished_projects: next });
                              }}
                            />
                            <div className="cv-bullet-list">
                              {proj.bullet_points?.map((bp, bIdx) => (
                                <textarea 
                                  key={bIdx}
                                  rows={2}
                                  className="cv-input-bullet"
                                  value={bp}
                                  onChange={e => {
                                    const next = [...generatedData.polished_projects];
                                    next[pIdx].bullet_points[bIdx] = e.target.value;
                                    setGeneratedData({ ...generatedData, polished_projects: next });
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* QUICK APPLY BOX - ĐÁNH GIÁ AI TRƯỚC KHI NỘP */}
                      <div className="cv-quick-apply-box">
                        <h4 className="cv-quick-apply-title">🎯 Đánh giá & Ứng tuyển với CV này</h4>
                        <p style={{ margin: '0 0 10px', fontSize: '0.82rem', color: '#475569', lineHeight: 1.4 }}>
                          Chọn vị trí tuyển dụng để AI phân tích độ tương thích và chỉ ra các kỹ năng cần bổ sung trước khi bạn xác nhận nộp.
                        </p>
                        <div className="cv-quick-apply-controls" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <select 
                            className="cv-input" 
                            style={{ width: '100%', boxSizing: 'border-box' }}
                            value={selectedApplyJobId} 
                            onChange={e => {
                              setSelectedApplyJobId(e.target.value);
                              setEvaluationResult(null);
                              setHasAppliedSuccessfully(false);
                            }}
                          >
                            <option value="">-- Chọn công việc đang tuyển --</option>
                            {availableJobs.map(j => (
                              <option key={j.id} value={j.id}>{j.title} ({j.department})</option>
                            ))}
                          </select>
                          <button 
                            className="cv-btn" 
                            onClick={handleStartAIEvaluation}
                            disabled={isEvaluating || !selectedApplyJobId}
                            style={{
                              width: '100%',
                              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                              color: '#fff',
                              fontWeight: 600,
                              padding: '10px 16px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              borderRadius: '8px',
                              boxSizing: 'border-box',
                              cursor: isEvaluating || !selectedApplyJobId ? 'not-allowed' : 'pointer',
                              opacity: isEvaluating || !selectedApplyJobId ? 0.7 : 1
                            }}
                          >
                            {isEvaluating ? (
                              <>
                                <span className="spinner spinner--sm" style={{ width: 14, height: 14 }} />
                                <span>AI đang chấm...</span>
                              </>
                            ) : (
                              <>
                                <span>🔍</span>
                                <span>Đánh giá bằng AI</span>
                              </>
                            )}
                          </button>
                        </div>
                        {applySuccessMsg && <div className="cv-apply-success-alert">{applySuccessMsg}</div>}
                      </div>
                    </div>
                  </div>

                  {/* CỘT PHẢI: A4 LIVE PAPER PREVIEW */}
                  <div className="cv-preview-column">
                    <div className="cv-preview-header-bar">
                      <div className="cv-zoom-controls">
                        <span>Zoom:</span>
                        <button className="cv-btn-zoom" onClick={() => setZoomLevel(0.85)}>85%</button>
                        <button className="cv-btn-zoom" onClick={() => setZoomLevel(1.0)}>100%</button>
                        <button className="cv-btn-zoom" onClick={() => setZoomLevel(1.15)}>115%</button>
                      </div>
                      <span className="cv-paper-tag">Chuẩn khổ giấy A4 (210 x 297 mm)</span>
                    </div>

                    <div className="cv-preview-viewport">
                      <div 
                        className={`cv-a4-paper template-${templateId}`} 
                        ref={printAreaRef}
                        style={{ 
                          transform: `scale(${zoomLevel})`,
                          transformOrigin: 'top center',
                          '--theme-primary': colorTheme.primary,
                          '--theme-secondary': colorTheme.secondary,
                          '--theme-accent': colorTheme.accent,
                        }}
                      >
                        {/* ==============================================================
                            TEMPLATE 1: MODERN TECH (2 CỘT: SIDEBAR TRÁI + MAIN PHẢI)
                           ============================================================== */}
                        {templateId === 'modern' ? (
                          <div className="cv-modern-grid">
                            {/* SIDEBAR TRÁI */}
                            <aside className="cv-modern-sidebar" style={{ backgroundColor: colorTheme.primary }}>
                              {/* Avatar */}
                              {personalInfo.show_avatar && (
                                <div className="cv-modern-avatar-wrap">
                                  {personalInfo.avatar_url ? (
                                    <img src={personalInfo.avatar_url} alt="Profile" className="cv-modern-avatar" />
                                  ) : (
                                    <div className="cv-modern-avatar-placeholder">
                                      {personalInfo.full_name ? personalInfo.full_name.charAt(0).toUpperCase() : 'CV'}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Thông tin liên hệ */}
                              <div className="cv-sidebar-section">
                                <h4 className="cv-sidebar-title">LIÊN HỆ</h4>
                                <div className="cv-sidebar-contact-item">
                                  <span>📧 {personalInfo.email || 'email@example.com'}</span>
                                </div>
                                <div className="cv-sidebar-contact-item">
                                  <span>📱 {personalInfo.phone || '0901234567'}</span>
                                </div>
                                <div className="cv-sidebar-contact-item">
                                  <span>📍 {personalInfo.address || 'TP. Hồ Chí Minh'}</span>
                                </div>
                                {personalInfo.links?.map((link, lIdx) => (
                                  <div key={lIdx} className="cv-sidebar-contact-item">
                                    <span>🔗 {link}</span>
                                  </div>
                                ))}
                              </div>

                              {/* Học vấn */}
                              <div className="cv-sidebar-section">
                                <h4 className="cv-sidebar-title">HỌC VẤN</h4>
                                {education.map((edu, idx) => (
                                  <div key={idx} className="cv-sidebar-edu-item">
                                    <div className="cv-edu-school">{edu.school}</div>
                                    <div className="cv-edu-major">{edu.major}</div>
                                    <div className="cv-edu-year">{edu.graduation_year} {edu.gpa && `• GPA: ${edu.gpa}`}</div>
                                  </div>
                                ))}
                              </div>

                              {/* Kỹ năng */}
                              <div className="cv-sidebar-section">
                                <h4 className="cv-sidebar-title">KỸ NĂNG CHUYÊN MÔN</h4>
                                {generatedData?.skills_categorized && Object.entries(generatedData.skills_categorized).map(([cat, skList]) => (
                                  <div key={cat} className="cv-sidebar-skill-group">
                                    <div className="cv-skill-cat-name">{cat}</div>
                                    <div className="cv-skill-chips">
                                      {safeArray(skList).map(s => (
                                        <span key={s} className="cv-skill-chip-pill">{s}</span>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </aside>

                            {/* MAIN PHẢI */}
                            <main className="cv-modern-main">
                              <header className="cv-main-header">
                                <h1 className="cv-main-name" style={{ color: colorTheme.primary }}>
                                  {personalInfo.full_name || 'HỌ VÀ TÊN ỨNG VIÊN'}
                                </h1>
                                <div className="cv-main-headline" style={{ color: colorTheme.accent }}>
                                  {generatedData?.headline || targetJobTitle}
                                </div>
                              </header>

                              {/* TÓM TẮT NGHỀ NGHIỆP */}
                              <section className="cv-main-section">
                                <h3 className="cv-main-section-title" style={{ borderColor: colorTheme.primary, color: colorTheme.primary }}>
                                  MỤC TIÊU & TÓM TẮT NGHỀ NGHIỆP
                                </h3>
                                <p className="cv-summary-text">
                                  {generatedData?.professional_summary}
                                </p>
                              </section>

                              {/* DỰ ÁN NỔI BẬT */}
                              <section className="cv-main-section">
                                <h3 className="cv-main-section-title" style={{ borderColor: colorTheme.primary, color: colorTheme.primary }}>
                                  DỰ ÁN CÔNG NGHỆ TIÊU BIỂU
                                </h3>
                                {generatedData?.polished_projects?.map((proj, idx) => (
                                  <div key={idx} className="cv-paper-project-item">
                                    <div className="cv-project-head-line">
                                      <span className="cv-project-name">{proj.name}</span>
                                      <span className="cv-project-role" style={{ color: colorTheme.primary }}>{proj.role}</span>
                                    </div>
                                    {proj.technologies && proj.technologies.length > 0 && (
                                      <div className="cv-project-tech">
                                        <strong>Công nghệ:</strong> {proj.technologies.join(', ')}
                                      </div>
                                    )}
                                    <ul className="cv-project-bullets">
                                      {proj.bullet_points?.map((bp, bIdx) => (
                                        <li key={bIdx}>{bp}</li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </section>

                              {/* KINH NGHIỆM LÀM VIỆC (NẾU CÓ) */}
                              {generatedData?.polished_experiences && generatedData.polished_experiences.length > 0 && (
                                <section className="cv-main-section">
                                  <h3 className="cv-main-section-title" style={{ borderColor: colorTheme.primary, color: colorTheme.primary }}>
                                    KINH NGHIỆM LÀM VIỆC
                                  </h3>
                                  {generatedData.polished_experiences.map((exp, idx) => (
                                    <div key={idx} className="cv-paper-project-item">
                                      <div className="cv-project-head-line">
                                        <span className="cv-project-name">{exp.company}</span>
                                        <span className="cv-project-role" style={{ color: colorTheme.primary }}>{exp.position}</span>
                                      </div>
                                      <div className="cv-edu-year">{exp.duration}</div>
                                      <ul className="cv-project-bullets">
                                        {exp.bullet_points?.map((bp, bIdx) => (
                                          <li key={bIdx}>{bp}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  ))}
                                </section>
                              )}
                            </main>
                          </div>
                        ) : (
                          /* ==============================================================
                             TEMPLATE 2: CLASSIC ATS (1 CỘT CHUẨN TỐI ƯU CHO MÁY QUÉT ATS)
                             ============================================================== */
                          <div className="cv-classic-layout">
                            <header className="cv-classic-header" style={{ borderColor: colorTheme.primary }}>
                              <div className="cv-classic-header__content">
                                <h1 className="cv-classic-name">{personalInfo.full_name || 'HỌ VÀ TÊN ỨNG VIÊN'}</h1>
                                <div className="cv-classic-headline" style={{ color: colorTheme.primary }}>
                                  {generatedData?.headline || targetJobTitle}
                                </div>
                                <div className="cv-classic-contacts">
                                  <span>{personalInfo.email}</span> • 
                                  <span>{personalInfo.phone}</span> • 
                                  <span>{personalInfo.address}</span>
                                  {personalInfo.links?.length > 0 && <span> • {personalInfo.links.join(' • ')}</span>}
                                </div>
                              </div>

                              {personalInfo.show_avatar && personalInfo.avatar_url && (
                                <div className="cv-classic-avatar-wrap">
                                  <img src={personalInfo.avatar_url} alt="Profile" className="cv-classic-avatar" />
                                </div>
                              )}
                            </header>

                            {/* TÓM TẮT NGHỀ NGHIỆP */}
                            <section className="cv-classic-section">
                              <h3 className="cv-classic-section-title" style={{ color: colorTheme.primary }}>
                                TÓM TẮT CHUYÊN MÔN
                              </h3>
                              <p className="cv-summary-text">{generatedData?.professional_summary}</p>
                            </section>

                            {/* KỸ NĂNG CHUYÊN MÔN */}
                            <section className="cv-classic-section">
                              <h3 className="cv-classic-section-title" style={{ color: colorTheme.primary }}>
                                KỸ NĂNG CÔNG NGHỆ
                              </h3>
                              <div className="cv-classic-skills-table">
                                {generatedData?.skills_categorized && Object.entries(generatedData.skills_categorized).map(([cat, skList]) => (
                                  <div key={cat} className="cv-classic-skill-row">
                                    <strong>{cat}:</strong> {safeArray(skList).join(', ')}
                                  </div>
                                ))}
                              </div>
                            </section>

                            {/* DỰ ÁN */}
                            <section className="cv-classic-section">
                              <h3 className="cv-classic-section-title" style={{ color: colorTheme.primary }}>
                                DỰ ÁN TIÊU BIỂU
                              </h3>
                              {generatedData?.polished_projects?.map((proj, idx) => (
                                <div key={idx} className="cv-paper-project-item">
                                  <div className="cv-project-head-line">
                                    <span className="cv-project-name">{proj.name} — <em>{proj.role}</em></span>
                                  </div>
                                  {proj.technologies && proj.technologies.length > 0 && (
                                    <div className="cv-project-tech">
                                      <strong>Công nghệ:</strong> {proj.technologies.join(', ')}
                                    </div>
                                  )}
                                  <ul className="cv-project-bullets">
                                    {proj.bullet_points?.map((bp, bIdx) => (
                                      <li key={bIdx}>{bp}</li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </section>

                            {/* HỌC VẤN */}
                            <section className="cv-classic-section">
                              <h3 className="cv-classic-section-title" style={{ color: colorTheme.primary }}>
                                HỌC VẤN
                              </h3>
                              {education.map((edu, idx) => (
                                <div key={idx} className="cv-classic-edu-item">
                                  <div className="cv-project-head-line">
                                    <strong>{edu.school}</strong>
                                    <span>{edu.graduation_year}</span>
                                  </div>
                                  <div>{edu.major} {edu.gpa && `(GPA: ${edu.gpa})`}</div>
                                </div>
                              ))}
                            </section>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        {/* ==============================================================
            MODAL ĐÁNH GIÁ MỨC ĐỘ PHÙ HỢP CÙNG AI & XÁC NHẬN NỘP CV
           ============================================================== */}
        {showEvalModal && evaluationResult && (
          <div className="cv-eval-modal-backdrop" onClick={() => !isConfirmApplying && setShowEvalModal(false)}>
            <div className="cv-eval-modal-card" onClick={e => e.stopPropagation()}>
              <header className="cv-eval-modal-header">
                <div>
                  <div className="cv-eval-header-tag">🤖 KẾT QUẢ ĐÁNH GIÁ ĐỘ PHÙ HỢP BẰNG AI</div>
                  <h3 className="cv-eval-header-title">
                    {evaluationResult.job_title}
                    {evaluationResult.job_department && <span className="cv-eval-dept-tag"> • {evaluationResult.job_department}</span>}
                  </h3>
                </div>
                <button 
                  className="cv-eval-close-btn" 
                  onClick={() => !isConfirmApplying && setShowEvalModal(false)}
                >
                  ✕
                </button>
              </header>

              <div className="cv-eval-modal-body">
                {hasAppliedSuccessfully ? (
                  <div className="cv-eval-success-banner">
                    <div className="cv-eval-success-icon">🎉</div>
                    <h4>ỨNG TUYỂN THÀNH CÔNG!</h4>
                    <p>
                      Bản CV <strong>"{cvTitle}"</strong> đã được chính thức chuyển tới Nhà tuyển dụng kèm kết quả đánh giá AI:{' '}
                      <strong style={{ color: '#10b981' }}>{evaluationResult.match_score.toFixed(1)}% ({evaluationResult.match_level})</strong>.
                    </p>
                    <div style={{ marginTop: '16px' }}>
                      <button 
                        className="cv-btn cv-btn--primary" 
                        onClick={() => setShowEvalModal(false)}
                        style={{ padding: '8px 20px' }}
                      >
                        Đóng lại
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* KHỐI ĐIỂM SỐ CHÍNH */}
                    <div className="cv-eval-score-card">
                      <div className="cv-eval-score-circle">
                        <span className="cv-eval-score-val">{evaluationResult.match_score.toFixed(1)}%</span>
                        <span className="cv-eval-score-sub">Điểm phù hợp</span>
                      </div>
                      <div className="cv-eval-score-text">
                        <div className="cv-eval-badge-wrap">
                          <span className={`cv-eval-level-badge level-${
                            evaluationResult.match_score >= 80 ? 'high' : 
                            evaluationResult.match_score >= 60 ? 'med' : 
                            evaluationResult.match_score >= 40 ? 'low' : 'danger'
                          }`}>
                            {evaluationResult.match_level}
                          </span>
                        </div>
                        <p className="cv-eval-comment">
                          {evaluationResult.match_score >= 80 
                            ? 'AI nhận thấy hồ sơ của bạn rất sát với các yêu cầu cốt lõi của vị trí này. Bạn có cơ hội trúng tuyển rất cao!'
                            : evaluationResult.match_score >= 60
                            ? 'Hồ sơ có nền tảng tốt, đáp ứng phần lớn tiêu chí nhưng vẫn có một số kỹ năng có thể bổ sung thêm để tăng tính cạnh tranh.'
                            : 'Hồ sơ hiện tại còn thiếu một số kỹ năng cốt lõi quan trọng so với yêu cầu của tin tuyển dụng.'}
                        </p>
                      </div>
                    </div>

                    {/* HAI CỘT ĐỐI CHIẾU TIÊU CHÍ */}
                    <div className="cv-eval-columns">
                      {/* Cột 1: Kỹ năng & Điểm mạnh khớp */}
                      <div className="cv-eval-col cv-eval-col--strengths">
                        <h4 className="cv-eval-col-title">
                          <span>✅</span> Điểm mạnh & Kỹ năng đã khớp
                        </h4>
                        <div className="cv-eval-tag-list">
                          {(() => {
                            const req = evaluationResult.job_required_skills || [];
                            const cand = (evaluationResult.candidate_skills || []).map(s => s.toLowerCase());
                            const matched = req.filter(r => {
                              const skillName = (typeof r === 'string' ? r : r.skill || '').toLowerCase();
                              return cand.includes(skillName);
                            });
                            if (matched.length === 0) {
                              return <span className="cv-eval-empty-note">Chưa tìm thấy kỹ năng trùng khớp trực tiếp.</span>;
                            }
                            return matched.map((item, i) => (
                              <span key={i} className="cv-eval-tag cv-eval-tag--match">
                                ✓ {typeof item === 'string' ? item : item.skill}
                              </span>
                            ));
                          })()}
                        </div>
                      </div>

                      {/* Cột 2: Gaps & Lời khuyên */}
                      <div className="cv-eval-col cv-eval-col--gaps">
                        <h4 className="cv-eval-col-title">
                          <span>⚠️</span> Lời khuyên AI (Khoảng trống cần bổ sung)
                        </h4>
                        <div className="cv-eval-gaps-list">
                          {evaluationResult.gaps && evaluationResult.gaps.length > 0 ? (
                            evaluationResult.gaps.map((g, i) => (
                              <div key={i} className="cv-eval-gap-item">
                                <strong>{g.title}:</strong> {g.message}
                              </div>
                            ))
                          ) : (
                            <span className="cv-eval-empty-note">Không có khoảng trống kỹ năng nào đáng kể!</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* PHÂN TÍCH KỸ NĂNG TỪ GEMINI LLM (nếu có) */}
                    {evaluationResult.skill_details && evaluationResult.skill_details.length > 0 && (
                      <div className="cv-eval-llm-section">
                        <h4 className="cv-eval-col-title" style={{ marginBottom: '8px' }}>
                          <span>🤖</span> Đánh giá Kỹ năng Chi tiết từ Gemini LLM
                        </h4>
                        <div className="cv-eval-skills-table-wrap">
                          <table className="cv-eval-skills-table">
                            <thead>
                              <tr>
                                <th>Kỹ năng</th>
                                <th>Mức độ</th>
                                <th>Lý do & Bằng chứng từ CV</th>
                              </tr>
                            </thead>
                            <tbody>
                              {evaluationResult.skill_details.map((sk, idx) => (
                                <tr key={idx}>
                                  <td><strong>{sk.skill}</strong></td>
                                  <td>
                                    <span className={`badge ${sk.m >= 0.75 ? 'badge--success' : sk.m >= 0.5 ? 'badge--info' : 'badge--warning'}`}>
                                      Mức {Math.round(sk.m * 4)} (m={sk.m})
                                    </span>
                                  </td>
                                  <td style={{ fontSize: '0.8rem', color: '#475569' }}>
                                    {sk.reason}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {!hasAppliedSuccessfully && (
                <footer className="cv-eval-modal-footer">
                  <button 
                    className="cv-btn cv-btn--outline" 
                    onClick={() => setShowEvalModal(false)}
                    disabled={isConfirmApplying}
                  >
                    ✏️ Tiếp tục sửa CV
                  </button>
                  <button 
                    className="cv-btn cv-btn--primary" 
                    onClick={handleConfirmApply}
                    disabled={isConfirmApplying}
                    style={{
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: '#fff',
                      fontWeight: 700,
                      padding: '10px 24px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    {isConfirmApplying ? (
                      <>
                        <span className="spinner spinner--sm" style={{ width: 14, height: 14 }} />
                        <span>Đang gửi hồ sơ...</span>
                      </>
                    ) : (
                      <>
                        <span>🚀</span>
                        <span>Xác nhận Nộp CV này</span>
                      </>
                    )}
                  </button>
                </footer>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
