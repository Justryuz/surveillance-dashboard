import { Component } from 'react';

// Catches a render error in a page and shows the message on screen instead of
// leaving a blank page, so the exact error can be read (and reported) without
// opening the browser console.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="p-6 text-sm text-slate-700 dark:text-slate-200 overflow-auto h-full">
        <div className="font-black text-red-600 mb-2">Halaman ini mengalami ralat (this page hit an error)</div>
        <pre className="whitespace-pre-wrap text-xs bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg p-3 mb-3">
          {String(error?.message || error)}
          {'\n\n'}
          {String(error?.stack || '').split('\n').slice(1, 6).join('\n')}
        </pre>
        <button
          onClick={() => this.setState({ error: null })}
          className="px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 text-xs font-bold"
        >
          Cuba semula
        </button>
      </div>
    );
  }
}
