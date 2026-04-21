'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logger } from '@/lib/logger';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        logger.error('ErrorBoundary caught an error', error, {
            componentStack: errorInfo.componentStack,
        });
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    minHeight: '200px', padding: '2rem', textAlign: 'center', gap: '1rem',
                }}>
                    <div style={{ fontSize: '3rem' }}>😵</div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b' }}>
                        Bir şeyler yanlış gitti
                    </h2>
                    <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: '320px' }}>
                        Endişelenme, diğer bölümler çalışmaya devam ediyor.
                    </p>
                    <button
                        onClick={this.handleRetry}
                        style={{
                            padding: '0.625rem 1.5rem', borderRadius: '12px', border: 'none',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff',
                            fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
                            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)',
                            transition: 'transform 0.15s, box-shadow 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                    >
                        🔄 Tekrar Dene
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
