import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Terminal, X, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

const VisualLogger: React.FC = () => {
    const { logs, clearLogs } = useStore();
    const [isOpen, setIsOpen] = useState(true);
    const [isMinimized, setIsMinimized] = useState(false);

    if (!isOpen) {
        return (
            <button 
                onClick={() => setIsOpen(true)}
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    left: '20px',
                    zIndex: 10000,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '50%',
                    width: '50px',
                    height: '50px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-blue)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                    cursor: 'pointer'
                }}
            >
                <Terminal size={24} />
            </button>
        );
    }

    return (
        <div 
            style={{
                position: 'fixed',
                bottom: '20px',
                left: '20px',
                width: isMinimized ? '200px' : '400px',
                maxHeight: isMinimized ? '40px' : '300px',
                zIndex: 10000,
                background: 'rgba(15, 15, 20, 0.95)',
                backdropFilter: 'blur(10px)',
                border: '1px solid var(--border-light)',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                transition: 'all 0.3s ease',
                overflow: 'hidden'
            }}
        >
            <div 
                style={{
                    padding: '10px 15px',
                    borderBottom: isMinimized ? 'none' : '1px solid var(--border-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(255,255,255,0.03)'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-dim)', letterSpacing: '1px' }}>
                    <Terminal size={14} />
                    SYSTEM LOGS
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={() => setIsMinimized(!isMinimized)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
                        {isMinimized ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <button onClick={clearLogs} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
                        <Trash2 size={14} />
                    </button>
                    <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
                        <X size={16} />
                    </button>
                </div>
            </div>

            {!isMinimized && (
                <div 
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '10px',
                        display: 'flex',
                        flexDirection: 'column-reverse',
                        gap: '4px',
                        fontFamily: 'monospace',
                        fontSize: '0.75rem'
                    }}
                >
                    {logs.length === 0 ? (
                        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px', fontSize: '0.7rem' }}>
                            No active logs...
                        </div>
                    ) : (
                        logs.map((log) => (
                            <div 
                                key={log.id} 
                                style={{
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    background: log.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 
                                               log.type === 'warn' ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
                                    color: log.type === 'error' ? '#f87171' : 
                                           log.type === 'warn' ? '#fbbf24' : '#94a3b8',
                                    borderLeft: `2px solid ${
                                        log.type === 'error' ? '#ef4444' : 
                                        log.type === 'warn' ? '#f59e0b' : '#3b82f6'
                                    }`,
                                    wordBreak: 'break-word',
                                    animation: 'slideIn 0.2s ease-out'
                                }}
                            >
                                <span style={{ opacity: 0.4, marginRight: '8px' }}>
                                    {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                                {log.message}
                            </div>
                        ))
                    )}
                </div>
            )}
            
            <style>{`
                @keyframes slideIn {
                    from { opacity: 0; transform: translateX(-10px); }
                    to { opacity: 1; transform: translateX(0); }
                }
            `}</style>
        </div>
    );
};

export default VisualLogger;
