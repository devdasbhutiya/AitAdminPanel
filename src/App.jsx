import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ProtectedRoute } from './components/common';
import { Layout } from './components/layout';
import {
  Login,
  Dashboard,
  Users,
  Courses,
  Branches,
  Events,
  Notices,
  Timetable,
  Assignments,
  Analytics,
  Attendance,
  Students,
  Results
} from './pages';
import './styles/index.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public route */}
            <Route path="/login" element={<Login />} />

            {/* Protected routes with layout */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/timetable" replace />} />
              <Route path="dashboard" element={
                <ProtectedRoute requiredPage="dashboard">
                  <Dashboard />
                </ProtectedRoute>
              } />

              <Route path="users" element={
                <ProtectedRoute requiredPage="users">
                  <Users />
                </ProtectedRoute>
              } />

              <Route path="courses" element={
                <ProtectedRoute requiredPage="courses">
                  <Courses />
                </ProtectedRoute>
              } />

              <Route path="branches" element={
                <ProtectedRoute requiredPage="branches">
                  <Branches />
                </ProtectedRoute>
              } />

              <Route path="events" element={
                <ProtectedRoute requiredPage="events">
                  <Events />
                </ProtectedRoute>
              } />

              <Route path="notices" element={
                <ProtectedRoute requiredPage="notices">
                  <Notices />
                </ProtectedRoute>
              } />

              <Route path="timetable" element={
                <ProtectedRoute requiredPage="timetable">
                  <Timetable />
                </ProtectedRoute>
              } />

              <Route path="assignments" element={
                <ProtectedRoute requiredPage="assignments">
                  <Assignments />
                </ProtectedRoute>
              } />

              <Route path="analytics" element={
                <ProtectedRoute requiredPage="analytics">
                  <Analytics />
                </ProtectedRoute>
              } />

              <Route path="attendance" element={
                <ProtectedRoute requiredPage="attendance">
                  <Attendance />
                </ProtectedRoute>
              } />

              <Route path="students" element={
                <ProtectedRoute requiredPage="students">
                  <Students />
                </ProtectedRoute>
              } />

              <Route path="results" element={
                <ProtectedRoute requiredPage="results">
                  <Results />
                </ProtectedRoute>
              } />
            </Route>

            {/* Catch all - redirect to timetable */}
            <Route path="*" element={<Navigate to="/timetable" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
