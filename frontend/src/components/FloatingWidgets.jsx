// ==============================================================================
// FILE: frontend/src/components/FloatingWidgets.jsx
// MÔ TẢ: Cụm nút nổi góc dưới bên phải màn hình:
//         1. Nút AI Assistant (nhúng Gemini LLM hỗ trợ nghề nghiệp)
//         2. Nút Zalo Official Contact (hiển thị popup thông tin & QR code)
//         3. Nút cuộn nhanh lên đầu trang (Scroll To Top)
// ==============================================================================

import { useState, useEffect } from 'react';
import ZaloModal from './ZaloModal';
import AIAssistantChat from './AIAssistantChat';

export default function FloatingWidgets({ currentUser = null }) {
  const [showZaloModal, setShowZaloModal] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    function handleScroll() {
      if (window.scrollY > 250) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <>
      {/* CỤM NÚT NỔI GÓC PHẢI */}
      <div 
        className="floating-widgets-stack"
        style={{
          position: 'fixed',
          right: '24px',
          bottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          zIndex: 9999,
        }}
      >
        {/* 1. NÚT AI ASSISTANT */}
        <button
          type="button"
          onClick={() => {
            setShowAIChat(prev => !prev);
            if (showZaloModal) setShowZaloModal(false);
          }}
          title="Trò chuyện cùng Trợ lý AI Tuyển dụng (Gemini LLM)"
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #1e1b4b 0%, #2563eb 100%)',
            color: '#ffffff',
            border: '2px solid rgba(255, 255, 255, 0.4)',
            boxShadow: '0 8px 24px rgba(37, 99, 235, 0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            transition: 'all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            transform: showAIChat ? 'scale(1.08)' : 'scale(1)',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1) translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = showAIChat ? 'scale(1.08)' : 'scale(1)'}
        >
          {showAIChat ? (
            <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>✕</span>
          ) : (
            <>
              {/* Robot Icon */}
              <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>🤖</span>
              {/* Glowing Pulse Badge */}
              <span style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: '#10b981',
                border: '2px solid #ffffff',
                boxShadow: '0 0 8px #10b981'
              }} />
            </>
          )}
        </button>

        {/* 2. NÚT ZALO OFFICIAL */}
        <button
          type="button"
          onClick={() => {
            setShowZaloModal(true);
            if (showAIChat) setShowAIChat(false);
          }}
          title="Thông tin liên hệ & Hỗ trợ qua Zalo"
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            background: '#0068ff',
            color: '#ffffff',
            border: '2px solid #ffffff',
            boxShadow: '0 8px 24px rgba(0, 104, 255, 0.35)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            position: 'relative',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1) translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          {/* Zalo Text Logo Badge */}
          <span style={{
            fontWeight: 900,
            fontSize: '0.92rem',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            letterSpacing: '-0.3px',
          }}>
            Zalo
          </span>
        </button>

        {/* 3. NÚT CUỘN LÊN ĐẦU TRANG */}
        {showScrollTop && (
          <button
            type="button"
            onClick={scrollToTop}
            title="Cuộn lên đầu trang"
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: '#ffffff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.1)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              fontWeight: 700,
              transition: 'all 0.2s',
              animation: 'fadeIn 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="18 15 12 9 6 15"/>
            </svg>
          </button>
        )}
      </div>

      {/* CỬA SỔ CHAT AI ASSISTANT */}
      {showAIChat && (
        <AIAssistantChat 
          currentUser={currentUser}
          onClose={() => setShowAIChat(false)} 
        />
      )}

      {/* MODAL THÔNG TIN ZALO */}
      {showZaloModal && (
        <ZaloModal 
          onClose={() => setShowZaloModal(false)} 
        />
      )}
    </>
  );
}

