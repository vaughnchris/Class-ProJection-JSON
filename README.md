# Class Projection

Class Projection is a web-based, collaborative classroom coding platform built specifically for computer science education. It allows instructors to write Python code in a professional-grade editor and (coming soon) broadcast it in real-time directly to their students' screens.

The platform executes Python code entirely in the browser using WebAssembly (Pyodide), meaning there are no backend execution servers to manage and no complex local development environments for students to set up.

## Features

- 🚀 **In-Browser Python Execution**: Run Python code instantly without a backend server using Pyodide web workers.
- 💻 **Interactive REPL**: A built-in interactive Python console that preserves state between commands, just like a local terminal.
- 🎨 **Professional Editor**: Integrated Monaco Editor (the core of VS Code) with syntax highlighting, line numbers, and a resizable split-pane layout.
- 🔐 **Automated Role Management**: Automatic role assignment based on college email domains:
  - `@yosemite.edu` -> Instructor Access (Broadcast controls)
  - `@my.yosemite.edu` -> Student Access (View-only mode)
- 👤 **Custom Profiles**: Built-in profile editor allowing users to set their name and choose dynamic avatars.

## Technology Stack

- **Frontend Framework**: React 18 + Vite
- **Code Editor**: Monaco Editor (`@monaco-editor/react`)
- **Python Runtime**: Pyodide (`pyodide.js`)
- **State Management**: Zustand
- **Backend & Database**: Firebase (Authentication, Firestore)
- **Deployment**: Firebase Hosting
- **Styling**: Vanilla CSS (Custom Glassmorphism Design System)
- **Icons**: Lucide React

## Installation & Setup

### 1. Clone & Install Dependencies
First, clone the repository and install the Node modules.
```bash
npm install
```

### 2. Configure Firebase
This project relies on Firebase for Authentication and Firestore. 
1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. Enable **Authentication** and turn on the **Email/Password** provider.
3. Enable **Firestore Database** (you can start in Test Mode).
4. Register a "Web App" in your Firebase project settings to get your configuration object.
5. Open `src/firebase.js` in the project and replace the `firebaseConfig` variable with your project's credentials.

### 3. Update Firestore Security Rules
To allow users to edit their profiles, update your Firestore Security rules in the Firebase Console:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 4. Run Locally
Start the Vite development server:
```bash
npm run dev
```

## Deployment
To deploy the application to Firebase Hosting:

1. Initialize Firebase in the repository (if you haven't already):
```bash
npx firebase-tools init hosting
```
2. Build the production bundle and deploy:
```bash
npm run build
npx firebase-tools deploy --only hosting
```

## Testing Accounts
Because the application does not have a public "Sign Up" page, accounts must be manually provisioned in the Firebase Console (Authentication -> Users) using the default password `passwd`. Upon their first login, users will be securely forced to change their password.
