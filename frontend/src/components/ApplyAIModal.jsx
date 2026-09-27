import { useState, useEffect, useRef } from 'react';
import { fetchMyCVs, runMatch1To1, uploadCV } from '../services/api';

export default function ApplyAIModal({ job, currentUser, onClose }) {
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [fileToUpload, setFileToUpload] = useState(null);
  
  const [step, setStep] = useState('select-cv'); // select-cv, analyzing, result
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  
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
        // Optionally update the list so the new CV appears if they go back
        setCandidates(prev => [uploadedCandidate, ...prev]);
      }

      if (!cvIdToMatch) {
        throw new Error('Vui lòng chọn hoặc tải lên một CV.');
      }

      const res = await runMatch1To1(cvIdToMatch, job.id);
      setResult({
        ...res,
        _usedCandidate: cvIdToMatch === selectedCandidateId 
            ? candidates.find(c => c.id == cvIdToMatch) 
            : null // If uploaded, we can fetch from candidates if we updated it, wait, let's just find it.
      });
      // Giả lập delay một xíu cho đẹp hiệu ứng AI
      setTimeout(() => setStep('result'), 800);
    } catch (err) {
      setError(err.message);
      setStep('select-cv');
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

  // Helper to render matched items
  const renderMatchedItems = () => {
    if (!result) return null;
    let matchedExp = null;
    let matchedSkills = [];
    
    // Nếu API trả về feature_details, ta có thể xem skill_match_score hoặc exp_match_score
    // Nhưng vì không có trực tiếp matched list trong API, ta tính tạm ở frontend dựa trên result._usedCandidate
    // Tuy nhiên, result._usedCandidate có thể null nếu vừa upload. Nên ta xử lý tìm lại trong candidates.
    const cand = candidates.find(c => c.id == selectedCandidateId) || result._usedCandidate;
    
    if (cand) {
      if (cand.experience_years >= job.required_experience) {
        matchedExp = `${cand.experience_years} năm kinh nghiệm`;
      }
      if (job.required_skills && cand.parsed_skills) {
        const candSkillsLower = cand.parsed_skills.map(s => s.toLowerCase());
        matchedSkills = job.required_skills.filter(s => candSkillsLower.includes(s.toLowerCase()));
      }
    } else {
       // Nếu không tìm thấy candidate (ví dụ vừa upload), chỉ hiển thị thông báo chung chung nếu score cao
       if (result.match_score >= 50) return <p>Bạn đã đáp ứng được một số yêu cầu cơ bản của vị trí.</p>;
       return <p>Chưa tìm thấy yếu tố cốt lõi nào nổi bật khớp với JD.</p>;
    }

    if (!matchedExp && matchedSkills.length === 0) {
      return <p>Chưa tìm thấy yếu tố cốt lõi nào nổi bật khớp với JD.</p>;
    }

    return (
      <p>
        {matchedExp ? `Đã có: ${matchedExp}` : ''}
        {matchedExp && matchedSkills.length > 0 ? ' | ' : ''}
        {matchedSkills.length > 0 ? `Kỹ năng khớp: ${matchedSkills.join(', ')}` : ''}
      </p>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content ai-apply-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        
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
                  setFileToUpload(null); // Clear file if they select an existing CV
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

        {step === 'analyzing' && (
          <div className="ai-apply-step ai-apply-step--center">
            <div className="spinner spinner--lg" style={{ marginBottom: '20px' }}></div>
            <h3>🤖 AI đang phân tích CV của bạn...</h3>
            <p className="text-secondary">Đang trích xuất kỹ năng và đối chiếu với yêu cầu của nhà tuyển dụng.</p>
          </div>
        )}

        {step === 'result' && result && (
          <div className="ai-apply-step">
            <h2 className="ai-apply-title" style={{ textAlign: 'center' }}>
              🎉 Độ phù hợp: {Math.round(result.match_score)}% - {getMatchText(result.match_score)}
            </h2>
            
            <div className="ai-result-section-title">Độ phù hợp tổng thể</div>
            <div className="ai-apply-score-card">
              <div className="score-circle">
                <svg viewBox="0 0 36 36" className="circular-chart">
                  <path className="circle-bg"
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path className={`circle ${result.match_score >= 70 ? 'circle--high' : 'circle--med'}`}
                    strokeDasharray={`${result.match_score}, 100`}
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <text x="18" y="20.35" className="percentage">{Math.round(result.match_score)}%</text>
                </svg>
              </div>
              <div className="score-text">
                <p>{getSummaryText(result.match_score, job.department || 'APEX IT')}</p>
              </div>
            </div>

            <div className="ai-result-section-title">AI Phân tích chi tiết & Lời khuyên</div>
            
            <div className="ai-analysis-list">
              <div className="ai-analysis-item ai-analysis-item--success">
                <div className="ai-analysis-icon">✅</div>
                <div>
                  <strong>Đạt yêu cầu cốt lõi (Must-have):</strong>
                  {renderMatchedItems()}
                </div>
              </div>
              
              {result.gaps && result.gaps.length > 0 && (
                <div className="ai-analysis-item ai-analysis-item--warning">
                  <div className="ai-analysis-icon">⚠️</div>
                  <div>
                    <strong>AI Lời khuyên (Khoảng trống cần bổ sung):</strong>
                    <ul>
                      {result.gaps.map((g, i) => (
                        <li key={i}><strong>{g.title}:</strong> {g.message}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-actions" style={{ marginTop: '32px' }}>
              <button className="btn btn--outline" onClick={onClose} style={{ padding: '10px 16px' }}>Hủy bỏ</button>
              {result.match_score < 70 || (result.gaps && result.gaps.length > 0) ? (
                 <button className="btn btn--outline" onClick={() => alert('Chức năng AI Tối ưu CV đang phát triển!')} style={{ padding: '10px 16px' }}>
                   🪄 Dùng AI Tối ưu lại CV
                 </button>
              ) : null}
              <button className="btn btn--primary ai-btn-primary" onClick={() => { alert('Ứng tuyển thành công!'); onClose(); }} style={{ padding: '10px 24px' }}>
                Xác nhận nộp CV
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
