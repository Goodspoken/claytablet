import { Link } from 'react-router-dom';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-8">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="text-blue-500 hover:underline mb-8 inline-block">← Back to home</Link>
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
        <p className="mb-4">Last updated: April 27, 2026</p>
        
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">1. Data Collection</h2>
          <p>DubTab is a real-time sharing tool. We store the text, images, and audio messages you upload to rooms for a limited period (based on the room TTL settings).</p>
          
          <h2 className="text-xl font-semibold">2. Authentication</h2>
          <p>When you use Google or Yandex to sign in, we only store your email and public profile information (name, picture) to manage your rooms.</p>
          
          <h2 className="text-xl font-semibold">3. Data Deletion</h2>
          <p>All room content is automatically deleted after the room expires. You can manually delete individual items or entire rooms at any time.</p>
        </section>
      </div>
    </div>
  );
}
