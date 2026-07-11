import { useEffect, useRef } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import useStore from '../store/useStore';

export const useWorkspaceSync = () => {
  const tabs = useStore(state => state.tabs);
  const activeTab = useStore(state => state.activeTab);
  const user = useStore(state => state.user);
  const sessionId = useStore(state => state.sessionId);
  const isSharing = useStore(state => state.isSharing);
  
  const timeoutRef = useRef(null);
  const isFirstLoad = useRef(true);
  const previousUid = useRef(null);

  // We only want to save the user's independent workspace, not their session-in-progress state
  // if they are actively in someone else's session (although student tabs are separate, 
  // it's safer to just sync whenever tabs change, as long as they are logged in).

  useEffect(() => {
    // Prevent saving on initial render or if no user is logged in
    if (!user || !user.uid) {
      previousUid.current = null;
      return;
    }

    // If a new user just logged in, skip the first save to prevent overwriting cloud data
    // before the cloud data has a chance to load and hydrate the local store.
    if (previousUid.current !== user.uid) {
      previousUid.current = user.uid;
      isFirstLoad.current = true;
      
      // Give the app 3 seconds to hydrate from cloud before we start watching for changes
      setTimeout(() => {
        isFirstLoad.current = false;
      }, 3000);
      return;
    }

    if (isFirstLoad.current) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce the save operation by 2 seconds
    timeoutRef.current = setTimeout(async () => {
      try {
        const docRef = doc(db, 'users', user.uid);
        // Save tabs and activeTab under a 'workspace' object
        await setDoc(docRef, {
          workspace: {
            tabs,
            activeTab
          },
          lastWorkspaceSync: new Date().toISOString()
        }, { merge: true });
        console.debug('Workspace synced to cloud for user:', user.uid);
      } catch (err) {
        console.error('Failed to sync workspace to cloud:', err);
      }
    }, 2000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [tabs, activeTab, user]); 
};
