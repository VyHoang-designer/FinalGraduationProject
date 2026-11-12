// ==============================================================================
// FILE: frontend/src/components/ZaloModal.jsx
// MÔ TẢ: Modal thông tin Zalo Official Contact của nền tảng AI Matcher
//         - Thiết kế chuẩn nhận diện thương hiệu Zalo & AI Matcher
//         - Avatar lấy từ image/logo.png có tích vàng xác thực
//         - Nút Nhắn tin liên kết trực tiếp tới Zalo OA / chat
//         - Mã QR để quét bằng app Zalo trên điện thoại
//         - Thông tin địa chỉ, hotline, giờ làm việc, website, giới thiệu
// ==============================================================================

import { useState } from 'react';

export default function ZaloModal({ onClose }) {
  const [copied, setCopied] = useState(false);
  const zaloPhone = '0902698348';
  const zaloUrl = `https://zalo.me/${zaloPhone}`;

  function handleCopyPhone() {
    navigator.clipboard.writeText(zaloPhone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 999999 }}>
      <div 
        className="inquiry-modal-card" 
        onClick={e => e.stopPropagation()}
        style={{ 
          maxWidth: '820px', 
          width: '92%', 
          padding: '0', 
          overflow: 'hidden', 
          borderRadius: '16px',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.35)',
          background: '#ffffff'
        }}
      >
        {/* HEADER BAR (ZALO STYLE) */}
        <div style={{
          background: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          {/* Zalo Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              color: '#0068ff', 
              fontSize: '1.75rem', 
              fontWeight: 900, 
              letterSpacing: '-0.5px',
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
              Zalo
            </span>
            <span style={{ 
              fontSize: '0.75rem', 
              background: '#eff6ff', 
              color: '#0068ff', 
              padding: '2px 8px', 
              borderRadius: '10px', 
              fontWeight: 700 
            }}>
              OFFICIAL CONTACT
            </span>
          </div>

          {/* Language & Close Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '0.85rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>Ngôn ngữ:</span>
              <strong style={{ color: '#111827' }}>Tiếng Việt</strong>
            </div>
            <button
              onClick={onClose}
              style={{
                background: '#f3f4f6',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem',
                color: '#6b7280',
                transition: 'background 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#e5e7eb'}
              onMouseLeave={e => e.currentTarget.style.background = '#f3f4f6'}
              title="Đóng"
            >
              ✕
            </button>
          </div>
        </div>

        {/* MODAL BODY (TWO COLUMNS) */}
        <div style={{ padding: '32px 36px', maxHeight: '78vh', overflowY: 'auto' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1.2fr 0.8fr', 
            gap: '36px', 
            alignItems: 'start' 
          }}>
            
            {/* CỘT TRÁI: THÔNG TIN TỔ CHỨC / OA */}
            <div>
              {/* Profile Card Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                {/* Logo Avatar */}
                <div style={{ position: 'relative', width: '76px', height: '76px', flexShrink: 0 }}>
                  <img
                    src="/images/logo.png"
                    alt="AI Matcher Logo"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      borderRadius: '50%',
                      background: '#ffffff',
                      border: '2px solid #0068ff',
                      padding: '4px',
                      boxShadow: '0 4px 12px rgba(0, 104, 255, 0.15)',
                    }}
                  />
                  {/* Verified Golden Badge */}
                  <div 
                    title="Đã xác thực chính thức"
                    style={{
                      position: 'absolute',
                      bottom: '0',
                      right: '0',
                      background: '#eab308',
                      color: '#ffffff',
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 900,
                      border: '2px solid #ffffff',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}
                  >
                    ✓
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#111827' }}>
                      AI MATCHER
                    </h3>
                    <span 
                      style={{ 
                        background: '#eab308', 
                        color: '#fff', 
                        fontSize: '0.7rem', 
                        width: '18px', 
                        height: '18px', 
                        borderRadius: '50%', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontWeight: 900 
                      }}
                      title="Tài khoản đã xác thực"
                    >
                      ✓
                    </span>
                  </div>
                  <div style={{ color: '#4b5563', fontSize: '0.9rem', marginTop: '3px' }}>
                    Tuyển dụng & Việc làm
                  </div>
                </div>
              </div>

              {/* Nút Nhắn tin Zalo */}
              <a
                href={zaloUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: '#0068ff',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  padding: '12px 24px',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(0, 104, 255, 0.35)',
                  marginBottom: '26px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#0055d4'}
                onMouseLeave={e => e.currentTarget.style.background = '#0068ff'}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <span>Nhắn tin qua Zalo</span>
              </a>

              {/* Phần Thông tin chi tiết */}
              <div style={{ marginBottom: '22px' }}>
                <h4 style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: 700, color: '#111827' }}>
                  Thông tin chi tiết
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem', color: '#374151' }}>
                  {/* Địa chỉ */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ fontSize: '1.1rem', flexShrink: 0, marginTop: '-1px' }}>📍</span>
                    <span>Tầng 3 tòa G1, Five Star Garden, Số 2 Kim Giang, Phường Khương Đình, Thành phố Hà Nội</span>
                  </div>

                  {/* Điện thoại */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>📞</span>
                    <a href={`tel:${zaloPhone}`} style={{ color: '#0068ff', fontWeight: 600, textDecoration: 'none' }}>
                      {zaloPhone}
                    </a>
                    <button
                      type="button"
                      onClick={handleCopyPhone}
                      style={{
                        background: '#f3f4f6',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        padding: '2px 8px',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        color: '#4b5563',
                        marginLeft: '4px'
                      }}
                    >
                      {copied ? '✓ Đã sao chép' : 'Sao chép'}
                    </button>
                  </div>

                  {/* Giờ mở cửa */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>🕒</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                      <strong style={{ color: '#059669' }}>Đang mở cửa</strong>
                      <span style={{ color: '#6b7280' }}>• Đóng cửa lúc 18:00</span>
                    </div>
                  </div>

                  {/* Website */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>🌐</span>
                    <a 
                      href={window.location.origin} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ color: '#0068ff', textDecoration: 'none', fontWeight: 500 }}
                    >
                      https://aimatcher.vn
                    </a>
                  </div>
                </div>
              </div>

              {/* Đoạn giới thiệu giới hạn */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '14px 16px',
                fontSize: '0.85rem',
                color: '#4b5563',
                lineHeight: '1.6'
              }}>
                <strong>AI Matcher</strong> là nền tảng tuyển dụng hiện đại, nơi công nghệ được ứng dụng để rút ngắn khoảng cách giữa Ứng Viên và Nhà Tuyển Dụng. Với mạng lưới hàng ngàn Ứng Viên và Nhà Tuyển Dụng trên toàn quốc, AI Matcher mang đến giải pháp kết nối nhân lực và doanh nghiệp, giúp người tìm việc tiếp cận được những cơ hội tốt nhất trên thị trường và doanh nghiệp nhanh chóng tìm thấy nhân sự phù hợp.
              </div>
            </div>

            {/* CỘT PHẢI: MÃ QR CODE ZALO */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px 20px',
              background: '#f9fafb',
              borderRadius: '16px',
              border: '1px solid #e5e7eb',
              textAlign: 'center'
            }}>
              {/* Khung QR Code */}
              <div style={{
                background: '#ffffff',
                padding: '16px',
                borderRadius: '12px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                border: '1px solid #e5e7eb',
                position: 'relative',
                marginBottom: '16px'
              }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(zaloUrl)}&margin=10`}
                  alt="QR Code Zalo AI Matcher"
                  style={{ width: '200px', height: '200px', display: 'block', borderRadius: '4px' }}
                  onError={(e) => {
                    // Fallback nếu không có mạng load qrserver
                    e.currentTarget.style.display = 'none';
                    const fallback = document.getElementById('qr-svg-fallback');
                    if (fallback) fallback.style.display = 'block';
                  }}
                />

                {/* SVG QR Code Fallback */}
                <div id="qr-svg-fallback" style={{ display: 'none', width: '200px', height: '200px', position: 'relative' }}>
                  <svg width="200" height="200" viewBox="0 0 200 200" fill="none">
                    <rect width="200" height="200" fill="#fff"/>
                    <rect x="20" y="20" width="50" height="50" stroke="#000" strokeWidth="8" fill="none"/>
                    <rect x="35" y="35" width="20" height="20" fill="#000"/>
                    <rect x="130" y="20" width="50" height="50" stroke="#000" strokeWidth="8" fill="none"/>
                    <rect x="145" y="35" width="20" height="20" fill="#000"/>
                    <rect x="20" y="130" width="50" height="50" stroke="#000" strokeWidth="8" fill="none"/>
                    <rect x="35" y="145" width="20" height="20" fill="#000"/>
                    <path d="M90 25h20v20H90zM25 90h20v20H25zM90 90h20v20H90zM155 90h20v20h-20zM90 155h20v20H90zM130 130h20v20h-20zM155 155h20v20h-20z" fill="#000"/>
                  </svg>
                </div>

                {/* Logo Zalo giữa tâm QR Code */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: '#ffffff',
                  padding: '4px 8px',
                  borderRadius: '8px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                  border: '1px solid #e5e7eb',
                  fontWeight: 900,
                  fontSize: '0.8rem',
                  color: '#0068ff'
                }}>
                  Zalo
                </div>
              </div>

              {/* Hướng dẫn quét */}
              <p style={{
                margin: 0,
                fontSize: '0.88rem',
                color: '#4b5563',
                lineHeight: '1.5',
                fontWeight: 500,
                maxWidth: '220px'
              }}>
                Mở Zalo, bấm <strong>quét QR</strong> để quét và xem trên điện thoại
              </p>

              <div style={{ marginTop: '14px', fontSize: '0.78rem', color: '#9ca3af' }}>
                Hỗ trợ trực tuyến 24/7
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

