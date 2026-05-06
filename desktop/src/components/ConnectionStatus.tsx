export function ConnectionStatus({ isConnected }: { isConnected: boolean }) {
  return (
    <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
      isConnected
        ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30'
        : 'text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/30'
    }`}>
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
        isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-400'
      }`} />
      {isConnected ? 'Online' : 'Offline'}
    </span>
  );
}
