# Pulse Video Streaming Platform - Technical Documentation

## 1. Project Overview

### Problem Statement
In the modern digital landscape, video content consumption is at an all-time high. However, managing video uploads, ensuring content safety, and providing a seamless streaming experience across different user roles is a complex engineering challenge. Organizations need a secure, monitored, and efficient platform to host and stream videos while maintaining content standards.

### Real-world Use Cases
*   **Corporate Training**: Securely hosting internal training videos with role-based access.
*   **Educational Platforms**: Managing course content where only authorised editors can upload, while students (viewers) can only watch.
*   **Content Moderation**: Automated systems that scan uploaded videos for sensitive content before they are made public.

### Target Users
1.  **Viewers**: Can browse safe videos, watch them, and search for content.
2.  **Editors**: Have all viewer permissions plus the ability to upload and manage their own videos.
3.  **Admins**: Full control over the platform, including user management, video oversight, and viewing analysis results.

### Key Features
*   **Secure Authentication**: JWT-based login and registration with multi-tenancy support.
*   **Video Upload & Processing**: Automated transcoding, thumbnail extraction, and metadata probing.
*   **Safety Monitoring**: Integrated sensitivity analysis (detecting red-dominant frames as a proxy for sensitive content).
*   **Real-time Progress**: Socket.io integration to show live upload and processing updates.
*   **Adaptive Streaming**: Support for range-based video streaming for efficient playback.
*   **Interactive Dashboard**: Real-time stats and video management interface.

---

## 2. Tech Stack & Architecture

The project follows a modern **MERN-like** architecture (using SQLite/MongoDB interchangeably in some contexts, but primarily MongoDB for the core application data).

### Frontend
*   **React (Vite)**: For a fast, modular UI development experience.
*   **Tailwind CSS**: For utility-first styling and rapid UI building.
*   **Lucide React**: For consistent and beautiful iconography.
*   **React Router Dom**: For client-side navigation.
*   **Socket.io-client**: For real-time communication with the backend.

### Backend
*   **Node.js & Express**: The core server framework handling API requests.
*   **Socket.io**: Enabling real-time, bi-directional communication between the server and clients.
*   **Multer**: Handling multi-part/form-data for video uploads.
*   **Fluent-ffmpeg**: A wrapper for FFmpeg to process videos (screenshots, metadata).
*   **Sharp**: High-performance image processing for frame analysis.
*   **Bcrypt & JWT**: For password hashing and secure session management.

### Database & Storage
*   **MongoDB (Mongoose)**: Document-oriented database for storing user profiles and video metadata.
*   **GridFS / Local Storage**: Currently uses a local `uploads/` directory for simplicity, with hooks for GridFS integration.
*   **In-Memory Fallback**: For development ease, the system can spin up an in-memory MongoDB instance if NoSQL credentials are missing.

---

## 3. Folder & File Structure

### Root Directory
*   `backend/`: Server-side logic, API, and storage.
*   `frontend/`: Client-side React application.
*   `.gitignore`: Global ignore rules.

### Backend Breakdown
*   `config/`: Configuration files (e.g., `database.js`).
*   `controllers/`: Request handlers (e.g., `videoController.js`, `authController.js`).
*   `middleware/`: Custom Express middleware (e.g., `auth.js` for JWT verification).
*   `models/`: Mongoose schemas (e.g., `User.js`, `Video.js`).
*   `routes/`: API endpoint definitions mapping to controllers.
*   `services/`: Business logic separated from controllers (e.g., `sensitivity.js` for AI analysis).
*   `uploads/`: Local directory for stored videos, thumbnails, and temporary frames.
*   `server.js`: Entry point, initializes Express and Socket.io.

### Frontend Breakdown
*   `src/components/`: Reusable UI elements (Layout, Navbar, etc.).
*   `src/pages/`: Main application views (Dashboard, VideoPlayer, etc.).
*   `src/contexts/`: React Context for global state (e.g., Auth state).
*   `src/services/`: API client services.
*   `src/App.jsx`: Main routing logic.
*   `tailwind.config.js`: Styling configuration.

---

## 4. Environment Setup & Installation

### Prerequisites
*   **Node.js** (v18+ recommended)
*   **NPM** or **Yarn**
*   **FFmpeg** installed on the host system (critical for video processing)
*   **MongoDB** (Local or Atlas instance)

