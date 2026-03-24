import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import { useHandwritingStore } from '../stores/handwritingStore';
import { useToastStore } from '../stores/toastStore';

const Library: React.FC = () => {
  const { styles, fetchStyles, deleteStyle, setActiveStyleId, isLoadingStyles } =
    useHandwritingStore();
  const addToast = useToastStore((s) => s.addToast);

  useEffect(() => {
    fetchStyles();
  }, [fetchStyles]);

  const handleDelete = async (id: string, name: string) => {
    try {
      await deleteStyle(id);
      addToast(`"${name}" deleted`, 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to delete style', 'error');
    }
  };

  const handleUse = (id: string) => {
    setActiveStyleId(id);
    addToast('Style selected! Head to the Generator.', 'success');
  };

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl text-ink">Style Library</h1>
            <p className="text-sm text-ink-secondary mt-1">
              Manage your saved handwriting styles
            </p>
          </div>
          <Link to="/onboarding">
            <Button size="sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New style
            </Button>
          </Link>
        </div>

        {/* Loading */}
        {isLoadingStyles && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-paper-card border border-border rounded-2xl p-6">
                <div className="skeleton h-20 rounded-xl mb-4" />
                <div className="skeleton h-4 rounded w-2/3 mb-2" />
                <div className="skeleton h-3 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoadingStyles && styles.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 bg-paper-section rounded-2xl flex items-center justify-center">
              <svg className="w-10 h-10 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h2 className="font-serif text-xl text-ink mb-2">No styles yet</h2>
            <p className="text-sm text-ink-secondary mb-6 max-w-sm mx-auto">
              Create your first handwriting style by providing writing samples through our onboarding process.
            </p>
            <Link to="/onboarding">
              <Button>Create your first style</Button>
            </Link>
          </div>
        )}

        {/* Style cards */}
        {!isLoadingStyles && styles.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {styles.map((style) => (
              <div
                key={style.id}
                className="bg-paper-card border border-border rounded-2xl p-6 hover:shadow-md hover:border-accent/20 transition-all duration-300 group"
              >
                {/* Preview */}
                <div className="bg-paper-section rounded-xl h-24 flex items-center justify-center mb-4">
                  <span className="font-serif text-4xl text-ink/20 group-hover:text-accent/40 transition-colors">
                    Aa
                  </span>
                </div>

                {/* Info */}
                <h3 className="font-medium text-ink truncate">{style.name}</h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  Created {new Date(style.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  <Link to="/generator" className="flex-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleUse(style.id)}
                    >
                      Use this style
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(style.id, style.name)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Library;
