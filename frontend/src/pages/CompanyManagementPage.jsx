// ==============================================================================
// FILE: frontend/src/pages/CompanyManagementPage.jsx
// MÔ TẢ: Trang Quản lý Hồ sơ Doanh nghiệp / Công ty dành cho Nhà tuyển dụng
//         - Xem và chuyển đổi giữa các công ty trong hệ sinh thái
//         - Chỉnh sửa thông tin thương hiệu, logo, ảnh bìa, văn hóa, phúc lợi
//         - Quản lý danh sách việc làm trực thuộc
//         - Xem trước hồ sơ công ty theo giao diện Ứng viên (Preview Mode)
//         - Thêm công ty mới vào hệ thống
// ==============================================================================

import { useState, useEffect } from 'react';
import CompanyDetailModal from '../components/CompanyDetailModal';
import { 
  fetchCompanies, 
  fetchCompanyDetail, 
  updateCompany, 
  createCompany, 
  deleteCompany,
  getAssetUrl
} from '../services/api';

const POPULAR_BENEFIT_SUGGESTIONS = [
  'Lương tháng 13 & thưởng hiệu suất kinh doanh',
  'Cấp MacBook Pro M-series mới 100%',
  'Làm việc Hybrid linh hoạt 2 ngày/tuần',
  'Gói bảo hiểm sức khỏe quốc tế cao cấp',
  'Tài trợ 100% lệ phí thi chứng chỉ AWS, Azure, GCP',
  'Canteen ăn sáng & trưa miễn phí tại văn phòng',
  'Phòng Gym, yoga, khu vực giải trí gaming',
  'Du lịch nghỉ dưỡng 5 sao định kỳ hàng năm',
  'Cơ hội Onsite làm việc tại Mỹ, Nhật Bản, châu Âu',
  'Chính sách cổ phần thưởng ESOP cho nhân tài',
];

const INDUSTRY_OPTIONS = [
  'Trí tuệ Nhân tạo & Deep Learning',
  'Fintech & Tài chính Số',
  'Xuất khẩu Phần mềm & Chuyển đổi số',
  'Internet, Game & Điện toán Đám mây',
  'Viễn thông & Dịch vụ Số',
  'Thương mại Điện tử & Bán lẻ',
  'Phần mềm Quản lý & SaaS Doanh nghiệp',
  'An toàn Thông tin & Bảo mật (Cybersecurity)',
];

const COMPANY_SIZE_OPTIONS = [
  '10 - 50 nhân viên',
  '50 - 100 nhân viên',
  '100 - 500 nhân viên',
  '500 - 1000 nhân viên',
  '1000+ nhân viên',
  '10,000+ nhân viên toàn cầu',
];

