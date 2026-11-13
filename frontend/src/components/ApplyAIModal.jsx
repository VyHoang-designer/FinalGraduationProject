import { useState, useEffect, useRef } from 'react';
import { fetchMyCVs, runMatch1To1, uploadCV, applyJob, optimizeCVForJD, saveOptimizedCV } from '../services/api';

export default function ApplyAIModal({ job, currentUser, onClose, onApplied }) {
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [fileToUpload, setFileToUpload] = useState(null);
  
  const [step, setStep] = useState('select-cv'); // 'select-cv' | 'analyzing' | 'result' | 'confirm-gaps' | 'optimizing' | 'optimized-diff' | 'confirm' | 'success'
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // AI Optimization state
  const [optMissingSkills, setOptMissingSkills] = useState([]);
  const [confirmedGaps, setConfirmedGaps] = useState({});
  const [customInstructions, setCustomInstructions] = useState('');
  const [optimizedResult, setOptimizedResult] = useState(null);
  const [editedSummary, setEditedSummary] = useState('');
  const [editedSkills, setEditedSkills] = useState([]);
  const [editedProjects, setEditedProjects] = useState([]);
  const [activeDiffTab, setActiveDiffTab] = useState('diff'); // 'diff' | 'editor'
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Tải danh sách CV của user hiện tại
    if (currentUser?.id) {
      fetchMyCVs(currentUser.id).then(data => {
        setCandidates(data);
        if (data.length > 0) setSelectedCandidateId(data[0].id);
      }).catch(err => {
        setError('Lỗi khi tải danh sách CV: ' + err.message);
      });
    }
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

  // Khởi động luồng AI Tối ưu lại CV
  function handleStartOptimize() {
    setError(null);
    const cand = candidates.find(c => c.id == (result?._usedCandidateId || selectedCandidateId)) || result?._usedCandidate;
    const candSkillsLower = (cand?.parsed_skills || []).map(s => String(s).toLowerCase().trim());
    
    const missing = [];
    // 1. Quét kỹ năng yêu cầu từ JD
    if (job?.required_skills) {
      job.required_skills.forEach(s => {
        const sName = typeof s === 'string' ? s : s.skill;
        if (sName && !candSkillsLower.includes(sName.toLowerCase().trim())) {
          missing.push(sName.trim());
        }
      });
    }

    // 2. Quét từ gaps
    if (result?.gaps) {
      result.gaps.forEach(g => {
        if (g.category === 'skill' && g.message) {
          const match = g.message.match(/chưa có:\s*([^\n\.]+)/i);
          if (match && match[1]) {
            match[1].split(',').forEach(sk => {
              const clean = sk.trim();
              if (clean && !missing.map(m => m.toLowerCase()).includes(clean.toLowerCase())) {
                missing.push(clean);
              }
            });
          }
        }
      });
    }

    // 3. Quét từ skill_details Mức 0
    if (result?.skill_details) {
      result.skill_details.forEach(sd => {
        if ((sd.level === 'Mức 0' || sd.m === 0) && sd.skill) {
          const clean = sd.skill.trim();
          if (!missing.map(m => m.toLowerCase()).includes(clean.toLowerCase())) {
            missing.push(clean);
          }
        }
      });
    }

    const initialGaps = {};
    missing.forEach(sk => {
      initialGaps[sk] = { confirmed: false, note: '' };
    });

    setOptMissingSkills(missing);
    setConfirmedGaps(initialGaps);
    setStep('confirm-gaps');
  }

  // Gọi API tối ưu hóa CV
  async function handleRunOptimization() {
    setError(null);
    setStep('optimizing');
    
    const cvId = result?._usedCandidateId || selectedCandidateId;
    const confirmedList = Object.entries(confirmedGaps)
      .filter(([_, v]) => v.confirmed)
      .map(([k, v]) => ({
        skill: k,
        user_note: v.note || 'Đã có kiến thức nền tảng và bài tập thực hành'
      }));

    try {
      const optRes = await optimizeCVForJD(cvId, {
        jd_id: Number(job.id),
        user_confirmed_gaps: confirmedList,
        custom_instructions: customInstructions.trim() || null
      });

      setOptimizedResult(optRes);
      setEditedSummary(optRes.optimized_summary || '');
      setEditedSkills(optRes.optimized_skills || []);
      setEditedProjects(optRes.optimized_projects || []);
      setStep('optimized-diff');
    } catch (err) {
      setError('Lỗi khi tối ưu hóa CV: ' + (err.message || 'Không thể kết nối dịch vụ AI'));
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

      // 2. Nộp đơn với bản CV mới này và điểm số tối ưu cao
      await applyJob({
        user_id: currentUser?.id ? Number(currentUser.id) : null,
        cv_id: Number(savedCand.id),
        jd_id: Number(job.id),
        match_score: optimizedResult?.predicted_match_score || 82.0,
        match_level: optimizedResult?.predicted_match_level || 'Rất phù hợp',
        feature_details: result?.feature_details,
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

            {/* Đánh giá kỹ năng AI (Gemini LLM) */}
            {result.skill_details && result.skill_details.length > 0 && (
              <div className="ai-result-section" style={{ marginTop: '24px' }}>
                <div className="ai-result-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🤖</span> ĐÁNH GIÁ KỸ NĂNG AI (GEMINI LLM)
                </div>
                <div className="feature-table" style={{ marginTop: '10px' }}>
                  <div className="feature-table__header" style={{ gridTemplateColumns: '1.2fr 0.8fr 2fr' }}>
                    <span>KỸ NĂNG & TRỌNG SỐ</span>
                    <span>MỨC ĐỘ (M)</span>
                    <span>LÝ DO & BẰNG CHỨNG TỪ CV</span>
                  </div>
                  {result.skill_details.map((s, idx) => (
                    <div key={idx} className="feature-table__row" style={{ gridTemplateColumns: '1.2fr 0.8fr 2fr' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{s.skill}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>Trọng Số: {s.importance === 'core' ? 'Cốt Lõi (x3)' : s.importance === 'supporting' ? 'Bổ Trợ (x2)' : 'Ưu Tiên (x1)'}</div>
                      </div>
                      <div>
                        <span style={{ 
                          fontSize: '11px', 
                          fontWeight: 700, 
                          color: s.level === 'Mức 3' ? '#15803d' : s.level === 'Mức 2' ? '#0369a1' : s.level === 'Mức 1' ? '#b45309' : '#b91c1c',
                          background: s.level === 'Mức 3' ? '#dcfce7' : s.level === 'Mức 2' ? '#e0f2fe' : s.level === 'Mức 1' ? '#fef3c7' : '#fee2e2',
                          padding: '3px 8px',
                          borderRadius: '6px'
                        }}>
                          {s.level} (m={s.m})
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#475569', lineHeight: 1.4 }}>
                        <strong>Lý do:</strong> {s.reason || 'Không có mô tả'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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

        {/* STEP: XÁC NHẬN KHOẢNG TRỐNG KỸ NĂNG (GAP CLARIFICATION) */}
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
                🎯 Xác nhận kỹ năng bổ sung cho vị trí {job.title}
              </h3>
            </div>

            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '14px 16px', marginBottom: '20px' }}>
              <div style={{ fontWeight: 600, color: '#166534', marginBottom: '4px', fontSize: '0.95rem' }}>
                🛡️ Nguyên tắc Trung thực (Zero-Hallucination):
              </div>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#15803d', lineHeight: 1.5 }}>
                AI sẽ giúp bạn viết lại CV chuẩn ATS & STAR bám sát vị trí đang tuyển. Hãy đánh dấu chọn những kỹ năng mà bạn <strong>ĐÃ TỪNG học tập, làm đồ án hoặc tự nghiên cứu</strong> để AI đưa vào hồ sơ một cách xác thực nhất.
              </p>
            </div>

            {optMissingSkills.length > 0 ? (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '10px', color: '#334155' }}>
                  Kỹ năng JD yêu cầu nhưng chưa xuất hiện trong CV của bạn:
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
                  {optMissingSkills.map((sk) => {
                    const isChecked = confirmedGaps[sk]?.confirmed || false;
                    return (
                      <div 
                        key={sk}
                        style={{
                          border: isChecked ? '1.5px solid #8b5cf6' : '1px solid #e2e8f0',
                          background: isChecked ? '#fbf8ff' : '#ffffff',
                          borderRadius: '10px',
                          padding: '12px 14px',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600, color: '#1e293b' }}>
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const val = e.target.checked;
                                setConfirmedGaps(prev => ({
                                  ...prev,
                                  [sk]: { ...prev[sk], confirmed: val }
                                }));
                              }}
                              style={{ width: '18px', height: '18px', accentColor: '#8b5cf6', cursor: 'pointer' }}
                            />
                            <span>{sk}</span>
                          </label>
                          <span style={{ fontSize: '11px', color: isChecked ? '#7c3aed' : '#94a3b8', fontWeight: 500 }}>
                            {isChecked ? '✓ Đã xác nhận' : 'Chưa chọn'}
                          </span>
                        </div>

                        {isChecked && (
                          <div style={{ marginTop: '8px', paddingLeft: '28px' }}>
                            <input 
                              type="text"
                              className="input-control"
                              placeholder="Ghi chú kinh nghiệm (vd: Đã làm đồ án môn học, tự làm project...)"
                              value={confirmedGaps[sk]?.note || ''}
                              onChange={(e) => {
                                const noteVal = e.target.value;
                                setConfirmedGaps(prev => ({
                                  ...prev,
                                  [sk]: { ...prev[sk], note: noteVal }
                                }));
                              }}
                              style={{ fontSize: '0.85rem', padding: '6px 10px', height: 'auto' }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', marginBottom: '20px', color: '#475569', fontSize: '0.9rem' }}>
                ✨ Hồ sơ của bạn đã có đủ các kỹ năng cơ bản! AI sẽ tập trung tối ưu hóa cách hành văn theo chuẩn STAR và lồng ghép từ khóa ATS.
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ fontWeight: 600, color: '#334155' }}>Yêu cầu riêng cho AI biên tập (Tùy chọn):</label>
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
                onClick={handleRunOptimization}
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', borderColor: '#8b5cf6', padding: '10px 24px', fontWeight: 600 }}
              >
                <span>🪄</span> Bắt đầu Tối ưu hóa bằng AI
              </button>
            </div>
          </div>
        )}

        {/* STEP: ĐANG TỐI ƯU HÓA */}
        {step === 'optimizing' && (
          <div className="ai-apply-step ai-apply-step--center" style={{ padding: '50px 0' }}>
            <div className="spinner spinner--lg" style={{ marginBottom: '24px', borderTopColor: '#8b5cf6' }}></div>
            <h3 style={{ fontSize: '1.35rem', color: '#1e293b', marginBottom: '8px' }}>
              🪄 Gemini AI đang tối ưu hóa CV của bạn...
            </h3>
            <div style={{ color: '#64748b', fontSize: '0.92rem', maxWidth: '420px', margin: '0 auto', lineHeight: 1.6 }}>
              <div>• Phân tích từ khóa trọng tâm của <strong>{job.title}</strong></div>
              <div>• Tái cấu trúc mô tả dự án theo phương pháp <strong>STAR</strong></div>
              <div>• Chạy mô hình Random Forest tái đánh giá điểm phù hợp...</div>
            </div>
          </div>
        )}

        {/* STEP 3: MÀN HÌNH SO SÁNH BEFORE / AFTER (DIFF VIEW) */}
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
                  Kết quả Tối ưu hóa cùng Gemini AI
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '2px' }}>
                  Vị trí: {job.title}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Điểm cũ</div>
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
                  <div style={{ fontSize: '0.75rem', color: '#a7f3d0' }}>Điểm dự kiến mới</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#34d399' }}>
                    {Math.round(optimizedResult.predicted_match_score)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Các điểm cải tiến nổi bật */}
            {optimizedResult.changes_summary && optimizedResult.changes_summary.length > 0 && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px' }}>
                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#334155', marginBottom: '6px' }}>
                  ✨ Cải tiến nổi bật từ AI:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {optimizedResult.changes_summary.map((c, idx) => (
                    <div key={idx} style={{ fontSize: '0.85rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span> {c}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tabs Chế độ xem: So sánh Trước/Sau vs Biên tập trực tiếp */}
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

            {/* TAB 2: BIÊN TẬP TRỰC TIẾP */}
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
