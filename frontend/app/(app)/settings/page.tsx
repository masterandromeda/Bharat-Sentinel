export default function SettingsPage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#e2e8f0]">Settings</h1>
        <p className="text-[#64748b] text-sm mt-1">
          Platform configuration and environment settings
        </p>
      </div>

      <div className="glass-card p-6 mb-4">
        <h2 className="text-sm font-semibold text-[#e2e8f0] uppercase tracking-wide mb-4">Environment</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-[#1e2d4a]">
            <span className="text-[#4a5f7a]">Backend URL</span>
            <code className="text-blue-400 text-xs bg-white/5 px-2 py-0.5 rounded">http://localhost:8080</code>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[#1e2d4a]">
            <span className="text-[#4a5f7a]">WebSocket</span>
            <code className="text-blue-400 text-xs bg-white/5 px-2 py-0.5 rounded">ws://localhost:8080/ws/events</code>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[#1e2d4a]">
            <span className="text-[#4a5f7a]">AI Engine</span>
            <span className="text-[#64748b] text-xs">Configured via <code className="text-blue-400">AZURE_OPENAI_API_KEY</code> in backend <code className="text-blue-400">.env</code></span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-[#4a5f7a]">Notion Integration</span>
            <span className="text-[#64748b] text-xs">Configured via <code className="text-blue-400">NOTION_API_KEY</code> + <code className="text-blue-400">NOTION_DATABASE_ID</code></span>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h2 className="text-sm font-semibold text-[#e2e8f0] uppercase tracking-wide mb-3">Configure</h2>
        <p className="text-[#4a5f7a] text-xs leading-relaxed">
          All credentials are configured via the backend <code className="text-blue-400">.env</code> file.
          Copy <code className="text-blue-400">.env.example</code> to <code className="text-blue-400">.env</code> and
          fill in your Azure OpenAI and Notion credentials. Never commit <code className="text-blue-400">.env</code> to source control.
        </p>
      </div>
    </div>
  );
}
