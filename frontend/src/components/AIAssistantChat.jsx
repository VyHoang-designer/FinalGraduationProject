// ==============================================================================
// FILE: frontend/src/components/AIAssistantChat.jsx
// MÔ TẢ: Cửa sổ Chatbot AI Career Assistant nhúng mô hình LLM (Gemini)
//         - Hỗ trợ giải đáp CV, gợi ý việc làm, mẹo phỏng vấn & deal lương
//         - Gợi ý câu hỏi nhanh (Prompt chips)
//         - Tự động cuộn, hiển thị trạng thái suy nghĩ, định dạng markdown
// ==============================================================================

import { useState, useRef, useEffect } from 'react';
import { sendAIAssistantMessage } from '../services/api';

const QUICK_SUGGESTIONS = [
  '📄 Cách viết CV chuẩn ATS đạt điểm cao',
  '💼 Gợi ý các việc làm IT hot nhất hiện nay',
  '🎯 Bí quyết phỏng vấn kỹ thuật & tình huống STAR',
  '💰 Kinh nghiệm deal lương ngành phần mềm',
  '🤖 Hệ thống AI Matching hoạt động như thế nào?',
];

function formatMessageContent(text) {
  if (!text) return '';
  // Simple markdown parser for bold, italic, bullet points and code
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    // Process bold **text**
    let formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Process italic *text*
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Process bullet points
    if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
      const content = formatted.replace(/^[\s•\-]+/, '');
      return (
        <li key={idx} style={{ marginLeft: '16px', marginBottom: '4px' }} dangerouslySetInnerHTML={{ __html: content }} />
      );
    }
    // Numbered list
    if (/^\d+\.\s/.test(line.trim())) {
      const content = formatted.replace(/^\d+\.\s*/, '');
      return (
        <div key={idx} style={{ marginLeft: '12px', marginBottom: '4px' }} dangerouslySetInnerHTML={{ __html: `${line.match(/^\d+\./)[0]} ${content}` }} />
      );
    }
    if (!line.trim()) {
      return <div key={idx} style={{ height: '8px' }} />;
    }
    return <p key={idx} style={{ margin: '0 0 6px 0', lineHeight: '1.55' }} dangerouslySetInnerHTML={{ __html: formatted }} />;
  });
}

