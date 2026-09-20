import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#060d18',
        flexDirection: 'column',
        gap: '24px',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h1
          style={{
            fontSize: '72px',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
            lineHeight: 1,
          }}
        >
          404
        </h1>
        <p
          style={{
            fontSize: '18px',
            color: 'rgba(255,255,255,0.6)',
            marginTop: '12px',
            marginBottom: '32px',
          }}
        >
          Page not found
        </p>
        <Link
          href="/dashboard"
          style={{
            background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
            color: '#001a0e',
            padding: '12px 28px',
            borderRadius: '12px',
            fontWeight: 700,
            fontSize: '14px',
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
