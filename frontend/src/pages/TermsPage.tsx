import { Link } from 'react-router-dom';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-8">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="text-blue-500 hover:underline mb-8 inline-block">← Back to home</Link>
        <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
        <p className="mb-4">Last updated: April 27, 2026</p>
        
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
          <p>By using ClayTablet, you agree to these terms. If you do not agree, please do not use the service.</p>
          
          <h2 className="text-xl font-semibold">2. Ephemeral Nature</h2>
          <p>You understand that ClayTablet is designed for ephemeral data sharing. Content is not stored permanently and will be deleted after room expiration.</p>
          
          <h2 className="text-xl font-semibold">3. Prohibited Content</h2>
          <p>Users are prohibited from uploading illegal content, malware, or any content that violates the rights of others.</p>
          
          <h2 className="text-xl font-semibold">4. Disclaimer</h2>
          <p>The service is provided "as is" without warranty of any kind. We are not responsible for any data loss.</p>
        </section>
      </div>
    </div>
  );
}
