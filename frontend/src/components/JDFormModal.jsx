import { useState, useEffect } from 'react';
import { createJob, updateJob, deleteJob } from '../services/api';

export default function JDFormModal({ job, onClose, onRefresh }) {
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    location: '',
    required_experience: 0,
    project_keywords: '',
    jd_text: '',
    is_active: true,
    image: '',
    started_time: '',
    expired_time: ''
  });
  
  const [customCriteria, setCustomCriteria] = useState([]);
  const [requiredSkills, setRequiredSkills] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (job) {
      setFormData({
        title: job.title || '',
        department: job.department || '',
        location: job.location || '',
        required_experience: job.required_experience || 0,
        project_keywords: (job.project_keywords || []).join(', '),
        jd_text: job.jd_text || '',
        image: job.image || '',
        is_active: job.is_active !== undefined ? job.is_active : true,
        started_time: job.started_time ? new Date(job.started_time).toISOString().slice(0, 16) : '',
        expired_time: job.expired_time ? new Date(job.expired_time).toISOString().slice(0, 16) : ''
      });
      setCustomCriteria(job.custom_criteria || []);
      
      const skillsInit = (job.required_skills || []).map(s => {
        if (typeof s === 'string') return { skill: s, importance: 'core' };
        return s;
      });
      setRequiredSkills(skillsInit);
    }
  }, [job]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const addCriterion = () => {
    setCustomCriteria([...customCriteria, { name: '', keywords: '', level: 'nice' }]);
  };

  const removeCriterion = (idx) => {
    setCustomCriteria(customCriteria.filter((_, i) => i !== idx));
  };

  const updateCriterion = (idx, field, value) => {
    const newList = [...customCriteria];
    newList[idx][field] = value;
    setCustomCriteria(newList);
  };

  const addSkill = () => {
    setRequiredSkills([...requiredSkills, { skill: '', importance: 'core' }]);
  };

  const removeSkill = (idx) => {
    setRequiredSkills(requiredSkills.filter((_, i) => i !== idx));
  };

  const updateSkill = (idx, field, value) => {
    const newList = [...requiredSkills];
    newList[idx][field] = value;
    setRequiredSkills(newList);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...formData,
        required_experience: parseFloat(formData.required_experience) || 0,
        required_skills: requiredSkills.filter(s => s.skill.trim() !== ''),
        project_keywords: formData.project_keywords.split(',').map(s => s.trim()).filter(s => s),
        started_time: formData.started_time ? new Date(formData.started_time).toISOString() : null,
        expired_time: formData.expired_time ? new Date(formData.expired_time).toISOString() : null,
        custom_criteria: customCriteria.filter(c => c.name.trim() !== ''),
      };

      if (job) {
        await updateJob(job.id, payload);
      } else {
        await createJob(payload);
      }
      onRefresh();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tin tuyển dụng này? Toàn bộ kết quả AI Match liên quan cũng sẽ bị xóa!')) return;
    setLoading(true);
    try {
      await deleteJob(job.id);
      onRefresh();
      onClose();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal modal--large">
        <div className="modal__header" style={{ padding: '24px 24px 0 24px' }}>
          <h2>{job ? 'Chi tiết / Chỉnh sửa Tin tuyển dụng' : 'Thêm Tin tuyển dụng mới'}</h2>
          <button className="modal__close" onClick={onClose} style={{ right: '24px', top: '24px' }}>×</button>
        </div>
        
        <div className="modal__body" style={{ padding: '24px' }}>
          {error && <div className="toast toast--error" style={{ position: 'relative', marginBottom: '16px' }}>{error}</div>}
          
          <form id="jd-form" onSubmit={handleSubmit} className="jd-form">
            <div className="form-row">
              <div className="form-group" style={{ flex: 2 }}>
                <label>Tiêu đề Job <span className="required">*</span></label>
                <input required type="text" name="title" value={formData.title} onChange={handleChange} className="form-input" />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Trạng thái</label>
                <label className="toggle-switch">
                  <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} />
                  <span>{formData.is_active ? 'Đang tuyển' : 'Đã đóng'}</span>
                </label>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Phòng ban</label>
                <input type="text" name="department" value={formData.department} onChange={handleChange} className="form-input" />
              </div>
              <div className="form-group">
                <label>Địa điểm</label>
                <input type="text" name="location" value={formData.location} onChange={handleChange} className="form-input" />
              </div>
              <div className="form-group">
                <label>Kinh nghiệm yêu cầu (năm)</label>
                <input type="number" step="0.5" min="0" name="required_experience" value={formData.required_experience} onChange={handleChange} className="form-input" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Hình ảnh đại diện (Thành phố)</label>
                <select name="image" value={formData.image} onChange={handleChange} className="form-input">
                  <option value="">-- Chọn hình ảnh --</option>
                  <option value="/images/hanoi.png">Hà Nội</option>
                  <option value="/images/hochiminh.png">Hồ Chí Minh</option>
                  <option value="/images/DaNang.png">Đà Nẵng</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Thời gian bắt đầu</label>
                <input type="datetime-local" name="started_time" value={formData.started_time} onChange={handleChange} className="form-input" />
              </div>
              <div className="form-group">
                <label>Thời gian hết hạn</label>
                <input type="datetime-local" name="expired_time" value={formData.expired_time} onChange={handleChange} className="form-input" />
              </div>
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>Kỹ năng bắt buộc</strong>
                <button type="button" onClick={addSkill} className="btn btn--outline" style={{ padding: '4px 8px', fontSize: '12px' }}>+ Thêm kỹ năng</button>
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                {requiredSkills.map((s, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input type="text" placeholder="Tên kỹ năng (VD: Python)" value={s.skill} onChange={(e) => updateSkill(idx, 'skill', e.target.value)} className="form-input" style={{ flex: 1 }} />
                    <select value={s.importance} onChange={(e) => updateSkill(idx, 'importance', e.target.value)} className="form-input" style={{ width: '150px' }}>
                      <option value="core">Core (Trọng số 3)</option>
                      <option value="supporting">Supporting (Trọng số 2)</option>
                      <option value="preferred">Preferred (Trọng số 1)</option>
                    </select>
                    <button type="button" onClick={() => removeSkill(idx)} className="btn btn--danger" style={{ padding: '8px 12px' }}>✕</button>
                  </div>
                ))}
                {requiredSkills.length === 0 && <span style={{ fontSize: '13px', color: '#64748b' }}>Chưa có kỹ năng nào.</span>}
              </div>
            </div>

            <div className="form-group">
              <label>Từ khóa dự án (Cách nhau bằng dấu phẩy)</label>
              <input type="text" name="project_keywords" value={formData.project_keywords} onChange={handleChange} className="form-input" placeholder="fintech, blockchain, e-commerce" />
            </div>
            
            <div className="form-group">
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>Tiêu chí Tùy chỉnh (Hybrid Scoring)</strong>
                <button type="button" onClick={addCriterion} className="btn btn--outline" style={{ padding: '4px 8px', fontSize: '12px' }}>+ Thêm tiêu chí</button>
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                {customCriteria.map((c, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', background: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <input type="text" placeholder="Tên tiêu chí (VD: Chứng chỉ AWS)" value={c.name} onChange={(e) => updateCriterion(idx, 'name', e.target.value)} className="form-input" />
                    </div>
                    <div className="form-group" style={{ flex: 1.5 }}>
                      <input type="text" placeholder="Từ khóa quét (VD: aws, amazon web services)" value={c.keywords} onChange={(e) => updateCriterion(idx, 'keywords', e.target.value)} className="form-input" />
                    </div>
                    <div className="form-group" style={{ flex: 0.8 }}>
                      <select value={c.level} onChange={(e) => updateCriterion(idx, 'level', e.target.value)} className="form-input">
                        <option value="nice">Ưu tiên (+5đ)</option>
                        <option value="should">Rất cần (+10đ)</option>
                        <option value="must">Bắt buộc (-10đ)</option>
                        <option value="need">Thiết yếu (-20đ)</option>
                      </select>
                    </div>
                    <button type="button" onClick={() => removeCriterion(idx)} className="btn btn--danger" style={{ padding: '6px 10px', fontSize: '14px', borderRadius: '6px' }}>&times;</button>
                  </div>
                ))}
                {customCriteria.length === 0 && <span style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>Chưa có tiêu chí động nào.</span>}
              </div>
            </div>

            <div className="form-group">
              <label>Mô tả chi tiết Job (JD) <span className="required">*</span></label>
              <textarea required name="jd_text" value={formData.jd_text} onChange={handleChange} className="form-input" rows="10" placeholder="Dán nội dung JD đầy đủ vào đây..."></textarea>
            </div>
          </form>
        </div>

        <div className="modal__footer" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0 24px 24px 24px' }}>
          {job ? (
             <button className="btn btn--danger" type="button" onClick={handleDelete} disabled={loading}>
               Xóa Job
             </button>
          ) : <div/>}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn--outline" type="button" onClick={onClose} disabled={loading}>Hủy</button>
            <button className="btn btn--primary" type="submit" form="jd-form" disabled={loading}>
              {loading ? 'Đang lưu...' : 'Lưu lại'}
            </button>
          </div>
        </div>
      </div>
      <style>{`
        .jd-form { display: flex; flex-direction: column; gap: 16px; }
        .form-row { display: flex; gap: 16px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; flex: 1; }
        .form-input { padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 14px; }
        .form-input:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1); }
        .required { color: #ef4444; }
        .toggle-switch { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px; font-weight: 500; }
        .btn--danger { background: #fee2e2; color: #dc2626; border: none; }
        .btn--danger:hover { background: #fca5a5; }
      `}</style>
    </div>
  );
}
