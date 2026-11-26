import { useState, useEffect, useRef } from 'react';
import { fetchMyCVs, runMatch1To1, uploadCV, applyJob, optimizeCVForJD, saveOptimizedCV, auditAndGenerateChallenge, uploadEvidenceFile, getAvatarUrl } from '../services/api';
import UnifiedCriteriaAssessment from './UnifiedCriteriaAssessment';

export default function ApplyAIModal({ job, currentUser, onClose, onApplied }) {
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [fileToUpload, setFileToUpload] = useState(null);
  
  const [step, setStep] = useState('select-cv'); // 'select-cv' | 'analyzing' | 'result' | 'confirm-gaps' | 'quick-tech-check' | 'optimizing' | 'optimized-diff' | 'confirm' | 'success'
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // AI Optimization state
  const [optGapsByPillar, setOptGapsByPillar] = useState({ skills: [], experience: [], projects: [], education: [] });
  const [activeGapTab, setActiveGapTab] = useState('skills');
  const [declaredEvidences, setDeclaredEvidences] = useState({});
  const [customInstructions, setCustomInstructions] = useState('');
  const [isAuditing, setIsAuditing] = useState(false);
  const [uploadingKeys, setUploadingKeys] = useState({});
  const [challengeQuestions, setChallengeQuestions] = useState([]);
  const [challengeAnswers, setChallengeAnswers] = useState({});
  const [auditOverview, setAuditOverview] = useState(null);

  const [optimizedResult, setOptimizedResult] = useState(null);
  const [editedSummary, setEditedSummary] = useState('');
  const [editedSkills, setEditedSkills] = useState([]);
  const [editedProjects, setEditedProjects] = useState([]);
  const [activeDiffTab, setActiveDiffTab] = useState('diff'); // 'diff' | 'audit' | 'editor'
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Tải danh sách CV của user hiện tại
    const loadCVs = () => {
      if (currentUser?.id) {
        fetchMyCVs(currentUser.id).then(data => {
          setCandidates(data || []);
          if (data && data.length > 0 && !selectedCandidateId) setSelectedCandidateId(data[0].id);
        }).catch(err => {
          setError('Lỗi khi tải danh sách CV: ' + err.message);
        });
      }
    };

    loadCVs();

    const handleCVUpdate = () => {
      loadCVs();
    };
    window.addEventListener('cv_database_updated', handleCVUpdate);
    return () => {
      window.removeEventListener('cv_database_updated', handleCVUpdate);
    };
  }, [currentUser]);

  function handleFileDrop(e) {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFileToUpload(e.dataTransfer.files[0]);
    }
  }

  function handleFileChange(e) {
    if (e.target.files && e.target.files[0]) {
      setFileToUpload(e.target.files[0]);
    }
  }

  async function handleRunAI() {
    setError(null);
    setStep('analyzing');
    
    try {
      let cvIdToMatch = selectedCandidateId;
      
      // Nếu có file upload, ưu tiên upload file trước để tạo CandidateCV
      if (fileToUpload) {
        const uploadedCandidate = await uploadCV(currentUser.id, fileToUpload);
        cvIdToMatch = uploadedCandidate.id;
        setCandidates(prev => [uploadedCandidate, ...prev]);
        window.dispatchEvent(new CustomEvent('cv_database_updated'));
      }

      if (!cvIdToMatch) {
        throw new Error('Vui lòng chọn hoặc tải lên một CV.');
      }

      const res = await runMatch1To1(cvIdToMatch, job.id);
      setResult({
        ...res,
        _usedCandidateId: cvIdToMatch,
        _usedCandidate: cvIdToMatch === selectedCandidateId 
            ? candidates.find(c => c.id == cvIdToMatch) 
            : null
      });
      setTimeout(() => setStep('result'), 800);
    } catch (err) {
      setError(err.message);
      setStep('select-cv');
    }
  }

  // Khởi động luồng AI Tối ưu lại CV trên 4 Trụ cột
  function handleStartOptimize() {
    setError(null);
    const cand = candidates.find(c => c.id == (result?._usedCandidateId || selectedCandidateId)) || result?._usedCandidate;
    const candSkillsLower = (cand?.parsed_skills || []).map(s => String(s).toLowerCase().trim());
    
    // 1. Khoảng trống Kỹ năng (Skills Gap)
    const missingSkills = [];
    if (job?.required_skills) {
      job.required_skills.forEach(s => {
        const sName = typeof s === 'string' ? s : s.skill;
        if (sName && !candSkillsLower.includes(sName.toLowerCase().trim())) {
          missingSkills.push(sName.trim());
        }
      });
    }
    if (result?.skill_details) {
      result.skill_details.forEach(sd => {
        if ((sd.level === 'Mức 0' || sd.m === 0) && sd.skill) {
          const clean = sd.skill.trim();
          if (!missingSkills.map(m => m.toLowerCase()).includes(clean.toLowerCase())) {
            missingSkills.push(clean);
          }
        }
      });
    }

    // 2. Khoảng trống Kinh nghiệm (Experience Gap)
    const missingExp = [];
    const reqExp = Number(job?.required_experience || 0);
    const candExp = Number(cand?.experience_years || 0);
    if (reqExp > candExp) {
      missingExp.push({
        name: `Kinh nghiệm làm việc ${reqExp} năm (${job?.title || 'Chuyên môn'})`,
        desc: `JD yêu cầu tối thiểu ${reqExp} năm, CV hiện tại ghi nhận ${candExp} năm kinh nghiệm.`
      });
    }

    // 3. Khoảng trống Dự án (Projects Gap)
    const missingProj = [];
    if (job?.project_keywords && Array.isArray(job.project_keywords)) {
      const candProjsStr = (cand?.project_descriptions || []).join(' ').toLowerCase();
      job.project_keywords.forEach(pk => {
        const kw = typeof pk === 'string' ? pk : String(pk);
        if (kw && !candProjsStr.includes(kw.toLowerCase())) {
          missingProj.push({
            name: `Dự án thực tế về ${kw}`,
            desc: `Chưa có dự án làm rõ năng lực xử lý bài toán hoặc công nghệ ${kw}.`
          });
        }
      });
    }
    if (missingProj.length === 0) {
      missingProj.push({
        name: `Dự án tiêu biểu theo chuẩn STAR (${job?.title})`,
        desc: `Bổ sung dự án thực tế làm nổi bật vai trò đóng góp và thước đo kết quả.`
      });
    }

    // 4. Khoảng trống Học vấn & Chứng chỉ (Education Gap)
    const missingEdu = [
      {
        name: `Bằng Đại học / Cao đẳng chuyên ngành liên quan`,
        desc: `Xác nhận học vị chính quy chuyên ngành CNTT hoặc liên quan.`
      },
      {
        name: `Chứng chỉ nghề nghiệp / Ngoại ngữ (AWS, IELTS, Tester, Postman...)`,
        desc: `Bổ sung chứng chỉ quốc tế hoặc khóa đào tạo chuyên môn đã hoàn thành.`
      }
    ];

    const initialEvidences = {};
    missingSkills.forEach(sk => {
      initialEvidences[`skills_${sk}`] = {
        pillar: 'skills',
        item_name: sk,
        context_type: 'academic_project',
        description: '',
        reference_link: '',
        confirmed: false
      };
    });

    missingExp.forEach(e => {
      initialEvidences[`exp_${e.name}`] = {
        pillar: 'experience',
        item_name: e.name,
        context_type: 'company_work',
        description: '',
        reference_link: '',
        duration_or_period: '',
        organization: '',
        confirmed: false
      };
    });

    missingProj.forEach(p => {
      initialEvidences[`proj_${p.name}`] = {
        pillar: 'projects',
        item_name: p.name,
        context_type: 'academic_project',
        description: '',
        reference_link: '',
        organization: '',
        confirmed: false
      };
    });

    missingEdu.forEach(ed => {
      initialEvidences[`edu_${ed.name}`] = {
        pillar: 'education',
        item_name: ed.name,
        context_type: 'certification',
        description: '',
        reference_link: '',
        organization: '',
        confirmed: false
      };
    });

    setOptGapsByPillar({
      skills: missingSkills,
      experience: missingExp,
      projects: missingProj,
      education: missingEdu
    });
    setDeclaredEvidences(initialEvidences);
    setActiveGapTab(missingSkills.length > 0 ? 'skills' : (missingExp.length > 0 ? 'experience' : 'projects'));
    setStep('confirm-gaps');
  }

  // Xử lý upload tệp/ảnh minh chứng cho từng tiêu chí
  async function handleUploadProofFile(key, file) {
    if (!file) return;
    setUploadingKeys(prev => ({ ...prev, [key]: true }));
    setError(null);
    try {
      const res = await uploadEvidenceFile(file);
      if (res && res.file_url) {
        setDeclaredEvidences(prev => {
          const cur = prev[key] || {};
          return {
            ...prev,
            [key]: {
              ...cur,
              confirmed: true, // Tự động đánh dấu đã chọn khi đính kèm file
              evidence_file_url: res.file_url,
              evidence_file_name: res.file_name
            }
          };
        });
      }
    } catch (err) {
      const msg = typeof err?.message === 'string' ? err.message : String(err || 'Không thể tải file');
      setError('Lỗi tải tệp minh chứng: ' + msg);
    } finally {
      setUploadingKeys(prev => ({ ...prev, [key]: false }));
    }
  }

  // Render khu vực upload file/ảnh minh chứng dùng chung cho các thẻ tiêu chí
  function renderProofUploadBox(key, ev) {
    const isUploading = uploadingKeys[key];
    return (
      <div style={{ marginTop: '8px', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', padding: '8px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
            <span>📎</span>
            <span>Đính kèm Ảnh / Tệp minh chứng (Bằng cấp, Chứng chỉ, Bảng điểm, Ảnh chụp Demo/Code):</span>
          </label>

          {ev.evidence_file_url ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <a 
                href={getAvatarUrl(ev.evidence_file_url)} 
                target="_blank" 
                rel="noreferrer"
                style={{ fontSize: '11px', color: '#15803d', fontWeight: 600, background: '#dcfce7', padding: '2px 8px', borderRadius: '4px', textDecoration: 'none' }}
                title="Bấm để xem tệp đã tải lên"
              >
                ✓ {ev.evidence_file_name || 'Đã đính kèm tệp'} ↗
              </a>
              <button 
                type="button"
                onClick={() => setDeclaredEvidences(prev => ({ ...prev, [key]: { ...ev, evidence_file_url: null, evidence_file_name: null } }))}
                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '11px', cursor: 'pointer', padding: '2px 4px' }}
              >
                ✕ Xóa
              </button>
            </div>
          ) : (
            <label style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 600,
              color: '#475569',
              cursor: isUploading ? 'not-allowed' : 'pointer'
            }}>
              <input 
                type="file" 
                accept="image/*,.pdf,.doc,.docx"
                style={{ display: 'none' }}
                disabled={isUploading}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleUploadProofFile(key, e.target.files[0]);
                  }
                }}
              />
              <span>{isUploading ? '⏳ Đang tải lên...' : '📷 Chọn ảnh / Tệp từ máy'}</span>
            </label>
          )}
        </div>
      </div>
    );
  }

  // Bước 2: Chuyển sang thẩm định và làm Quick Tech Check
  async function handleProceedToAudit() {
    setError(null);
    const confirmedList = Object.values(declaredEvidences).filter(item => item.confirmed);

    // Kiểm tra tính xác thực sơ bộ: nếu đã tick chọn thì phải có mô tả cụ thể HOẶC có file minh chứng đính kèm
    for (const item of confirmedList) {
      const hasFile = Boolean(item.evidence_file_url);
      const descLen = (item.description || '').trim().length;
      if (!hasFile && descLen < 15) {
        setError(`Vui lòng nhập mô tả chi tiết (tối thiểu 15 ký tự) hoặc đính kèm ảnh/file minh chứng cho tiêu chí "${item.item_name}".`);
        return;
      }
    }

    const cvId = result?._usedCandidateId || selectedCandidateId;

    if (confirmedList.length === 0) {
      // Nếu không khai báo thêm tiêu chí nào, tiến hành tối ưu câu từ CV gốc
      handleRunOptimizationWithVerified([], []);
      return;
    }

    setIsAuditing(true);
    try {
      const auditRes = await auditAndGenerateChallenge(cvId, {
        cv_id: Number(cvId),
        jd_id: Number(job.id),
        declared_evidences: confirmedList,
        custom_instructions: customInstructions.trim() || null
      });

      setAuditOverview(auditRes);
      setIsAuditing(false);

      if (auditRes.challenge_questions && auditRes.challenge_questions.length > 0) {
        setChallengeQuestions(auditRes.challenge_questions);
        const initialAnswers = {};
        auditRes.challenge_questions.forEach(q => {
          initialAnswers[q.id] = 0;
        });
        setChallengeAnswers(initialAnswers);
        setStep('quick-tech-check');
      } else {
        handleRunOptimizationWithVerified(confirmedList, []);
      }
    } catch (err) {
      setIsAuditing(false);
      const msg = typeof err?.message === 'string' ? err.message : (typeof err === 'object' ? JSON.stringify(err) : String(err || 'Không thể kết nối máy chủ AI'));
      setError('Lỗi khi thẩm định bằng chứng: ' + msg);
    }
  }

  // Bước 3: Hoàn tất bài Quick Tech Check và gọi API Tối ưu hóa & Tái chấm điểm
  async function handleRunOptimizationWithVerified(customConfirmedList = null, customAnswersList = null) {
    setError(null);
    setStep('optimizing');

    const cvId = result?._usedCandidateId || selectedCandidateId;
    const confirmedList = customConfirmedList !== null 
      ? customConfirmedList 
      : Object.values(declaredEvidences).filter(item => item.confirmed);

    const answersList = customAnswersList !== null
      ? customAnswersList
      : Object.entries(challengeAnswers).map(([qid, selIdx]) => ({
          question_id: qid,
          selected_index: selIdx
        }));

    try {
      const optRes = await optimizeCVForJD(cvId, {
        jd_id: Number(job.id),
        declared_evidences: confirmedList,
        challenge_answers: answersList,
        custom_instructions: customInstructions.trim() || null
      });

      setOptimizedResult(optRes);
      setEditedSummary(optRes.optimized_summary || '');
      setEditedSkills(optRes.optimized_skills || []);
      setEditedProjects(optRes.optimized_projects || []);
      setStep('optimized-diff');
    } catch (err) {
      setError('Lỗi khi tối ưu hóa và tái chấm điểm: ' + (err.message || 'Không thể kết nối dịch vụ AI'));
      setStep('confirm-gaps');
    }
  }

  // Lưu bản tối ưu và nộp ngay
  async function handleApplyWithOptimized() {
    setIsSubmitting(true);
    setError(null);
    const cvId = result?._usedCandidateId || selectedCandidateId;

    try {
      // 1. Lưu bản CV mới vào bảng CandidateCV và UserGeneratedCV
      const savedCand = await saveOptimizedCV(cvId, {
        jd_id: Number(job.id),
        title: `${currentUser?.full_name || 'Ứng viên'} (Tối ưu cho ${job.title})`,
        optimized_summary: editedSummary,
        optimized_skills: editedSkills,
        optimized_projects: editedProjects,
        save_as_new: true
      });

      setCandidates(prev => [savedCand, ...prev]);

      // 2. Nộp đơn với bản CV mới này và điểm số tối ưu cao kèm Audit Trail
      await applyJob({
        user_id: currentUser?.id ? Number(currentUser.id) : null,
        cv_id: Number(savedCand.id),
        jd_id: Number(job.id),
        match_score: optimizedResult?.predicted_match_score || 82.0,
        match_level: optimizedResult?.predicted_match_level || 'Rất phù hợp',
        feature_details: {
          ...(result?.feature_details || {}),
          audit_trail: optimizedResult?.audit_trail
        },
        audit_trail: optimizedResult?.audit_trail,
        custom_criteria_results: result?.custom_criteria_results,
        skill_details: result?.skill_details,
      });

      setIsSubmitting(false);
      setResult(prev => ({
        ...prev,
        match_score: optimizedResult?.predicted_match_score || 82.0,
        match_level: optimizedResult?.predicted_match_level || 'Rất phù hợp'
      }));
      setStep('success');
      if (onApplied) onApplied(job.id);
    } catch (err) {
      setIsSubmitting(false);
      setError('Lỗi khi lưu và nộp hồ sơ: ' + (err.message || 'Lỗi không xác định'));
    }
  }

  // Chỉ lưu bản CV tối ưu vào thư viện mà chưa nộp
  async function handleSaveOnly() {
    setIsSubmitting(true);
    setError(null);
    const cvId = result?._usedCandidateId || selectedCandidateId;

    try {
      const savedCand = await saveOptimizedCV(cvId, {
        jd_id: Number(job.id),
        title: `${currentUser?.full_name || 'Ứng viên'} (Tối ưu cho ${job.title})`,
        optimized_summary: editedSummary,
        optimized_skills: editedSkills,
        optimized_projects: editedProjects,
        save_as_new: true
      });

      setCandidates(prev => [savedCand, ...prev]);
      setIsSubmitting(false);
      window.dispatchEvent(new CustomEvent('cv_database_updated'));
      alert('✅ Đã lưu bản CV tối ưu vào danh sách hồ sơ của bạn!');
      setStep('result');
    } catch (err) {
      setIsSubmitting(false);
      setError('Lỗi khi lưu hồ sơ: ' + (err.message || 'Lỗi không xác định'));
    }
  }

  async function handleFinalSubmit() {
    setIsSubmitting(true);
    setError(null);
    try {
      const cvId = result?._usedCandidateId || selectedCandidateId;
      await applyJob({
        user_id: currentUser?.id ? Number(currentUser.id) : null,
        cv_id: Number(cvId),
        jd_id: Number(job.id),
        match_score: result?.match_score,
        match_level: result?.match_level,
        feature_details: result?.feature_details,
        custom_criteria_results: result?.custom_criteria_results,
        skill_details: result?.skill_details,
      });
      setIsSubmitting(false);
      setStep('success');
      if (onApplied) onApplied(job.id);
    } catch (err) {
      setIsSubmitting(false);
      setError('Lỗi khi nộp hồ sơ: ' + err.message);
    }
  }

  const getMatchText = (score) => {
    if (score >= 80) return 'Rất tốt!';
    if (score >= 60) return 'Khá tốt';
    return 'Cần cải thiện';
  };

  const getSummaryText = (score, dept) => {
    if (score >= 80) return `AI nhận thấy hồ sơ của bạn rất sát với các yêu cầu cốt lõi của ${dept} cho vị trí này.`;
    if (score >= 60) return `Hồ sơ của bạn có tiềm năng, nhưng cần bổ sung thêm một số kỹ năng quan trọng để đáp ứng tốt hơn yêu cầu của ${dept}.`;
    return `Hiện tại hồ sơ của bạn chưa thật sự phù hợp với các tiêu chí cốt lõi của ${dept}. Hãy xem kỹ phần góp ý bên dưới nhé!`;
  };

  const currentCand = candidates.find(c => c.id == (result?._usedCandidateId || selectedCandidateId)) || result?._usedCandidate;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className={`modal-content ai-apply-modal ${['result', 'confirm-gaps', 'optimized-diff'].includes(step) ? 'ai-apply-modal--wide' : ''}`} 
        style={step === 'optimized-diff' ? { maxWidth: '960px', width: '95%' } : step === 'confirm-gaps' ? { maxWidth: '680px', width: '92%' } : {}}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose}>✕</button>
        
        {/* STEP 1: CHỌN CV HOẶC UPLOAD */}
        {step === 'select-cv' && (
          <div className="ai-apply-step">
            <h2 className="ai-apply-title">✨ Ứng tuyển bằng AI</h2>
            <p className="ai-apply-subtitle">
              Vị trí: <strong>{job.title} - {job.department || 'APEX IT'}</strong>
            </p>
            
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Chọn Hồ sơ / CV từ thư viện của bạn (Có {candidates.length} hồ sơ đã lưu): 🕒</label>
              <select 
                className="input-control ai-select-cv" 
                value={fileToUpload ? '' : selectedCandidateId} 
                onChange={(e) => {
                  setSelectedCandidateId(e.target.value);
                  setFileToUpload(null);
                }}
              >
                <option value="" disabled>-- Hãy chọn một hồ sơ --</option>
                {candidates.map(c => (
                  <option key={c.id} value={c.id}>
                    📄 Hồ sơ: {c.full_name} - {c.experience_years} năm KN
                  </option>
                ))}
              </select>
              <span className="help-text" style={{ display: 'block', marginTop: '6px', fontSize: '0.85rem', color: '#64748b' }}>
                Hệ thống sẽ lấy dữ liệu từ bảng candidates_cv liên kết với tài khoản của bạn để phân tích.
              </span>
            </div>

            <div className="ai-divider">
              <span>HOẶC TẢI LÊN CV MỚI (.PDF, .DOCX)</span>
            </div>

            <div 
              className={`ai-upload-zone ${fileToUpload ? 'has-file' : ''}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept=".pdf,.docx"
                onChange={handleFileChange}
              />
              <div className="upload-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
              </div>
              {fileToUpload ? (
                <strong>Đã chọn file: {fileToUpload.name}</strong>
              ) : (
                <strong>Kéo thả hoặc nhấp để tải lên CV mới từ thiết bị<br/>.pdf, .docx (Tối đa 10MB)</strong>
              )}
              <span className="upload-note">Hồ sơ mới này sẽ được tự động lưu vào danh sách của bạn để dùng cho các JD khác sau này.</span>
            </div>

            {error && <div className="alert alert--error" style={{marginTop: '16px'}}>{error}</div>}

            <div className="modal-actions" style={{ marginTop: '24px' }}>
              <button className="btn btn--outline" onClick={onClose} style={{ flex: 1, padding: '12px' }}>Hủy</button>
              <button 
                className="btn btn--primary ai-btn-primary" 
                onClick={handleRunAI} 
                disabled={!selectedCandidateId && !fileToUpload}
                style={{ flex: 2, padding: '12px' }}
              >
                Phân tích độ phù hợp ngay 🪄
              </button>
            </div>
          </div>
        )}

        {/* STEP: ĐANG PHÂN TÍCH */}
        {step === 'analyzing' && (
          <div className="ai-apply-step ai-apply-step--center" style={{ padding: '40px 0' }}>
            <div className="spinner spinner--lg" style={{ marginBottom: '20px' }}></div>
            <h3>🤖 AI đang phân tích CV của bạn...</h3>
            <p className="text-secondary">Đang trích xuất kỹ năng và đối chiếu với yêu cầu của nhà tuyển dụng.</p>
          </div>
        )}

        {/* STEP 2: HIỂN THỊ KẾT QUẢ ĐÁNH GIÁ BAN ĐẦU */}
        {step === 'result' && result && (
          <div className="ai-apply-step">
            <h2 className="ai-apply-title" style={{ textAlign: 'center' }}>
              🎉 Độ phù hợp: {Math.round(result.match_score)}% - {getMatchText(result.match_score)}
            </h2>
            
            <div className="ai-result-section-title">Độ phù hợp tổng thể</div>
            <div className="ai-apply-score-card">
              <div className="score-circle">
                <span className="score-number">{Math.round(result.match_score)}%</span>
              </div>
              <div className="score-summary">
                <h4>{getMatchText(result.match_score)}</h4>
                <p>{getSummaryText(result.match_score, job.department || 'APEX IT')}</p>
              </div>
            </div>

            {/* Gap Analysis / Lời khuyên AI */}
            {result.gaps && result.gaps.length > 0 && (
              <div className="ai-gaps-container" style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '12px', padding: '16px', marginTop: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#b45309', fontWeight: 600, marginBottom: '8px' }}>
                  <span>⚠️</span> AI Lời khuyên (Khoảng trống cần bổ sung):
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {result.gaps.map((g, idx) => (
                    <div key={idx} style={{ fontSize: '0.9rem', color: '#78350f' }}>
                      <strong>{g.message.includes(':') ? g.message.split(':')[0] + ':' : '• ' + g.category + ':'}</strong>
                      <div style={{ paddingLeft: '12px', marginTop: '2px', color: '#92400e' }}>
                        {g.message.includes(':') ? g.message.split(':').slice(1).join(':') : g.message}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Đánh giá đa tiêu chí toàn diện bằng AI (Skills, Exp, Projects, Education) */}
            <UnifiedCriteriaAssessment 
              result={result} 
              title="ĐÁNH GIÁ ĐA TIÊU CHÍ AI (GEMINI LLM)" 
            />

            {/* Tiêu chí đặc thù HR */}
            {result.custom_criteria_results && result.custom_criteria_results.length > 0 && (
              <div className="ai-result-section" style={{ marginTop: '24px' }}>
                <div className="ai-result-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>✨</span> Tiêu chí đặc thù từ HR
                </div>
                <div className="feature-table" style={{ marginTop: '10px' }}>
                  <div className="feature-table__header" style={{ gridTemplateColumns: '1fr 2fr 1fr 1fr' }}>
                    <span>Trạng thái</span>
                    <span>Tiêu chí</span>
                    <span>Cấp độ</span>
                    <span>Tác động</span>
                  </div>
                  {result.custom_criteria_results.map((c, idx) => (
                    <div key={idx} className="feature-table__row" style={{ gridTemplateColumns: '1fr 2fr 1fr 1fr' }}>
                      <div>{c.met ? <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓ ĐẠT</span> : <span style={{ color: '#ef4444', fontWeight: 'bold' }}>✕ THIẾU</span>}</div>
                      <div style={{ fontWeight: 500 }}>{c.name}</div>
                      <div style={{ textTransform: 'uppercase', fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>{c.level}</div>
                      <div className={`feature-table__value ${c.score_impact >= 0 ? 'value--positive' : 'value--negative'}`}>
                        {c.score_impact >= 0 ? `+${c.score_impact}đ` : `${c.score_impact}đ`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && <div className="alert alert--error" style={{ marginTop: '16px' }}>{error}</div>}

            <div className="modal-actions" style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn btn--outline" onClick={onClose} style={{ padding: '10px 16px' }}>Hủy bỏ</button>
              
              {/* NÚT AI TỐI ƯU LẠI CV */}
              <button 
                className="btn btn--outline" 
                onClick={handleStartOptimize} 
                style={{ 
                  padding: '10px 18px', 
                  borderColor: '#8b5cf6', 
                  color: '#6d28d9', 
                  background: '#f5f3ff', 
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>🪄</span> Dùng AI Tối ưu lại CV
              </button>

              <button className="btn btn--primary ai-btn-primary" onClick={() => setStep('confirm')} style={{ padding: '10px 24px' }}>
                Xác nhận nộp CV
              </button>
            </div>
          </div>
        )}

        {/* STEP: XÁC NHẬN KHOẢNG TRỐNG & KHAI BÁO BẰNG CHỨNG (MICRO-EVIDENCE DECLARATION) */}
        {step === 'confirm-gaps' && (
          <div className="ai-apply-step" style={{ padding: '8px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <button 
                className="btn btn--ghost btn--sm" 
                onClick={() => setStep('result')}
                style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                ← Quay lại
              </button>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>
                🎯 Khai báo Bằng chứng Bổ sung (Tối ưu hóa Minh bạch)
              </h3>
            </div>

            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '14px 16px', marginBottom: '20px' }}>
              <div style={{ fontWeight: 600, color: '#166534', marginBottom: '4px', fontSize: '0.95rem' }}>
                🛡️ Nguyên tắc Khai báo có Bằng chứng (Micro-Evidence & Zero-Hallucination):
              </div>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#15803d', lineHeight: 1.5 }}>
                Để tránh điểm số ảo và đảm bảo tính minh bạch với Nhà tuyển dụng, <strong>bạn chỉ được cộng điểm khi cung cấp thông tin đối chứng thực tế</strong> (Ngữ cảnh tích lũy, bài toán kỹ thuật, link GitHub/demo hoặc chứng chỉ). Sau khi khai báo, bạn sẽ hoàn thành nhanh 2 câu hỏi kiểm chứng kỹ thuật trước khi AI tái tính điểm.
              </p>
            </div>

            {/* TAB CHỌN TRỤ CỘT KHOẢNG TRỐNG */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', marginBottom: '16px', overflowX: 'auto' }}>
              {[
                { id: 'skills', label: '⚡ Kỹ năng', count: optGapsByPillar.skills.length },
                { id: 'experience', label: '💼 Kinh nghiệm', count: optGapsByPillar.experience.length },
                { id: 'projects', label: '🚀 Dự án', count: optGapsByPillar.projects.length },
                { id: 'education', label: '🎓 Học vấn & Bằng cấp', count: optGapsByPillar.education.length },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveGapTab(tab.id)}
                  style={{
                    padding: '8px 14px',
                    background: 'none',
                    border: 'none',
                    borderBottom: activeGapTab === tab.id ? '2px solid #8b5cf6' : '2px solid transparent',
                    color: activeGapTab === tab.id ? '#7c3aed' : '#64748b',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span>{tab.label}</span>
                  <span style={{
                    background: activeGapTab === tab.id ? '#ede9fe' : '#f1f5f9',
                    color: activeGapTab === tab.id ? '#7c3aed' : '#64748b',
                    fontSize: '11px',
                    padding: '2px 7px',
                    borderRadius: '10px'
                  }}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* DANH SÁCH THẺ TIÊU CHÍ THEO TAB */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '340px', overflowY: 'auto', paddingRight: '4px', marginBottom: '16px' }}>
              {activeGapTab === 'skills' && (
                optGapsByPillar.skills.length > 0 ? (
                  optGapsByPillar.skills.map(sk => {
                    const key = `skills_${sk}`;
                    const ev = declaredEvidences[key] || { confirmed: false, description: '', reference_link: '', context_type: 'academic_project' };
                    return (
                      <div key={key} style={{
                        border: ev.confirmed ? '1.5px solid #8b5cf6' : '1px solid #e2e8f0',
                        background: ev.confirmed ? '#fbf8ff' : '#ffffff',
                        borderRadius: '10px',
                        padding: '12px 14px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600, color: '#1e293b' }}>
                            <input 
                              type="checkbox"
                              checked={ev.confirmed}
                              onChange={(e) => {
                                const val = e.target.checked;
                                setDeclaredEvidences(prev => ({ ...prev, [key]: { ...ev, confirmed: val } }));
                              }}
                              style={{ width: '18px', height: '18px', accentColor: '#8b5cf6', cursor: 'pointer' }}
                            />
                            <span>⚡ {sk}</span>
                          </label>
                          <span style={{ fontSize: '11px', color: ev.confirmed ? '#7c3aed' : '#94a3b8', fontWeight: 500 }}>
                            {ev.confirmed ? '✓ Đã chọn bổ sung' : 'Chưa chọn'}
                          </span>
                        </div>

                        {ev.confirmed && (
                          <div style={{ marginTop: '10px', paddingLeft: '28px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              <div>
                                <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '3px' }}>Ngữ cảnh tích lũy:</label>
                                <select 
                                  className="input-control"
                                  value={ev.context_type || 'academic_project'}
                                  onChange={(e) => setDeclaredEvidences(prev => ({ ...prev, [key]: { ...ev, context_type: e.target.value } }))}
                                  style={{ fontSize: '0.82rem', padding: '5px 8px' }}
                                >
                                  <option value="academic_project">Đồ án trường học / Bài tập lớn</option>
                                  <option value="company_work">Công việc công ty / Thực tập</option>
                                  <option value="freelance">Freelance / Dự án ngoài</option>
                                  <option value="self_study">Tự học / Pet-project</option>
                                  <option value="certification">Khóa học / Chứng chỉ</option>
                                </select>
                              </div>
                              <div>
                                <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '3px' }}>Link đối chứng (GitHub/Demo):</label>
                                <input 
                                  type="text"
                                  className="input-control"
                                  placeholder="https://github.com/... hoặc link demo"
                                  value={ev.reference_link || ''}
                                  onChange={(e) => setDeclaredEvidences(prev => ({ ...prev, [key]: { ...ev, reference_link: e.target.value } }))}
                                  style={{ fontSize: '0.82rem', padding: '5px 8px' }}
                                />
                              </div>
                            </div>
                            <div>
                              <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '3px' }}>
                                Mô tả kỹ thuật cụ thể (Bắt buộc tối thiểu 15 ký tự):
                              </label>
                              <textarea 
                                className="input-control"
                                rows="2"
                                placeholder={`Ví dụ: Đã dùng ${sk} để viết API router, tích hợp database và xử lý luồng nghiệp vụ...`}
                                value={ev.description || ''}
                                onChange={(e) => setDeclaredEvidences(prev => ({ ...prev, [key]: { ...ev, description: e.target.value } }))}
                                style={{ fontSize: '0.82rem', padding: '6px 8px' }}
                              />
                            </div>
                            {renderProofUploadBox(key, ev)}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', color: '#64748b', fontSize: '0.88rem' }}>
                    ✨ Bạn đã có đủ các kỹ năng cốt lõi yêu cầu trong JD!
                  </div>
                )
              )}

              {activeGapTab === 'experience' && (
                optGapsByPillar.experience.length > 0 ? (
                  optGapsByPillar.experience.map(exp => {
                    const key = `exp_${exp.name}`;
                    const ev = declaredEvidences[key] || { confirmed: false, description: '', organization: '', duration_or_period: '', context_type: 'company_work' };
                    return (
                      <div key={key} style={{
                        border: ev.confirmed ? '1.5px solid #8b5cf6' : '1px solid #e2e8f0',
                        background: ev.confirmed ? '#fbf8ff' : '#ffffff',
                        borderRadius: '10px',
                        padding: '12px 14px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600, color: '#1e293b' }}>
                            <input 
                              type="checkbox"
                              checked={ev.confirmed}
                              onChange={(e) => {
                                const val = e.target.checked;
                                setDeclaredEvidences(prev => ({ ...prev, [key]: { ...ev, confirmed: val } }));
                              }}
                              style={{ width: '18px', height: '18px', accentColor: '#8b5cf6', cursor: 'pointer' }}
                            />
                            <span>💼 {exp.name}</span>
                          </label>
                          <span style={{ fontSize: '11px', color: ev.confirmed ? '#7c3aed' : '#94a3b8', fontWeight: 500 }}>
                            {ev.confirmed ? '✓ Đã chọn bổ sung' : 'Chưa chọn'}
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', paddingLeft: '28px' }}>
                          {exp.desc}
                        </div>

                        {ev.confirmed && (
                          <div style={{ marginTop: '10px', paddingLeft: '28px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                              <div>
                                <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '3px' }}>Tên công ty / Đơn vị:</label>
                                <input 
                                  type="text"
                                  className="input-control"
                                  placeholder="Tên công ty / Tổ chức đã làm việc"
                                  value={ev.organization || ''}
                                  onChange={(e) => setDeclaredEvidences(prev => ({ ...prev, [key]: { ...ev, organization: e.target.value } }))}
                                  style={{ fontSize: '0.82rem', padding: '5px 8px' }}
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '3px' }}>Thời gian (VD: 06/2023 - 05/2024):</label>
                                <input 
                                  type="text"
                                  className="input-control"
                                  placeholder="Từ tháng/năm đến tháng/năm"
                                  value={ev.duration_or_period || ''}
                                  onChange={(e) => setDeclaredEvidences(prev => ({ ...prev, [key]: { ...ev, duration_or_period: e.target.value } }))}
                                  style={{ fontSize: '0.82rem', padding: '5px 8px' }}
                                />
                              </div>
                            </div>
                            <div>
                              <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '3px' }}>Mô tả công việc & trách nhiệm chính:</label>
                              <textarea 
                                className="input-control"
                                rows="2"
                                placeholder="Mô tả cụ thể trách nhiệm, vai trò và công nghệ chính đã phụ trách..."
                                value={ev.description || ''}
                                onChange={(e) => setDeclaredEvidences(prev => ({ ...prev, [key]: { ...ev, description: e.target.value } }))}
                                style={{ fontSize: '0.82rem', padding: '6px 8px' }}
                              />
                            </div>
                            {renderProofUploadBox(key, ev)}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', color: '#64748b', fontSize: '0.88rem' }}>
                    ✨ Số năm kinh nghiệm trong CV đã đáp ứng yêu cầu của vị trí!
                  </div>
                )
              )}

              {activeGapTab === 'projects' && (
                optGapsByPillar.projects.map(proj => {
                  const key = `proj_${proj.name}`;
                  const ev = declaredEvidences[key] || { confirmed: false, description: '', reference_link: '', context_type: 'academic_project' };
                  return (
                    <div key={key} style={{
                      border: ev.confirmed ? '1.5px solid #8b5cf6' : '1px solid #e2e8f0',
                      background: ev.confirmed ? '#fbf8ff' : '#ffffff',
                      borderRadius: '10px',
                      padding: '12px 14px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600, color: '#1e293b' }}>
                          <input 
                            type="checkbox"
                            checked={ev.confirmed}
                            onChange={(e) => {
                              const val = e.target.checked;
                              setDeclaredEvidences(prev => ({ ...prev, [key]: { ...ev, confirmed: val } }));
                            }}
                            style={{ width: '18px', height: '18px', accentColor: '#8b5cf6', cursor: 'pointer' }}
                          />
                          <span>🚀 {proj.name}</span>
                        </label>
                        <span style={{ fontSize: '11px', color: ev.confirmed ? '#7c3aed' : '#94a3b8', fontWeight: 500 }}>
                          {ev.confirmed ? '✓ Đã chọn bổ sung' : 'Chưa chọn'}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', paddingLeft: '28px' }}>
                        {proj.desc}
                      </div>

                      {ev.confirmed && (
                        <div style={{ marginTop: '10px', paddingLeft: '28px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div>
                            <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '3px' }}>Link Repo / Demo dự án:</label>
                            <input 
                              type="text"
                              className="input-control"
                              placeholder="https://github.com/... hoặc link website sản phẩm"
                              value={ev.reference_link || ''}
                              onChange={(e) => setDeclaredEvidences(prev => ({ ...prev, [key]: { ...ev, reference_link: e.target.value } }))}
                              style={{ fontSize: '0.82rem', padding: '5px 8px' }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '3px' }}>
                              Mô tả dự án theo chuẩn STAR (Tình huống - Nhiệm vụ - Hành động - Kết quả):
                            </label>
                            <textarea 
                              className="input-control"
                              rows="2"
                              placeholder="Mô tả cụ thể vai trò cá nhân, công nghệ áp dụng và kết quả đạt được..."
                              value={ev.description || ''}
                              onChange={(e) => setDeclaredEvidences(prev => ({ ...prev, [key]: { ...ev, description: e.target.value } }))}
                              style={{ fontSize: '0.82rem', padding: '6px 8px' }}
                            />
                          </div>
                          {renderProofUploadBox(key, ev)}
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {activeGapTab === 'education' && (
                optGapsByPillar.education.map(edu => {
                  const key = `edu_${edu.name}`;
                  const ev = declaredEvidences[key] || { confirmed: false, description: '', organization: '', reference_link: '', context_type: 'certification' };
                  return (
                    <div key={key} style={{
                      border: ev.confirmed ? '1.5px solid #8b5cf6' : '1px solid #e2e8f0',
                      background: ev.confirmed ? '#fbf8ff' : '#ffffff',
                      borderRadius: '10px',
                      padding: '12px 14px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600, color: '#1e293b' }}>
                          <input 
                            type="checkbox"
                            checked={ev.confirmed}
                            onChange={(e) => {
                              const val = e.target.checked;
                              setDeclaredEvidences(prev => ({ ...prev, [key]: { ...ev, confirmed: val } }));
                            }}
                            style={{ width: '18px', height: '18px', accentColor: '#8b5cf6', cursor: 'pointer' }}
                          />
                          <span>🎓 {edu.name}</span>
                        </label>
                        <span style={{ fontSize: '11px', color: ev.confirmed ? '#7c3aed' : '#94a3b8', fontWeight: 500 }}>
                          {ev.confirmed ? '✓ Đã chọn bổ sung' : 'Chưa chọn'}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', paddingLeft: '28px' }}>
                        {edu.desc}
                      </div>

                      {ev.confirmed && (
                        <div style={{ marginTop: '10px', paddingLeft: '28px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                              <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '3px' }}>Trường / Tổ chức cấp:</label>
                              <input 
                                type="text"
                                className="input-control"
                                placeholder="Tên trường ĐH hoặc tổ chức cấp chứng chỉ"
                                value={ev.organization || ''}
                                onChange={(e) => setDeclaredEvidences(prev => ({ ...prev, [key]: { ...ev, organization: e.target.value } }))}
                                style={{ fontSize: '0.82rem', padding: '5px 8px' }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '3px' }}>Link chứng chỉ / Credential:</label>
                              <input 
                                type="text"
                                className="input-control"
                                placeholder="Link xác thực chứng chỉ online"
                                value={ev.reference_link || ''}
                                onChange={(e) => setDeclaredEvidences(prev => ({ ...prev, [key]: { ...ev, reference_link: e.target.value } }))}
                                style={{ fontSize: '0.82rem', padding: '5px 8px' }}
                              />
                            </div>
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '3px' }}>Chi tiết chuyên ngành / Điểm số:</label>
                            <textarea 
                              className="input-control"
                              rows="2"
                              placeholder="Chuyên ngành tốt nghiệp, GPA hoặc điểm thi chứng chỉ..."
                              value={ev.description || ''}
                              onChange={(e) => setDeclaredEvidences(prev => ({ ...prev, [key]: { ...ev, description: e.target.value } }))}
                              style={{ fontSize: '0.82rem', padding: '6px 8px' }}
                            />
                          </div>
                          {renderProofUploadBox(key, ev)}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ fontWeight: 600, color: '#334155' }}>Ghi chú bổ sung cho AI biên tập (Tùy chọn):</label>
              <textarea 
                className="input-control" 
                rows="2"
                placeholder="Ví dụ: Nhấn mạnh vào khả năng viết kiểm thử tự động, kỹ năng làm việc nhóm..."
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                style={{ fontSize: '0.88rem' }}
              />
            </div>

            {error && <div className="alert alert--error" style={{ marginBottom: '16px' }}>{error}</div>}

            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn btn--outline" onClick={() => setStep('result')}>Hủy</button>
              <button 
                className="btn btn--primary ai-btn-primary" 
                onClick={handleProceedToAudit}
                disabled={isAuditing}
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', borderColor: '#8b5cf6', padding: '10px 24px', fontWeight: 600 }}
              >
                {isAuditing ? '⏳ Đang thẩm định bằng chứng...' : 'Tiến hành Thẩm định & Kiểm tra nhanh ➔'}
              </button>
            </div>
          </div>
        )}

        {/* STEP: THỬ THÁCH KỸ THUẬT NHANH (QUICK TECH CHECK) */}
        {step === 'quick-tech-check' && (
          <div className="ai-apply-step" style={{ padding: '8px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <button 
                className="btn btn--ghost btn--sm" 
                onClick={() => setStep('confirm-gaps')}
                style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                ← Quay lại
              </button>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>
                🎯 Thử thách Kỹ thuật Nhanh (Quick Tech Check)
              </h3>
            </div>

            <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '10px', padding: '14px 16px', marginBottom: '14px' }}>
              <div style={{ fontWeight: 600, color: '#6d28d9', marginBottom: '4px', fontSize: '0.92rem' }}>
                ⚡ Kiểm tra xác thực năng lực thực tế:
              </div>
              <p style={{ margin: 0, fontSize: '0.86rem', color: '#5b21b6', lineHeight: 1.5 }}>
                Vui lòng trả lời 2 câu hỏi trắc nghiệm tình huống thực tế dưới đây để xác nhận kiến thức. Kết quả thẩm định tệp minh chứng và bài kiểm tra sẽ được ghi nhận vào <strong>Nhật ký Minh bạch (Audit Trail)</strong>.
              </p>
            </div>

            {/* KẾT QUẢ THẨM ĐỊNH TỆP & BẰNG CHỨNG TỨC THÌ TỪ AI VISION */}
            {auditOverview?.audited_evidences && auditOverview.audited_evidences.length > 0 && (
              <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#334155' }}>
                  🔍 Kết quả AI kiểm định tệp / bằng chứng vừa gửi:
                </div>
                {auditOverview.audited_evidences.map((ae, aidx) => {
                  const isRejected = ae.verdict === 'insufficient' || ae.credibility_score < 0.5;
                  return (
                    <div key={aidx} style={{
                      background: isRejected ? '#fef2f2' : '#f0fdf4',
                      border: `1.5px solid ${isRejected ? '#fca5a5' : '#86efac'}`,
                      borderRadius: '10px',
                      padding: '10px 14px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', gap: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.88rem', color: isRejected ? '#991b1b' : '#166534' }}>
                          {isRejected ? '❌' : '✅'} {ae.criterion_name}
                        </span>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: isRejected ? '#fee2e2' : '#dcfce7',
                          color: isRejected ? '#b91c1c' : '#15803d',
                          whiteSpace: 'nowrap'
                        }}>
                          {isRejected ? `Không hợp lệ / Từ chối (${Math.round(ae.credibility_score * 100)}%)` : `Hợp lệ (${Math.round(ae.credibility_score * 100)}%)`}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: isRejected ? '#b91c1c' : '#15803d', lineHeight: 1.45 }}>
                        {ae.audit_reason}
                      </div>
                    </div>
                  );
                })}
                {auditOverview.can_proceed === false && (
                  <div style={{ background: '#fff1f2', border: '1px solid #fda4af', borderRadius: '8px', padding: '10px 12px', fontSize: '0.83rem', color: '#9f1239', fontWeight: 600 }}>
                    ⚠️ Cảnh báo: Tất cả minh chứng bạn vừa gửi đều bị từ chối do nội dung tệp/mô tả không khớp với tiêu chí đã chọn. Vui lòng bấm "← Quay lại" để bổ sung đúng tài liệu; nếu vẫn tiếp tục, hệ thống sẽ giữ nguyên điểm gốc ban đầu.
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '360px', overflowY: 'auto', paddingRight: '4px', marginBottom: '16px' }}>
              {challengeQuestions.map((q, qidx) => (
                <div key={q.id} style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ background: '#8b5cf6', color: '#ffffff', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px' }}>
                      Câu {qidx + 1}
                    </span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#6d28d9' }}>{q.criterion_name}</span>
                  </div>
                  <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.92rem', marginBottom: '12px', lineHeight: 1.5 }}>
                    {q.question}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {q.options.map((opt, optIdx) => {
                      const isSelected = challengeAnswers[q.id] === optIdx;
                      return (
                        <label
                          key={optIdx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 14px',
                            background: isSelected ? '#ede9fe' : '#ffffff',
                            border: isSelected ? '1.5px solid #8b5cf6' : '1px solid #cbd5e1',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.88rem',
                            color: isSelected ? '#5b21b6' : '#334155',
                            fontWeight: isSelected ? 600 : 400,
                            transition: 'all 0.15s'
                          }}
                        >
                          <input
                            type="radio"
                            name={`q_${q.id}`}
                            checked={isSelected}
                            onChange={() => setChallengeAnswers(prev => ({ ...prev, [q.id]: optIdx }))}
                            style={{ accentColor: '#8b5cf6' }}
                          />
                          <span>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {error && <div className="alert alert--error" style={{ marginBottom: '16px' }}>{error}</div>}

            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn btn--outline" onClick={() => setStep('confirm-gaps')}>Quay lại</button>
              <button 
                className="btn btn--primary ai-btn-primary" 
                onClick={() => handleRunOptimizationWithVerified()}
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', borderColor: '#8b5cf6', padding: '10px 24px', fontWeight: 600 }}
              >
                <span>🪄</span> Hoàn tất kiểm tra & Tái tính điểm AI
              </button>
            </div>
          </div>
        )}

        {/* STEP: ĐANG TỐI ƯU HÓA */}
        {step === 'optimizing' && (
          <div className="ai-apply-step ai-apply-step--center" style={{ padding: '50px 0' }}>
            <div className="spinner spinner--lg" style={{ marginBottom: '24px', borderTopColor: '#8b5cf6' }}></div>
            <h3 style={{ fontSize: '1.35rem', color: '#1e293b', marginBottom: '8px' }}>
              🪄 Gemini AI đang thẩm định & tối ưu hóa CV...
            </h3>
            <div style={{ color: '#64748b', fontSize: '0.92rem', maxWidth: '440px', margin: '0 auto', lineHeight: 1.6 }}>
              <div>• Thẩm định tính logic & đối chứng của bằng chứng bổ sung</div>
              <div>• Chấm điểm bài kiểm tra kỹ thuật nhanh (Quick Tech Check)</div>
              <div>• Tái cấu trúc mô tả dự án theo chuẩn <strong>STAR</strong></div>
              <div>• Chạy Scoring Engine tính điểm chuẩn xác 4 Trụ cột...</div>
            </div>
          </div>
        )}

        {/* STEP 3: MÀN HÌNH SO SÁNH BEFORE / AFTER (DIFF VIEW) & AUDIT TRAIL */}
        {step === 'optimized-diff' && optimizedResult && (
          <div className="ai-apply-step" style={{ padding: '4px 0' }}>
            {/* Banner Điểm số Trước & Sau */}
            <div style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
              borderRadius: '14px',
              padding: '18px 24px',
              color: '#ffffff',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.25)'
            }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                  Kết quả Tối ưu hóa & Thẩm định Bằng chứng AI
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '2px' }}>
                  Vị trí: {job.title}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Điểm CV ban đầu</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f87171' }}>
                    {Math.round(result.match_score)}%
                  </div>
                </div>

                <div style={{ fontSize: '1.6rem', color: '#818cf8' }}>➔</div>

                <div style={{ 
                  textAlign: 'center', 
                  background: 'rgba(16, 185, 129, 0.2)', 
                  border: '1.5px solid #10b981', 
                  borderRadius: '12px', 
                  padding: '6px 16px' 
                }}>
                  <div style={{ fontSize: '0.75rem', color: '#a7f3d0' }}>Điểm xác thực sau thẩm định</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#34d399' }}>
                    {Math.round(optimizedResult.predicted_match_score)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs Chế độ xem: Diff vs Audit Trail vs Editor */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', marginBottom: '16px' }}>
              <button 
                onClick={() => setActiveDiffTab('diff')}
                style={{
                  padding: '8px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeDiffTab === 'diff' ? '2px solid #8b5cf6' : '2px solid transparent',
                  color: activeDiffTab === 'diff' ? '#7c3aed' : '#64748b',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                📊 So sánh Trước & Sau (Diff View)
              </button>
              <button 
                onClick={() => setActiveDiffTab('audit')}
                style={{
                  padding: '8px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeDiffTab === 'audit' ? '2px solid #8b5cf6' : '2px solid transparent',
                  color: activeDiffTab === 'audit' ? '#7c3aed' : '#64748b',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                📋 Nhật ký Thẩm định & Minh bạch (Audit Trail)
              </button>
              <button 
                onClick={() => setActiveDiffTab('editor')}
                style={{
                  padding: '8px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: activeDiffTab === 'editor' ? '2px solid #8b5cf6' : '2px solid transparent',
                  color: activeDiffTab === 'editor' ? '#7c3aed' : '#64748b',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                ✏️ Biên tập nội dung tối ưu
              </button>
            </div>

            {/* TAB 1: SO SÁNH HAI CỘT */}
            {activeDiffTab === 'diff' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                {/* CỘT TRÁI: CV GỐC */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontWeight: 700, color: '#64748b', fontSize: '0.9rem' }}>📄 CV BAN ĐẦU</span>
                    <span style={{ background: '#fee2e2', color: '#b91c1c', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '6px' }}>
                      Điểm: {Math.round(result.match_score)}%
                    </span>
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Tóm tắt nghề nghiệp</div>
                    <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '4px', lineHeight: 1.5, background: '#ffffff', padding: '10px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                      {currentCand?.cv_text ? currentCand.cv_text.split('\n').find(l => l.includes('Tóm tắt:'))?.replace('Tóm tắt:', '').trim() || 'Chuyên viên Công nghệ thông tin...' : 'Chưa có tóm tắt'}
                    </div>
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Kỹ năng ban đầu ({currentCand?.parsed_skills?.length || 0})</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                      {(currentCand?.parsed_skills || []).map((s, idx) => (
                        <span key={idx} style={{ background: '#e2e8f0', color: '#475569', fontSize: '11px', padding: '3px 8px', borderRadius: '6px' }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>Dự án đã khai báo</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                      {(currentCand?.project_descriptions || []).map((p, idx) => (
                        <div key={idx} style={{ background: '#ffffff', padding: '10px', borderRadius: '8px', fontSize: '0.82rem', color: '#475569', border: '1px solid #f1f5f9' }}>
                          {typeof p === 'string' ? p : JSON.stringify(p)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* CỘT PHẢI: BẢN AI TỐI ƯU */}
                <div style={{ background: '#fdfbff', border: '1.5px solid #c084fc', borderRadius: '12px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontWeight: 700, color: '#7c3aed', fontSize: '0.9rem' }}>✨ BẢN TỐI ƯU BỞI AI</span>
                    <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px' }}>
                      Dự kiến: {Math.round(optimizedResult.predicted_match_score)}%
                    </span>
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#7c3aed', textTransform: 'uppercase' }}>Tóm tắt chuẩn ATS & Mục tiêu JD</div>
                    <div style={{ fontSize: '0.85rem', color: '#1e293b', marginTop: '4px', lineHeight: 1.5, background: '#ffffff', padding: '10px', borderRadius: '8px', border: '1px solid #f3e8ff' }}>
                      {editedSummary}
                    </div>
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#7c3aed', textTransform: 'uppercase' }}>Kỹ năng tối ưu ({editedSkills.length})</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                      {editedSkills.map((s, idx) => {
                        const isAdded = (optimizedResult.added_keywords || []).map(k => k.toLowerCase()).includes(String(s).toLowerCase());
                        return (
                          <span 
                            key={idx} 
                            style={{ 
                              background: isAdded ? '#dcfce7' : '#ede9fe', 
                              color: isAdded ? '#15803d' : '#6d28d9', 
                              fontWeight: isAdded ? 700 : 500,
                              fontSize: '11px', 
                              padding: '3px 8px', 
                              borderRadius: '6px',
                              border: isAdded ? '1px solid #86efac' : 'none'
                            }}
                          >
                            {isAdded ? `+ ${s}` : s}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#7c3aed', textTransform: 'uppercase' }}>Dự án biên tập chuẩn STAR</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                      {editedProjects.map((p, idx) => (
                        <div key={idx} style={{ background: '#ffffff', padding: '10px', borderRadius: '8px', fontSize: '0.82rem', color: '#1e293b', border: '1px solid #f3e8ff' }}>
                          <div style={{ fontWeight: 700, color: '#4338ca' }}>{p.name} - <span style={{ fontWeight: 500, color: '#64748b' }}>{p.role}</span></div>
                          <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
                            {(p.bullet_points || []).map((bp, bidx) => (
                              <li key={bidx} style={{ marginBottom: '4px', lineHeight: 1.4 }}>{bp}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: NHẬT KÝ THẨM ĐỊNH & MINH BẠCH (AUDIT TRAIL) */}
            {activeDiffTab === 'audit' && (
              <div style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px 16px' }}>
                    <div style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 600 }}>ĐỘ TIN CẬY THẨM ĐỊNH (CREDIBILITY)</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>
                      {Math.round((optimizedResult.audit_trail?.overall_credibility || 0.8) * 100)}%
                    </div>
                    <div style={{ fontSize: '11px', color: '#166534', marginTop: '2px' }}>
                      Được thẩm định dựa trên tính logic kỹ thuật & mốc thời gian.
                    </div>
                  </div>

                  <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '10px', padding: '12px 16px' }}>
                    <div style={{ fontSize: '0.8rem', color: '#6d28d9', fontWeight: 600 }}>KẾT QUẢ QUICK TECH CHECK</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#5b21b6', marginTop: '4px' }}>
                      {optimizedResult.audit_trail?.challenge_results?.summary || 'Đạt yêu cầu xác thực'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6d28d9', marginTop: '2px' }}>
                      Bài kiểm tra 2 câu hỏi trắc nghiệm tình huống thực tế.
                    </div>
                  </div>
                </div>

                {/* BẢNG BẰNG CHỨNG ĐÃ THẨM ĐỊNH */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1e293b', marginBottom: '8px' }}>
                    🔍 Chi tiết bằng chứng ứng viên đã khai báo:
                  </div>
                  {optimizedResult.audit_trail?.audited_evidences && optimizedResult.audit_trail.audited_evidences.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {optimizedResult.audit_trail.audited_evidences.map((item, idx) => {
                        const isRejected = item.verdict === 'insufficient' || item.credibility_score < 0.45;
                        const isHigh = !isRejected && item.verdict === 'verified_high';
                        const isPlausible = !isRejected && item.verdict === 'verified_plausible';
                        return (
                          <div key={idx} style={{
                            background: isRejected ? '#fef2f2' : '#ffffff',
                            border: `1px solid ${isRejected ? '#fca5a5' : '#e2e8f0'}`,
                            borderRadius: '10px',
                            padding: '12px 14px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                              <span style={{ fontWeight: 700, color: isRejected ? '#991b1b' : '#1e293b', fontSize: '0.9rem' }}>
                                {item.pillar === 'skills' ? '⚡' : (item.pillar === 'experience' ? '💼' : (item.pillar === 'projects' ? '🚀' : '🎓'))} {item.criterion_name}
                              </span>
                              <span style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                padding: '3px 8px',
                                borderRadius: '6px',
                                background: isRejected ? '#fee2e2' : (isHigh ? '#dcfce7' : (isPlausible ? '#e0e7ff' : '#fef3c7')),
                                color: isRejected ? '#b91c1c' : (isHigh ? '#15803d' : (isPlausible ? '#4338ca' : '#b45309'))
                              }}>
                                {isRejected ? '✕ Không hợp lệ / Từ chối' : (isHigh ? '✓ Xác thực cao' : (isPlausible ? '✓ Hợp lý / Có cơ sở' : '⚠ Ghi nhận một phần'))} ({Math.round(item.credibility_score * 100)}%)
                              </span>
                            </div>
                            <div style={{ fontSize: '0.82rem', color: '#475569', marginBottom: '4px' }}>
                              <strong>Đánh giá của AI:</strong> {item.audit_reason}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic', background: '#f8fafc', padding: '6px 10px', borderRadius: '6px' }}>
                              " {item.evidence_quote} "
                            </div>
                            {item.evidence_file_url && (
                              <div style={{ marginTop: '8px' }}>
                                <a 
                                  href={getAvatarUrl(item.evidence_file_url)}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    color: '#15803d',
                                    background: '#dcfce7',
                                    padding: '3px 10px',
                                    borderRadius: '6px',
                                    textDecoration: 'none'
                                  }}
                                  title="Xem tệp / ảnh minh chứng gốc"
                                >
                                  📎 Xem tệp minh chứng: {item.evidence_file_name || 'Tài liệu đối chứng'} ↗
                                </a>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', color: '#64748b', fontSize: '0.88rem' }}>
                      Bản CV này được tối ưu hóa cấu trúc câu từ STAR trực tiếp từ hồ sơ gốc của bạn.
                    </div>
                  )}
                </div>

                {/* BỘ CÂU HỎI PHỎNG VẤN GỢI Ý CHO RECRUITER */}
                {optimizedResult.interview_probe_kit && optimizedResult.interview_probe_kit.length > 0 && (
                  <div style={{ background: '#fbf8ff', border: '1px solid #ddd6fe', borderRadius: '10px', padding: '14px', marginTop: '12px' }}>
                    <div style={{ fontWeight: 700, color: '#5b21b6', fontSize: '0.88rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>🎯</span> Bộ câu hỏi kiểm chứng do AI gợi ý cho Nhà tuyển dụng khi phỏng vấn:
                    </div>
                    <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
                      {optimizedResult.interview_probe_kit.map((q, idx) => (
                        <li key={idx} style={{ fontSize: '0.82rem', color: '#4c1d95', marginBottom: '4px', lineHeight: 1.4 }}>
                          {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: BIÊN TẬP TRỰC TIẾP */}
            {activeDiffTab === 'editor' && (
              <div style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label style={{ fontWeight: 600, color: '#334155' }}>Tóm tắt chuyên môn (Professional Summary):</label>
                  <textarea 
                    className="input-control" 
                    rows="3"
                    value={editedSummary}
                    onChange={(e) => setEditedSummary(e.target.value)}
                    style={{ fontSize: '0.9rem', lineHeight: 1.5 }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label style={{ fontWeight: 600, color: '#334155' }}>Danh sách kỹ năng (Phân cách bởi dấu phẩy):</label>
                  <input 
                    type="text"
                    className="input-control"
                    value={editedSkills.join(', ')}
                    onChange={(e) => setEditedSkills(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    style={{ fontSize: '0.9rem' }}
                  />
                </div>

                <div style={{ fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Dự án theo chuẩn STAR:</div>
                {editedProjects.map((p, idx) => (
                  <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', marginBottom: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                      <input 
                        type="text"
                        className="input-control"
                        placeholder="Tên dự án"
                        value={p.name || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditedProjects(prev => prev.map((item, i) => i === idx ? { ...item, name: val } : item));
                        }}
                      />
                      <input 
                        type="text"
                        className="input-control"
                        placeholder="Vai trò"
                        value={p.role || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditedProjects(prev => prev.map((item, i) => i === idx ? { ...item, role: val } : item));
                        }}
                      />
                    </div>
                    <div>
                      <textarea 
                        className="input-control"
                        rows="3"
                        placeholder="Các gạch đầu dòng STAR (mỗi dòng 1 gạch)"
                        value={(p.bullet_points || []).join('\n')}
                        onChange={(e) => {
                          const lines = e.target.value.split('\n');
                          setEditedProjects(prev => prev.map((item, i) => i === idx ? { ...item, bullet_points: lines } : item));
                        }}
                        style={{ fontSize: '0.85rem' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {error && <div className="alert alert--error" style={{ marginTop: '14px' }}>{error}</div>}

            {/* ACTION FOOTER */}
            <div className="modal-actions" style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button className="btn btn--outline" onClick={() => setStep('confirm-gaps')}>
                ← Quay lại điều chỉnh
              </button>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  className="btn btn--outline" 
                  onClick={handleSaveOnly} 
                  disabled={isSubmitting}
                  style={{ borderColor: '#64748b' }}
                >
                  Lưu vào Thư viện CV
                </button>
                <button 
                  className="btn btn--primary ai-btn-primary" 
                  onClick={handleApplyWithOptimized} 
                  disabled={isSubmitting}
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)', borderColor: '#10b981', padding: '10px 24px', fontWeight: 700 }}
                >
                  {isSubmitting ? 'Đang lưu & Nộp hồ sơ...' : `Lưu & Xác nhận nộp ngay (${Math.round(optimizedResult.predicted_match_score)}%) 🚀`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Form Xác Nhận Lần Cuối (Khi nộp với CV gốc) */}
        {step === 'confirm' && (
          <div className="ai-apply-step ai-apply-step--center" style={{ padding: '20px 0', maxWidth: '480px', margin: '0 auto' }}>
            <div className="confirm-icon">📋</div>
            <h3 className="confirm-title" style={{ fontSize: '1.4rem' }}>Xác nhận nộp hồ sơ</h3>
            <p className="confirm-desc" style={{ fontSize: '0.95rem', color: '#475569', marginBottom: '20px' }}>
              Bạn có chắc chắn muốn nộp hồ sơ cho vị trí <strong>{job.title}</strong>?
            </p>
            <div className="confirm-highlight-box" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', textAlign: 'left', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>🎯</span>
                <span style={{ fontSize: '1.05rem' }}>Độ phù hợp AI: <strong style={{ color: '#10b981' }}>{Math.round(result?.match_score || 0)}%</strong> ({result?.match_level})</span>
              </div>
              <div style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '6px' }}>
                🏢 Đơn vị: <strong>{job.department || 'APEX IT'}</strong> — 📍 {job.location || 'Hồ Chí Minh'}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#64748b', lineHeight: '1.5', borderTop: '1px solid #e2e8f0', paddingTop: '8px', marginTop: '8px' }}>
                ℹ️ Toàn bộ đánh giá chi tiết kỹ năng và dữ liệu phân tích sẽ được chuyển thẳng đến Nhà tuyển dụng để đánh giá vòng sơ tuyển.
              </div>
            </div>

            {error && <div className="alert alert--error" style={{ marginBottom: '16px', width: '100%' }}>{error}</div>}

            <div className="confirm-actions" style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button className="btn btn--outline" onClick={() => setStep('result')} disabled={isSubmitting} style={{ flex: 1, padding: '12px' }}>
                Quay lại xem lại
              </button>
              <button className="btn btn--primary ai-btn-primary" onClick={handleFinalSubmit} disabled={isSubmitting} style={{ flex: 1.4, padding: '12px' }}>
                {isSubmitting ? 'Đang gửi hồ sơ...' : 'Xác nhận nộp ngay 🚀'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Màn Hình Nộp Hồ Sơ Thành Công */}
        {step === 'success' && (
          <div className="ai-apply-step ai-apply-step--center" style={{ padding: '24px 0', maxWidth: '480px', margin: '0 auto' }}>
            <div style={{ fontSize: '4.5rem', marginBottom: '16px' }}>🎉</div>
            <h2 className="ai-apply-title" style={{ color: '#10b981', marginBottom: '8px' }}>
              Nộp hồ sơ ứng tuyển thành công!
            </h2>
            <p style={{ color: '#475569', fontSize: '1rem', maxWidth: '440px', margin: '0 auto 24px', lineHeight: '1.6' }}>
              Hồ sơ của bạn đã được chuyển tới bộ phận tuyển dụng <strong>{job.department || 'APEX IT'}</strong> kèm theo toàn bộ phân tích độ phù hợp từ AI.
            </p>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '14px 20px', borderRadius: '12px', display: 'inline-block', marginBottom: '28px', textAlign: 'left', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ fontSize: '0.88rem', color: '#64748b' }}>Vị trí ứng tuyển:</div>
              <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '1.05rem', marginTop: '2px' }}>{job.title}</div>
              <div style={{ marginTop: '6px', fontSize: '0.88rem', color: '#10b981', fontWeight: 600 }}>
                ✓ Độ phù hợp AI: {Math.round(result?.match_score || 0)}% ({result?.match_level})
              </div>
            </div>
            <div>
              <button className="btn btn--primary ai-btn-primary" onClick={onClose} style={{ padding: '12px 36px', fontSize: '1rem' }}>
                Hoàn tất & Đóng
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