### Environment Variables
Create a `.env` file in the `backend/` directory:
```env
PORT=5000
JWT_SECRET=your_jwt_secret_key
MONGODB_URI=your_mongodb_connection_string
NODE_ENV=development
```

### Installation Steps
1.  **Clone the repository**.
2.  **Backend Setup**:
    ```bash
    cd backend
    npm install
    npm run dev # Starts with nodemon
    ```
3.  **Frontend Setup**:
    ```bash
    cd ../frontend
    npm install
    npm run dev # Starts Vite dev server
    ```
4.  **Access the application** at `http://localhost:5173`.

---

## 5. Core Concepts & Data Flow

### The "Monitoring" Lifecycle
1.  **Upload**: User uploads a video.
2.  **Storage**: Multer saves the file; Mongoose creates a metadata record with status `uploaded`.
3.  **Background Processing**:
    *   **Phase 1**: FFmpeg extracts a thumbnail and probes duration.
    *   **Phase 2**: Sensitivity Analysis (via `sensitivity.js`) extracts frames and checks for safety violations (red-dominant frames).
4.  **Real-time Updates**: Throughout processing, the backend emits events via Socket.io to notify the frontend.
5.  **Finalization**: Video status is updated to `safe` or `flagged`.

---

## 6. Backend Deep Dive

### API Design
*   `POST /api/auth/register`: Create a new user (default role: viewer).
*   `POST /api/auth/login`: Authenticate and receive a JWT.
*   `GET /api/videos`: List videos filtered by tenant and safety status.
*   `POST /api/videos/upload`: (Editors/Admins only) Upload video and initiate processing.
*   `GET /api/videos/stream/:id`: Stream video using range-based chunking.

### Middleware
*   `auth.js`: Verifies the JWT in the `Authorization` header and attaches the user object to `req`.
*   **Multer Configuration**: Restricted to video files and handles disk storage with unique filenames.

---

## 7. Frontend Deep Dive

### UI Architecture
The UI is built using a **component-driven** approach.
*   **Responsive Layout**: Uses Tailwind's grid and flexbox for mobile-first design.
*   **State Management**: React `useContext` handles authentication across the entire app.
*   **Routing**: Protected routes ensure only authenticated users can access the dashboard.

### Real-time Integration
The `VideoUpload` and `Dashboard` pages listen for socket events:
*   `upload-complete`: Triggered when file writing is done.
*   `processing-update`: Shows progress percentage during analysis.
*   `processing-complete`: Final UI state change (e.g., green shield for safe, red for flagged).

---

## 8. Database & Storage Design

### Models
*   **User**: email, hashed password, role (viewer/editor/admin), tenantId.
*   **Video**: title, path, uploaderId, tenantId, status (uploaded/processing/safe/flagged), views, duration, analysisResults.

### GridFS Consideration
While currently using local storage, the `Video` model includes a `fileId` field designed for GridFS integration, allowing the platform to scale to terabytes of video data using MongoDB's chunking system.

---

## 9. Security & Best Practices
*   **Password Hashing**: Bcrypt is used with a salt factor of 10.
*   **JWT Security**: Tokens are stateless and include the user's role and tenantId to prevent cross-tenant data leaks.
*   **Input Sanitization**: Mongoose's built-in validation and explicit checks in controllers.
*   **Error Handling**: Centralized error middleware in `server.js` prevents leaking stack traces in production.

---

## 10. Future Improvements
*   **Transcoding**: Implementation of HLS/DASH for adaptive bitrate streaming.
*   **Advanced AI**: Moving beyond red-pixel detection to a full NSFW model using `nsfwjs` (partially implemented in dependencies).
*   **Cloud Storage**: Integration with AWS S3 or Google Cloud Storage for the video assets.
*   **Unit/Integration Testing**: Adding Jest and Supertest for API coverage.

---

## 11. Contribution Guidelines
We welcome contributions!
1.  **Fork** the repo.
2.  **Create a feature branch** (`git checkout -b feature/AmazingFeature`).
3.  **Commit your changes** (`git commit -m 'Add some AmazingFeature'`).
4.  **Push to the branch** (`git push origin feature/AmazingFeature`).
5.  **Open a Pull Request**.

---
*Documentation maintained by the Pulse Engineering Team.*
