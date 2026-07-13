import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { db, storage } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

export const exportLecturePackage = async (sessionId, tabs, studentFeatures, onProgress) => {
  try {
    const defaultName = `Lecture Package - ${new Date().toLocaleDateString()}`;
    const customName = window.prompt("Enter a name for this lecture package:", defaultName);
    
    // User cancelled the prompt
    if (customName === null) {
      return false;
    }
    
    const finalName = customName.trim() || defaultName;
    const zip = new JSZip();
    
    // 1. Fetch test questions from Firestore
    let testQuestions = [];
    if (sessionId) {
      const sessionRef = doc(db, 'sessions', sessionId);
      const docSnap = await getDoc(sessionRef);
      if (docSnap.exists() && docSnap.data().testQuestions) {
        testQuestions = docSnap.data().testQuestions;
      }
    }

    // 2. Build Manifest
    const manifest = {
      version: 1,
      program: 'python',
      title: finalName,
      testQuestions,
      studentFeatures,
      tabs: []
    };

    // 3. Process Tabs
    for (const tab of tabs) {
      if (tab.id === 'about') continue; // Don't export the default about tab

      if (tab.isPresentation && tab.presentationUrl) {
        if (onProgress) onProgress(`Downloading ${tab.name}...`);
        
        // Fetch PDF Blob
        const response = await fetch(tab.presentationUrl);
        if (!response.ok) throw new Error(`Failed to fetch PDF for ${tab.name}`);
        const blob = await response.blob();
        
        // Add PDF to zip
        zip.file(tab.name, blob);
        
        // Add metadata to manifest (without the URL, as it will be re-uploaded)
        manifest.tabs.push({
          ...tab,
          presentationUrl: null, // clear the URL for export
          pdfFilename: tab.name
        });
      } else {
        // Normal code tab
        manifest.tabs.push(tab);
      }
    }

    // 4. Add Manifest to Zip
    zip.file("manifest.json", JSON.stringify(manifest, null, 2));

    // 5. Generate and Download Zip
    if (onProgress) onProgress('Zipping files...');
    const content = await zip.generateAsync({ type: "blob" });
    const safeFilename = finalName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    saveAs(content, `${safeFilename}.zip`);
    
    if (onProgress) onProgress('');
    return true;
  } catch (error) {
    console.error("Failed to export lecture package:", error);
    throw error;
  }
};

export const importLecturePackage = async (file, sessionId, setTabs, onProgress) => {
  try {
    const zip = await JSZip.loadAsync(file);
    
    // 1. Read Manifest
    const manifestFile = zip.file("manifest.json");
    if (!manifestFile) {
      throw new Error("Invalid package: missing manifest.json");
    }
    const manifestStr = await manifestFile.async("string");
    const manifest = JSON.parse(manifestStr);

    if (manifest.program !== 'python') {
      throw new Error("This lecture package is not compatible with Python Class Projector (it may be a Web Laboratory package).");
    }

    // 2. Upload PDFs and rebuild Tabs
    const newTabs = [];
    for (const tab of manifest.tabs) {
      if (tab.isPresentation && tab.pdfFilename) {
        if (onProgress) onProgress(`Uploading ${tab.pdfFilename}...`);
        
        // Get the PDF binary from zip
        const pdfFile = zip.file(tab.pdfFilename);
        if (!pdfFile) {
          console.warn(`PDF file ${tab.pdfFilename} missing from zip!`);
          continue;
        }
        const blob = await pdfFile.async("blob");
        
        // Upload to Firebase Storage
        const filename = `presentation_${Date.now()}_${tab.pdfFilename}`;
        const storageRef = ref(storage, `presentations/${sessionId}/${filename}`);
        
        const snapshot = await uploadBytesResumable(storageRef, blob);
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        newTabs.push({
          ...tab,
          id: `presentation_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, // Assign new ID to avoid collisions
          presentationUrl: downloadURL
        });
      } else {
        // Normal code tab
        newTabs.push({
          ...tab,
          id: `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}` // Assign new ID
        });
      }
    }

    // 3. Update Firestore (Questions & Tabs & Features)
    if (sessionId) {
      if (onProgress) onProgress('Updating session...');
      const sessionRef = doc(db, 'sessions', sessionId);
      const updateData = { 
        testQuestions: manifest.testQuestions || [],
        instructorTabs: newTabs
      };
      if (manifest.title) {
        updateData.sessionTitle = manifest.title;
      }
      if (manifest.studentFeatures) {
        updateData.studentFeatures = manifest.studentFeatures;
      }
      await updateDoc(sessionRef, updateData);
    }

    // 4. Update local state
    setTabs(newTabs);

    if (onProgress) onProgress('');
    return newTabs;
  } catch (error) {
    console.error("Failed to import lecture package:", error);
    throw error;
  }
};
