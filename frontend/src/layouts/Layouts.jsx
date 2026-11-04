import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Footer from '../components/Footer';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';

export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export function GuestLayout() {
  const { session } = useAuth();
  if (session) {
    return <Navigate to="/" replace />;
  }
  return (
    <main>
      <Outlet />
    </main>
  );
}

export function ShopLayout() {
  const { session } = useAuth();
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return (
    <>
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}

export function AdminOnly() {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
