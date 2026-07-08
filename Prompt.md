# System Overview
Build a real-time, client-side collaborative classroom coding platform designed for an instructor to broadcast code directly to students' screens, overcoming poor classroom visibility. The platform runs entirely in the browser, leveraging local client-side execution to eliminate server-side code-running overhead.

## Technical Stack
- **Frontend Framework**: React (using Vite for tooling)
- **Code Editor**: `@monaco-editor/react` (Monaco Editor)
- **Execution Environment**: Pyodide (Python compiled to WebAssembly) for client-side execution
- **Backend & Real-Time Sync**: Firebase (Firestore for state synchronization, Firebase Auth for authentication)
- **State Management**: React Context API or Zustand

## Core Operational Modes

### 1. Broadcast Mode (Instructor Locked)
- **Behavior**: The student's editor becomes completely read-only.
- **Synchronization**: The instructor's Monaco editor state (code content) mirrors to all connected student instances in real-time via Firebase Firestore listeners.
- **Follow-Me Scrolling**: Sync the instructor's cursor position and scroll depth so students automatically view the exact lines being discussed.

### 2. Fork & Execute Mode (Student Unlocked)
- **Behavior**: When the instructor toggles "Release to Students," the real-time sync pauses for the student's main editor code block.
- **Local Workspace**: The app creates a local snapshot of the instructor's current code and injects it into the student's writable editor.
- **Execution**: Students can edit and execute this code locally via Pyodide without altering the instructor's master code copy.

## Required Features

### 1. Contextual Chat & Live Debugging (Integrated)
- **Student UI**: A built-in messaging panel allowing private question submission.
- **Instructor UI**: When the instructor opens a specific student's chat thread, the interface must provide a split-pane view: the chat history on one side, and a live, synchronized Monaco editor displaying the student's current code on the other.
- **Two-Way Code Intervention**: The instructor's view of the student's code must be writable. Any edits the instructor makes in this view must sync in real-time back to the student's local editor, allowing the instructor to fix typos or demonstrate logic while chatting.
- **Global FAQ**: The instructor can choose to broadcast a specific chat answer (stripped of identifying student info) to the entire class as an announcement.

### 2. "I'm Lost" Indicator
- **Student UI**: A subtle, non-intrusive toggle button labeled "I need assistance" or "I'm lost."
- **Instructor Dashboard**: A live counter displaying the percentage or total number of active students who have flagged themselves as lost, enabling real-time pace adjustment.

### 3. Anonymous Projection
- **Behavior**: A toggle allowing the instructor to broadcast any specific student's code screen to the rest of the class for review.
- **Privacy**: When activated, all identifying information must be automatically stripped and replaced with an anonymous placeholder.

### 4. Snippet Pushing (Scaffolding)
- **Behavior**: An instructor interface to push boilerplate code, structural comments, or skeleton code blocks directly into all student editors simultaneously, resetting the workspace to a uniform starting point.

### 5. Local Storage Persistence
- **Behavior**: The student workspace must continuously auto-save to browser localStorage. In the event of an accidental tab refresh or network drop, the local code and current operational state must instantly restore upon reconnecting.

## Database Schema Constraints (Firebase Firestore)
- `/sessions/{sessionId}`: Document containing the instructor's current code, cursor position, scroll depth, active mode (Broadcast vs. Unlocked), and anonymous broadcast targets.
- `/sessions/{sessionId}/students/{studentId}`: Documents tracking individual student presence, active code state (continuously updated for live debugging), "I'm Lost" status, and connection health.
- `/sessions/{sessionId}/messages/{messageId}`: Documents handling the real-time Q&A chat, containing the question payload, instructor reply, and a boolean flag for global broadcast visibility. Tied to the studentId so the code-peek view can query the correct code state.

## Non-Functional Requirements
- **Zero Server Compilation**: All Python execution must happen strictly via Pyodide in the browser web worker thread to prevent execution lag and infrastructure costs.
- **Debounced Syncing**: Editor text synchronization to Firestore must be debounced (e.g., 300ms) to prevent excessive database writes during active typing, both for the main broadcast and the student's individual code states.
- **Clean Layout**: A minimalist layout prioritizing maximum code screen real estate, featuring an editor panel, a local execution console output panel, and a top control bar for mode switching and chat access.