export default function CompanyManagementPage({ onNavigate, currentUser, globalSearchTerm }) {
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [companyDetail, setCompanyDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'culture' | 'benefits' | 'jobs'

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    tagline: '',
    industry: '',
    location: '',
    company_size: '',
    website: '',
    logo: '',
    cover_image: '',
    description: '',
    benefits: [],
    rating: 4.8,
  });

  // Benefit input state
  const [newBenefitInput, setNewBenefitInput] = useState('');

  // Modals
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newCompanyData, setNewCompanyData] = useState({
    name: '',
    industry: 'Phần mềm & SaaS Doanh nghiệp',
    location: 'TP. Hồ Chí Minh',
    company_size: '100 - 500 nhân viên',
    tagline: '',
    website: '',
    logo: '',
    cover_image: '',
    description: '',
    benefits: ['Lương tháng 13 & thưởng hiệu suất', 'Cấp laptop làm việc hiện đại'],
  });
  const [creatingCompany, setCreatingCompany] = useState(false);

  useEffect(() => {
    loadCompanyList();
  }, []);

  async function loadCompanyList(targetSelectId = null) {
    try {
      setLoading(true);
      const list = await fetchCompanies();
      setCompanies(list);
      if (list.length > 0) {
        const idToSelect = targetSelectId || selectedCompanyId || list[0].id;
        setSelectedCompanyId(idToSelect);
        loadDetail(idToSelect);
      } else {
        setSelectedCompanyId(null);
        setCompanyDetail(null);
      }
    } catch (err) {
      showToast(`❌ Không thể tải danh sách công ty: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(id) {
    try {
      setDetailLoading(true);
      const data = await fetchCompanyDetail(id);
      setCompanyDetail(data);
      setFormData({
        name: data.name || '',
        tagline: data.tagline || '',
        industry: data.industry || '',
        location: data.location || '',
        company_size: data.company_size || '',
        website: data.website || '',
        logo: data.logo || '',
        cover_image: data.cover_image || '',
        description: data.description || '',
        benefits: Array.isArray(data.benefits) ? [...data.benefits] : [],
        rating: data.rating || 4.8,
      });
    } catch (err) {
      showToast(`❌ Lỗi tải chi tiết: ${err.message}`, 'error');
    } finally {
      setDetailLoading(false);
    }
  }

  function handleSelectCompany(id) {
    setSelectedCompanyId(id);
    loadDetail(id);
  }

  function showToast(msg, type = 'success') {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  // Handle Form Change
  function handleInputChange(field, value) {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  // Add & Remove Benefits
  function handleAddBenefit() {
    const trimmed = newBenefitInput.trim();
    if (!trimmed) return;
    if (formData.benefits.includes(trimmed)) {
      showToast('⚠️ Phúc lợi này đã có trong danh sách', 'error');
      return;
    }
    setFormData(prev => ({
      ...prev,
      benefits: [...prev.benefits, trimmed]
    }));
    setNewBenefitInput('');
  }

  function handleAddPresetBenefit(item) {
    if (formData.benefits.includes(item)) {
      showToast('⚠️ Phúc lợi này đã có trong danh sách', 'error');
      return;
    }
    setFormData(prev => ({
      ...prev,
      benefits: [...prev.benefits, item]
    }));
  }

  function handleRemoveBenefit(indexToRemove) {
    setFormData(prev => ({
      ...prev,
      benefits: prev.benefits.filter((_, idx) => idx !== indexToRemove)
    }));
  }

  // Save changes
  async function handleSaveChanges(e) {
    if (e) e.preventDefault();
    if (!selectedCompanyId) return;
    if (!formData.name.trim()) {
      showToast('⚠️ Tên công ty không được để trống', 'error');
      return;
    }

    try {
      setSaving(true);
      const updated = await updateCompany(selectedCompanyId, {
        name: formData.name.trim(),
        tagline: formData.tagline.trim(),
        industry: formData.industry.trim(),
        location: formData.location.trim(),
        company_size: formData.company_size.trim(),
        website: formData.website.trim(),
        logo: formData.logo.trim(),
        cover_image: formData.cover_image.trim(),
        description: formData.description.trim(),
        benefits: formData.benefits,
        rating: parseFloat(formData.rating) || 4.8,
      });

      setCompanyDetail(updated);
      showToast('✅ Đã lưu cập nhật thông tin công ty thành công!');
      
      // Cập nhật lại trong danh sách companies
      setCompanies(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
    } catch (err) {
      showToast(`❌ Lỗi cập nhật: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  }

  // Handle Create Company
  async function handleCreateNewCompany(e) {
    e.preventDefault();
    if (!newCompanyData.name.trim()) {
      showToast('⚠️ Vui lòng nhập tên công ty', 'error');
      return;
    }

    try {
      setCreatingCompany(true);
      const created = await createCompany({
        ...newCompanyData,
        name: newCompanyData.name.trim(),
      });
      showToast(`🎉 Đã thêm công ty "${created.name}" thành công!`);
      setIsCreateModalOpen(false);
      setNewCompanyData({
        name: '',
        industry: 'Phần mềm & SaaS Doanh nghiệp',
        location: 'TP. Hồ Chí Minh',
        company_size: '100 - 500 nhân viên',
        tagline: '',
        website: '',
        logo: '',
        cover_image: '',
        description: '',
        benefits: ['Lương tháng 13 & thưởng hiệu suất', 'Cấp laptop làm việc hiện đại'],
      });
      await loadCompanyList(created.id);
    } catch (err) {
      showToast(`❌ Không thể tạo công ty: ${err.message}`, 'error');
    } finally {
      setCreatingCompany(false);
    }
  }

  // Handle Delete Company
  async function handleDeleteCompany() {
    if (!selectedCompanyId || !companyDetail) return;
    const confirmMsg = `Bạn có chắc chắn muốn xóa doanh nghiệp "${companyDetail.name}" khỏi hệ thống?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setSaving(true);
      await deleteCompany(selectedCompanyId);
      showToast(`🗑️ Đã xóa công ty "${companyDetail.name}"`);
      await loadCompanyList();
    } catch (err) {
      showToast(`❌ Lỗi xóa công ty: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="page-state" style={{ minHeight: '60vh' }}>
        <div className="spinner" />
        <p>Đang tải thông tin quản lý doanh nghiệp...</p>
      </div>
    );
  }

  const jobs = companyDetail?.active_jobs || [];

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1300px', margin: '0 auto' }}>
      
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div 
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            background: toast.type === 'error' ? '#ef4444' : '#10b981',
            color: '#ffffff',
            padding: '12px 22px',
            borderRadius: '10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            zIndex: 99999,
            fontWeight: 600,
            fontSize: '0.92rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.25s ease',
          }}
        >
          {toast.message}
        </div>
      )}

      {/* HEADER BAR: TITLE & COMPANY SELECTOR */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.6rem' }}>🏢</span>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#1e293b' }}>
              Quản lý Hồ sơ Doanh nghiệp
            </h2>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: '#64748b' }}>
            Thiết lập thương hiệu tuyển dụng, môi trường văn hóa, chính sách phúc lợi và các việc làm trực thuộc.
          </p>
        </div>

        {/* SELECTOR & ACTION BUTTONS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Company Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '6px 14px' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Đang chọn:</span>
            <select
              value={selectedCompanyId || ''}
              onChange={(e) => handleSelectCompany(Number(e.target.value))}
              style={{
                border: 'none',
                background: 'transparent',
                fontWeight: 700,
                fontSize: '0.92rem',
                color: '#1e293b',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {companies.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.active_jobs_count || 0} việc làm)
                </option>
              ))}
            </select>
          </div>

          {/* Add Company Button */}
          <button 
            type="button" 
            className="btn btn--outline"
            onClick={() => setIsCreateModalOpen(true)}
            style={{ padding: '8px 16px', fontSize: '0.88rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>➕ Thêm công ty</span>
          </button>

          {/* Preview Button */}
          <button 
            type="button" 
            className="btn btn--outline"
            onClick={() => setIsPreviewOpen(true)}
            disabled={!companyDetail}
            style={{ padding: '8px 16px', fontSize: '0.88rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>👁️ Xem trước (Ứng viên)</span>
          </button>
        </div>
      </div>

      {detailLoading ? (
        <div className="page-state" style={{ minHeight: '40vh' }}>
          <div className="spinner" />
          <p>Đang tải dữ liệu công ty...</p>
        </div>
      ) : !companyDetail ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: '#ffffff', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🏢</div>
          <h3 style={{ margin: '0 0 8px', color: '#1e293b' }}>Chưa có doanh nghiệp nào được chọn</h3>
          <p style={{ color: '#64748b', marginBottom: '16px' }}>Vui lòng thêm doanh nghiệp mới hoặc chọn từ danh sách.</p>
          <button className="btn btn--primary" onClick={() => setIsCreateModalOpen(true)}>
            + Thêm doanh nghiệp đầu tiên
          </button>
        </div>
      ) : (
        <div>
          {/* COMPANY BRAND OVERVIEW CARD */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
            marginBottom: '24px',
          }}>
            {/* Cover Banner */}
            <div style={{ height: '140px', background: '#1e293b', position: 'relative', overflow: 'hidden' }}>
              <img 
                src={getAssetUrl(formData.cover_image) || "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&h=400&fit=crop"} 
                alt="Company Cover"
                style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
              />
              <div style={{ position: 'absolute', top: '12px', right: '16px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', color: '#ffffff', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600 }}>
                Ảnh bìa hiển thị ứng viên
              </div>
            </div>

            {/* Header Content */}
            <div style={{ padding: '0 28px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px', marginTop: '-36px', position: 'relative', zIndex: 10 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '18px', position: 'relative', zIndex: 10 }}>
                <div style={{
                  width: '84px',
                  height: '84px',
                  borderRadius: '16px',
                  background: '#ffffff',
                  border: '3px solid #ffffff',
                  boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  position: 'relative',
                  zIndex: 10,
                }}>
                  <img 
                    src={formData.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || 'Company')}&background=random&size=128`} 
                    alt={formData.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#1e293b' }}>
                      {formData.name || 'Tên Công Ty'}
                    </h3>
                    <span style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', padding: '2px 8px', borderRadius: '12px', fontSize: '0.78rem', fontWeight: 700 }}>
                      ⭐ {formData.rating || 4.8}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.88rem', color: '#64748b', marginTop: '2px' }}>
                    {formData.tagline || 'Khẩu hiệu thương hiệu tuyển dụng...'}
                  </div>
                </div>
              </div>

              {/* Quick stats badge */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#4f46e5' }}>{jobs.length}</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Vị trí đang mở</div>
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#059669' }}>{formData.benefits.length}</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Chính sách phúc lợi</div>
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#b45309' }}>{formData.company_size || '100+'}</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Quy mô nhân sự</div>
                </div>
              </div>
            </div>

            {/* TAB NAVIGATION */}
            <div style={{ display: 'flex', borderTop: '1px solid #e2e8f0', background: '#f8fafc', padding: '0 20px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('info')}
                style={{
                  padding: '14px 20px',
                  background: 'none',
                  border: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  borderBottom: activeTab === 'info' ? '3px solid #4f46e5' : '3px solid transparent',
                  color: activeTab === 'info' ? '#4f46e5' : '#64748b',
                }}
              >
                🏢 Thông tin & Thương hiệu
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('culture')}
                style={{
                  padding: '14px 20px',
                  background: 'none',
                  border: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  borderBottom: activeTab === 'culture' ? '3px solid #4f46e5' : '3px solid transparent',
                  color: activeTab === 'culture' ? '#4f46e5' : '#64748b',
                }}
              >
                📖 Giới thiệu & Văn hóa
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('benefits')}
                style={{
                  padding: '14px 20px',
                  background: 'none',
                  border: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  borderBottom: activeTab === 'benefits' ? '3px solid #4f46e5' : '3px solid transparent',
                  color: activeTab === 'benefits' ? '#4f46e5' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>🎁 Chế độ & Phúc lợi</span>
                <span style={{ background: '#e0e7ff', color: '#3730a3', fontSize: '0.75rem', padding: '1px 6px', borderRadius: '10px' }}>
                  {formData.benefits.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('jobs')}
                style={{
                  padding: '14px 20px',
                  background: 'none',
                  border: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  borderBottom: activeTab === 'jobs' ? '3px solid #4f46e5' : '3px solid transparent',
                  color: activeTab === 'jobs' ? '#4f46e5' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>💼 Vị trí đang tuyển</span>
                <span style={{ background: '#ecfdf5', color: '#065f46', fontSize: '0.75rem', padding: '1px 6px', borderRadius: '10px' }}>
                  {jobs.length}
                </span>
              </button>
            </div>
          </div>

          {/* MAIN FORM BODY */}
          <form onSubmit={handleSaveChanges}>
            
            {/* TAB 1: THÔNG TIN & THƯƠNG HIỆU */}
            {activeTab === 'info' && (
              <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '28px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
                <h4 style={{ margin: '0 0 18px', fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>
                  Thông tin Định danh Doanh nghiệp
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                      Tên Doanh nghiệp / Công ty *
                    </label>
                    <input
                      type="text"
                      className="input-control"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="VD: FPT Software, VNG Corporation..."
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                      Khẩu hiệu / Tagline ngắn
                    </label>
                    <input
                      type="text"
                      className="input-control"
                      value={formData.tagline}
                      onChange={(e) => handleInputChange('tagline', e.target.value)}
                      placeholder="VD: Tiên phong Đổi mới Sáng tạo & Nền tảng AI Thông minh"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                      Lĩnh vực / Ngành nghề hoạt động
                    </label>
                    <input
                      type="text"
                      className="input-control"
                      value={formData.industry}
                      onChange={(e) => handleInputChange('industry', e.target.value)}
                      list="industry-suggestions"
                      placeholder="VD: Trí tuệ Nhân tạo & Phần mềm"
                    />
                    <datalist id="industry-suggestions">
                      {INDUSTRY_OPTIONS.map((opt, i) => <option key={i} value={opt} />)}
                    </datalist>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                      Trụ sở chính / Địa điểm làm việc
                    </label>
                    <input
                      type="text"
                      className="input-control"
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      placeholder="VD: TP. Hồ Chí Minh (F-Town, TP. Thủ Đức)"
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                      Quy mô nhân sự
                    </label>
                    <select
                      className="input-control"
                      value={formData.company_size}
                      onChange={(e) => handleInputChange('company_size', e.target.value)}
                    >
                      <option value="">-- Chọn quy mô --</option>
                      {COMPANY_SIZE_OPTIONS.map((size, idx) => (
                        <option key={idx} value={size}>{size}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                      Website chính thức (URL)
                    </label>
                    <input
                      type="url"
                      className="input-control"
                      value={formData.website}
                      onChange={(e) => handleInputChange('website', e.target.value)}
                      placeholder="https://company.com"
                    />
                  </div>
                </div>

                <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #f1f5f9' }}>
                  <h4 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>
                    Hình ảnh Thương hiệu (Logo & Ảnh bìa)
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                        URL Ảnh đại diện / Logo công ty
                      </label>
                      <input
                        type="url"
                        className="input-control"
                        value={formData.logo}
                        onChange={(e) => handleInputChange('logo', e.target.value)}
                        placeholder="https://images.unsplash.com/... hoặc link logo"
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                        URL Ảnh bìa / Cover Banner (tỷ lệ 3:1)
                      </label>
                      <input
                        type="url"
                        className="input-control"
                        value={formData.cover_image}
                        onChange={(e) => handleInputChange('cover_image', e.target.value)}
                        placeholder="https://images.unsplash.com/... hoặc link banner"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: VĂN HÓA & GIỚI THIỆU */}
            {activeTab === 'culture' && (
              <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '28px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
                <h4 style={{ margin: '0 0 10px', fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>
                  Mô tả Doanh nghiệp & Văn hóa làm việc
                </h4>
                <p style={{ margin: '0 0 18px', fontSize: '0.86rem', color: '#64748b' }}>
                  Giới thiệu câu chuyện phát triển, môi trường làm việc, triết lý công nghệ và những giá trị mà doanh nghiệp mang lại cho nhân sự.
                </p>

                <textarea
                  className="input-control"
                  rows={8}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Nhập phần giới thiệu chi tiết về doanh nghiệp, môi trường văn hóa..."
                  style={{ width: '100%', boxSizing: 'border-box', lineHeight: '1.6' }}
                />
              </div>
            )}

            {/* TAB 3: PHÚC LỢI & ĐÃI NGỘ */}
            {activeTab === 'benefits' && (
              <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '28px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
                <h4 style={{ margin: '0 0 8px', fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>
                  Chế độ Đãi ngộ & Phúc lợi Doanh nghiệp
                </h4>
                <p style={{ margin: '0 0 18px', fontSize: '0.86rem', color: '#64748b' }}>
                  Các quyền lợi hấp dẫn giúp thu hút nhân tài IT nộp hồ sơ.
                </p>

                {/* THÊM PHÚC LỢI MỚI */}
                <div style={{ display: 'flex', gap: '10px', marginBottom: '22px' }}>
                  <input
                    type="text"
                    className="input-control"
                    placeholder="Nhập quyền lợi mới (VD: Thưởng tháng 13, Cấp MacBook M3...)"
                    value={newBenefitInput}
                    onChange={(e) => setNewBenefitInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddBenefit(); } }}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={handleAddBenefit}
                    style={{ padding: '10px 20px', whiteSpace: 'nowrap' }}
                  >
                    + Thêm phúc lợi
                  </button>
                </div>

                {/* DANH SÁCH PHÚC LỢI ĐÃ CÓ */}
                <div style={{ marginBottom: '28px' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', marginBottom: '10px' }}>
                    Danh sách phúc lợi hiện tại ({formData.benefits.length}):
                  </div>

                  {formData.benefits.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', background: '#f8fafc', borderRadius: '10px', color: '#94a3b8', border: '1px dashed #cbd5e1' }}>
                      Chưa có phúc lợi nào. Hãy nhập hoặc bấm chọn các gợi ý bên dưới!
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {formData.benefits.map((b, idx) => (
                        <div 
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 16px',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '10px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: '#1e293b' }}>
                            <span style={{ color: '#10b981', fontWeight: 700 }}>✓</span>
                            <span>{b}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveBenefit(idx)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              fontWeight: 700,
                              fontSize: '1rem',
                              padding: '2px 8px',
                            }}
                            title="Xóa phúc lợi này"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* GỢI Ý PHÚC LỢI NHANH */}
                <div style={{ paddingTop: '18px', borderTop: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#64748b', marginBottom: '10px' }}>
                    💡 Gợi ý thêm nhanh 1-Click:
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {POPULAR_BENEFIT_SUGGESTIONS.map((item, idx) => {
                      const isAdded = formData.benefits.includes(item);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleAddPresetBenefit(item)}
                          disabled={isAdded}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            border: '1px solid',
                            cursor: isAdded ? 'default' : 'pointer',
                            background: isAdded ? '#f1f5f9' : '#ffffff',
                            color: isAdded ? '#94a3b8' : '#4f46e5',
                            borderColor: isAdded ? '#e2e8f0' : '#c7d2fe',
                            transition: 'all 0.2s',
                          }}
                        >
                          {isAdded ? '✓ Đã có' : `+ ${item}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: VIỆC LÀM TRỰC THUỘC */}
            {activeTab === 'jobs' && (
              <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '28px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>
                      Các Vị trí Tuyển dụng của {formData.name} ({jobs.length})
                    </h4>
                    <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                      Các tin tuyển dụng hiển thị cho ứng viên dưới thương hiệu của công ty này.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => onNavigate('jobs')}
                    style={{ padding: '8px 18px', fontSize: '0.88rem' }}
                  >
                    + Tạo tin tuyển dụng mới
                  </button>
                </div>

                {jobs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '50px 20px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>💼</div>
                    <h4 style={{ margin: '0 0 6px', color: '#1e293b' }}>Chưa có tin tuyển dụng nào được gán</h4>
                    <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '0.88rem' }}>
                      Để xuất hiện trong danh sách tuyển dụng của công ty, hãy tạo Job mới và đặt phòng ban là <strong>{formData.name}</strong>.
                    </p>
                    <button className="btn btn--primary" onClick={() => onNavigate('jobs')}>
                      Đăng tin tuyển dụng ngay
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {jobs.map(job => (
                      <div 
                        key={job.id}
                        style={{
                          background: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          padding: '16px 20px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '12px',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h4 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 700, color: '#1e293b' }}>
                              {job.title}
                            </h4>
                            <span style={{ background: '#ecfdf5', color: '#059669', fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px' }}>
                              Đang tuyển
                            </span>
                          </div>
                          <div style={{ fontSize: '0.84rem', color: '#64748b', display: 'flex', gap: '14px', marginTop: '6px', flexWrap: 'wrap' }}>
                            <span>📍 {job.location || formData.location || 'TP. Hồ Chí Minh'}</span>
                            <span>⏳ {job.required_experience || 0}+ năm KN</span>
                            <span>💼 Toàn thời gian</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            type="button"
                            className="btn btn--outline btn--sm"
                            onClick={() => onNavigate('jobs')}
                          >
                            Xem tin tuyển dụng
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ACTION FOOTER */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              marginTop: '24px',
              padding: '16px 24px',
              background: '#ffffff',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
            }}>
              <div>
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={handleDeleteCompany}
                  disabled={saving || companies.length <= 1}
                  style={{ color: '#ef4444', borderColor: '#fca5a5', background: '#fef2f2', fontSize: '0.88rem' }}
                >
                  🗑️ Xóa công ty này
                </button>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={() => loadDetail(selectedCompanyId)}
                  disabled={saving}
                  style={{ padding: '10px 20px', fontSize: '0.9rem' }}
                >
                  Hoàn tác
                </button>

                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={saving}
                  style={{
                    padding: '10px 28px',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                    boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span>{saving ? 'Đang lưu...' : '💾 Lưu thay đổi hồ sơ'}</span>
                </button>
              </div>
            </div>

          </form>
        </div>
      )}

      {/* PREVIEW MODAL (GIAO DIỆN ỨNG VIÊN) */}
      {isPreviewOpen && selectedCompanyId && (
        <CompanyDetailModal 
          companyId={selectedCompanyId}
          initialCompany={companyDetail}
          onClose={() => setIsPreviewOpen(false)}
          onApplyJob={() => {
            showToast('ℹ️ Chế độ xem trước dành cho Nhà tuyển dụng');
          }}
        />
      )}

      {/* MODAL THÊM DOANH NGHIỆP MỚI */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)} style={{ zIndex: 12000 }}>
          <div 
            className="modal-content" 
            style={{ maxWidth: '640px', width: '92%', borderRadius: '18px', padding: '28px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.4rem' }}>🏢</span>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>
                  Thêm Doanh nghiệp / Chi nhánh Mới
                </h3>
              </div>
              <button className="modal-close" onClick={() => setIsCreateModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleCreateNewCompany}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Tên Doanh nghiệp *
                  </label>
                  <input
                    type="text"
                    className="input-control"
                    placeholder="VD: VinAI Research, Tiki Corporation..."
                    value={newCompanyData.name}
                    onChange={(e) => setNewCompanyData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                      Lĩnh vực hoạt động
                    </label>
                    <input
                      type="text"
                      className="input-control"
                      value={newCompanyData.industry}
                      onChange={(e) => setNewCompanyData(prev => ({ ...prev, industry: e.target.value }))}
                      list="create-industry-suggestions"
                      placeholder="VD: Trí tuệ Nhân tạo"
                    />
                    <datalist id="create-industry-suggestions">
                      {INDUSTRY_OPTIONS.map((opt, i) => <option key={i} value={opt} />)}
                    </datalist>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                      Trụ sở chính
                    </label>
                    <input
                      type="text"
                      className="input-control"
                      value={newCompanyData.location}
                      onChange={(e) => setNewCompanyData(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="VD: TP. Hồ Chí Minh"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                      Quy mô nhân sự
                    </label>
                    <select
                      className="input-control"
                      value={newCompanyData.company_size}
                      onChange={(e) => setNewCompanyData(prev => ({ ...prev, company_size: e.target.value }))}
                    >
                      {COMPANY_SIZE_OPTIONS.map((sz, i) => (
                        <option key={i} value={sz}>{sz}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                      Website công ty
                    </label>
                    <input
                      type="url"
                      className="input-control"
                      placeholder="https://..."
                      value={newCompanyData.website}
                      onChange={(e) => setNewCompanyData(prev => ({ ...prev, website: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Khẩu hiệu / Slogan thương hiệu
                  </label>
                  <input
                    type="text"
                    className="input-control"
                    placeholder="VD: Đón nhận Thách thức & Kiến tạo Tương lai Số"
                    value={newCompanyData.tagline}
                    onChange={(e) => setNewCompanyData(prev => ({ ...prev, tagline: e.target.value }))}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    URL Logo (tùy chọn)
                  </label>
                  <input
                    type="url"
                    className="input-control"
                    placeholder="https://... (để trống sẽ tự động tạo logo avatar)"
                    value={newCompanyData.logo}
                    onChange={(e) => setNewCompanyData(prev => ({ ...prev, logo: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Hủy bỏ
                </button>

                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={creatingCompany}
                  style={{ padding: '10px 24px', fontWeight: 700 }}
                >
                  {creatingCompany ? 'Đang khởi tạo...' : '✓ Tạo doanh nghiệp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
