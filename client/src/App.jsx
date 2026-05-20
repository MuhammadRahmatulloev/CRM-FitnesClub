import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Navbar from './components/Navbar'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import TrainersPage from './pages/TrainersPage'
import TrainerDetailPage from './pages/TrainerDetailPage'
import ProfilePage from './pages/ProfilePage'
import MembershipPage from './pages/MembershipPage'
import TrainingPlanPage from './pages/TrainingPlanPage'
import ShopPage from './pages/ShopPage'
import CartPage from './pages/CartPage'
import OrdersPage from './pages/OrdersPage'
import AdminPage from './pages/AdminPage'
import ChatPage from './pages/ChatPage'

function Layout({ children }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={
            <ProtectedRoute><Layout><HomePage /></Layout></ProtectedRoute>
          } />
          <Route path="/trainers" element={
            <ProtectedRoute><Layout><TrainersPage /></Layout></ProtectedRoute>
          } />
          <Route path="/trainers/:id" element={
            <ProtectedRoute><Layout><TrainerDetailPage /></Layout></ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute><Layout><ProfilePage /></Layout></ProtectedRoute>
          } />
          <Route path="/membership" element={
            <ProtectedRoute><Layout><MembershipPage /></Layout></ProtectedRoute>
          } />
          <Route path="/training" element={
            <ProtectedRoute><Layout><TrainingPlanPage /></Layout></ProtectedRoute>
          } />
          <Route path="/shop" element={
            <ProtectedRoute><Layout><ShopPage /></Layout></ProtectedRoute>
          } />
          <Route path="/cart" element={
            <ProtectedRoute><Layout><CartPage /></Layout></ProtectedRoute>
          } />
          <Route path="/orders" element={
            <ProtectedRoute><Layout><OrdersPage /></Layout></ProtectedRoute>
          } />
          <Route path="/chat" element={
            <ProtectedRoute><Layout><ChatPage /></Layout></ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute><Layout><AdminPage /></Layout></ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}