export default function AIAssistantChat({ onClose, currentUser = null }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'model',
      text: `Xin chào ${currentUser?.full_name ? `**${currentUser.full_name}**` : 'bạn'}! 👋\n\nTôi là **AI Career Assistant** của nền tảng tuyển dụng **AI Matcher** (được hỗ trợ bởi Google Gemini LLM).\n\nTôi có thể giúp bạn:\n• **Tư vấn viết & tối ưu CV** chuẩn ATS để đạt điểm AI Matching cao nhất.\n• **Định hướng lộ trình nghề nghiệp** IT (Frontend, Backend, AI/ML, DevOps...).\n• **Bí quyết vượt qua phỏng vấn** và đàm phán mức lương hấp dẫn.\n• Hướng dẫn sử dụng các tính năng thông minh trên hệ thống.\n\nBạn muốn tìm hiểu hoặc cần tôi hỗ trợ điều gì hôm nay?`,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSend(textToSend) {
    const content = (textToSend || inputText).trim();
    if (!content || loading) return;

    const userMsg = {
      id: `user_${Date.now()}`,
      role: 'user',
      text: content,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      // Build conversation history for context
      const history = messages.map(m => ({
        role: m.role,
        text: m.text,
      }));

      const res = await sendAIAssistantMessage(content, history, {
        user_name: currentUser?.full_name,
        user_role: currentUser?.role,
      });

      const aiReply = res?.reply || 'Tôi đã tiếp nhận câu hỏi của bạn. Rất tiếc hệ thống đang bận, bạn vui lòng thử lại sau giây lát!';
      setMessages(prev => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          role: 'model',
          text: aiReply,
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    } catch (err) {
      console.error('Lỗi gọi AI Assistant:', err);
      setMessages(prev => [
        ...prev,
        {
          id: `ai_err_${Date.now()}`,
          role: 'model',
          text: `⚠️ Rất tiếc, đã có lỗi kết nối đến mô hình AI: ${err.message || 'Lỗi server'}. Bạn vui lòng thử lại nhé!`,
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleClearChat() {
    if (window.confirm('Bạn có muốn xóa lịch sử cuộc trò chuyện hiện tại?')) {
      setMessages([
        {
          id: 'welcome_reset',
          role: 'model',
          text: 'Cuộc trò chuyện đã được làm mới. Bạn cần tôi hỗ trợ điều gì tiếp theo?',
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    }
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '96px',
      right: '24px',
      width: '390px',
      maxWidth: 'calc(100vw - 32px)',
      height: '580px',
      maxHeight: 'calc(100vh - 120px)',
      background: '#ffffff',
      borderRadius: '20px',
      boxShadow: '0 16px 48px -8px rgba(37, 99, 235, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.08)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 99999,
      overflow: 'hidden',
      animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      fontFamily: 'inherit'
    }}>
      
      {/* CHAT HEADER */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b 0%, #2563eb 60%, #38bdf8 100%)',
        color: '#ffffff',
        padding: '16px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        position: 'relative',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Avatar Icon */}
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.3)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}>
            🤖
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 800, color: '#ffffff' }}>
                AI Career Assistant
              </h3>
              <span style={{ 
                background: 'rgba(255,255,255,0.25)', 
                fontSize: '0.68rem', 
                padding: '2px 6px', 
                borderRadius: '8px', 
                fontWeight: 700 
              }}>
                LLM
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#c7d2fe', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
              <span>Sẵn sàng hỗ trợ 24/7 (Gemini)</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={handleClearChat}
            title="Làm mới đoạn chat"
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              width: '30px',
              height: '30px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.9rem'
            }}
          >
            🔄
          </button>
          <button
            onClick={onClose}
            title="Đóng cửa sổ"
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: '8px',
              color: '#ffffff',
              width: '30px',
              height: '30px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem',
              fontWeight: 700
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* QUICK SUGGESTION CHIPS */}
      <div style={{
        padding: '10px 14px',
        background: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        gap: '6px',
        overflowX: 'auto',
        whiteSpace: 'nowrap',
        scrollbarWidth: 'none',
      }}>
        {QUICK_SUGGESTIONS.map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSend(chip.replace(/^[^\s]+\s/, ''))}
            style={{
              padding: '5px 11px',
              borderRadius: '16px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#1e293b',
              fontSize: '0.78rem',
              fontWeight: 500,
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.15s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#eff6ff';
              e.currentTarget.style.borderColor = '#93c5fd';
              e.currentTarget.style.color = '#2563eb';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.borderColor = '#cbd5e1';
              e.currentTarget.style.color = '#1e293b';
            }}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* MESSAGES LIST */}
      <div style={{
        flex: 1,
        padding: '16px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        background: '#ffffff',
      }}>
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
                maxWidth: '100%',
              }}
            >
              <div style={{
                maxWidth: '85%',
                padding: '12px 14px',
                borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: isUser ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : '#f1f5f9',
                color: isUser ? '#ffffff' : '#1e293b',
                fontSize: '0.88rem',
                lineHeight: '1.5',
                boxShadow: isUser ? '0 2px 8px rgba(37, 99, 235, 0.25)' : 'none',
                border: isUser ? 'none' : '1px solid #e2e8f0',
                wordBreak: 'break-word',
              }}>
                {isUser ? (
                  <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                ) : (
                  <div>{formatMessageContent(msg.text)}</div>
                )}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px', padding: '0 4px' }}>
                {msg.time}
              </span>
            </div>
          );
        })}

        {/* Typing indicator */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#f8fafc', borderRadius: '12px', alignSelf: 'flex-start', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.9rem' }}>🤖</span>
            <span style={{ fontSize: '0.82rem', color: '#64748b' }}>AI đang suy nghĩ và soạn câu trả lời...</span>
            <span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* CHAT INPUT FORM */}
      <div style={{
        padding: '12px 14px',
        borderTop: '1px solid #e2e8f0',
        background: '#ffffff',
      }}>
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Hỏi về CV, việc làm, phỏng vấn..."
            disabled={loading}
            style={{
              flex: 1,
              padding: '11px 14px',
              borderRadius: '24px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              color: '#1e293b',
              fontSize: '0.9rem',
              outline: 'none',
              transition: 'border 0.2s',
            }}
            onFocus={e => e.currentTarget.style.borderColor = '#2563eb'}
            onBlur={e => e.currentTarget.style.borderColor = '#cbd5e1'}
          />

          <button
            type="submit"
            disabled={!inputText.trim() || loading}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: inputText.trim() && !loading ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : '#cbd5e1',
              color: '#ffffff',
              border: 'none',
              cursor: inputText.trim() && !loading ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: inputText.trim() && !loading ? '0 4px 12px rgba(37, 99, 235, 0.35)' : 'none',
              transition: 'all 0.2s',
            }}
            title="Gửi câu hỏi (Enter)"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </form>
      </div>

    </div>
  );
}

