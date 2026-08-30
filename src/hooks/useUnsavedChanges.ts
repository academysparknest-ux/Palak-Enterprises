import { useEffect } from 'react';

/**
 * Custom hook to guard against accidental navigation or tab closure
 * when there are unsaved modifications in forms, template editors, or rosters.
 *
 * @param isDirty boolean indicating if unsaved changes exist
 * @param warningMessage custom prompt message (for beforeunload)
 */
export function useUnsavedChanges(
  isDirty: boolean,
  warningMessage = 'You have unsaved changes that will be lost if you leave this page. Are you sure you want to proceed?'
) {
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = warningMessage;
      return warningMessage;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, warningMessage]);
}
