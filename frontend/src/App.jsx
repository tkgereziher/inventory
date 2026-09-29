import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Public & Landing Views
import { PublicPortalView } from './views/PublicPortalView';
import { PricingView } from './views/PricingView';
import { CheckoutView } from './views/CheckoutView';
import { PaymentCallbackView } from './views/PaymentCallbackView';
import { SkuTrackerView } from './views/SkuTrackerView';
import { TenantLoginView } from './views/TenantLoginView';

// Tenant Workspace Views
import { WorkspaceLayout } from './views/WorkspaceLayout';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Portal Landing */}
          <Route path="/" element={<PublicPortalView />} />

          {/* Pricing & Subscriptions */}
          <Route path="/pricing" element={<PricingView />} />
          <Route path="/checkout" element={<CheckoutView />} />
          <Route path="/subscribe" element={<CheckoutView />} />

          {/* Chapa Payment Callback & Verification */}
          <Route path="/payment/callback" element={<PaymentCallbackView />} />

          {/* Public SKU & Barcode Tracker */}
          <Route path="/verify-sku" element={<SkuTrackerView />} />

          {/* Tenant Gateway & Sign In */}
          <Route path="/login" element={<TenantLoginView />} />
          <Route path="/portal-select" element={<TenantLoginView />} />

          {/* Tenant Management Workspace */}
          <Route path="/app" element={<Navigate to="/app/dashboard" replace />} />
          <Route path="/app/:tab" element={<WorkspaceLayout />} />
          <Route path="/workspace" element={<Navigate to="/app/dashboard" replace />} />
          <Route path="/workspace/:tab" element={<WorkspaceLayout />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
