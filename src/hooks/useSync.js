import { useEffect, useRef } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import useStore from '../store/useStore';

const SESSION_DOC = 'sessions/main_classroom';

export const useSync = () => {
  const { 
    user, 
    role, 
    instructorCode, 
    activeMode, 
    isSharing,
    allowEdit,
    setInstructorCode, 
    setActiveMode,
    setIsSharing,
    setAllowEdit,
    setStudentLocalCode,
    studentLocalCode,
    setStudentSharedLocalCode
  } = useStore();

  const isInstructor = role === 'instructor';
  const debounceTimerRef = useRef(null);
  const prevModeRef = useRef(activeMode);
  const prevAllowEditRef = useRef(allowEdit);
  const prevSharingRef = useRef(isSharing);

  // Instructor: Write to Firestore (Debounced)
  useEffect(() => {
    if (!user || !isInstructor) return;

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce the write to prevent hitting Firestore limits on every keystroke
    debounceTimerRef.current = setTimeout(async () => {
      try {
        await setDoc(doc(db, SESSION_DOC), {
          instructorCode,
          activeMode,
          isSharing,
          allowEdit
        }, { merge: true });
      } catch (err) {
        console.error("Error syncing session state:", err);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(debounceTimerRef.current);
  }, [instructorCode, activeMode, isSharing, allowEdit, isInstructor, user]);


  // Student: Listen from Firestore
  useEffect(() => {
    if (!user || isInstructor) return;

    const unsubscribe = onSnapshot(doc(db, SESSION_DOC), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        
        // Update local instructor code
        if (data.instructorCode !== undefined) {
          setInstructorCode(data.instructorCode);
        }

        // Sync sharing state and handle transition to local workspace
        if (data.isSharing !== undefined) {
          const newSharing = data.isSharing;
          const oldSharing = prevSharingRef.current;
          
          setIsSharing(newSharing);
          prevSharingRef.current = newSharing;

          // When sharing starts, snapshot the current instructor code to student's welcome.py workspace
          if (!oldSharing && newSharing) {
            setStudentLocalCode(data.instructorCode || '');
          }
        }

        // Sync allowEdit state and handle transition to disconnected/independent student editing of the shared tab
        if (data.allowEdit !== undefined) {
          const newAllowEdit = data.allowEdit;
          const oldAllowEdit = prevAllowEditRef.current;
          
          setAllowEdit(newAllowEdit);
          prevAllowEditRef.current = newAllowEdit;

          // Transitioning from lock/read-only to edit-allowed:
          // Take snapshot of instructor code and set it as studentSharedLocalCode
          if (!oldAllowEdit && newAllowEdit) {
            setStudentSharedLocalCode(data.instructorCode || '');
          }
        }

        // Handle Mode Changes
        if (data.activeMode !== undefined) {
          const newMode = data.activeMode;
          const oldMode = prevModeRef.current;
          
          setActiveMode(newMode);
          prevModeRef.current = newMode;

          // If transitioning from Broadcast to Execute, snapshot the instructor code to student local code
          if (oldMode === 'broadcast' && newMode === 'execute') {
            setStudentLocalCode(data.instructorCode || '');
          }
        }
      }
    });

    return () => unsubscribe();
  }, [isInstructor, user, setInstructorCode, setActiveMode, setIsSharing, setAllowEdit, setStudentLocalCode, setStudentSharedLocalCode]);

};
