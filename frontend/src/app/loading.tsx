export default function Loading() {
  return (
    <div className='min-h-screen flex items-center justify-center' style={{ background: '#060d18' }}>
      <div className='flex items-center gap-2'>
        <div className='w-2 h-2 rounded-full animate-bounce' style={{ background: '#00ff88', animationDelay: '0ms' }} />
        <div className='w-2 h-2 rounded-full animate-bounce' style={{ background: '#00d4ff', animationDelay: '150ms' }} />
        <div className='w-2 h-2 rounded-full animate-bounce' style={{ background: '#7b2fff', animationDelay: '300ms' }} />
      </div>
    </div>
  );
}
