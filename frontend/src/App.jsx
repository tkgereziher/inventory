import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LoginModal } from './components/LoginModal';

// Views
import { PublicPortalView } from './views/PublicPortalView';
import { DashboardView } from './views/DashboardView';
import { ProductsView } from './views/ProductsView';
import { WarehousesView } from './views/WarehousesView';
import { StockOperationsView } from './views/StockOperationsView';
import { PurchaseOrdersView } from './views/PurchaseOrdersView';
import { SalesOrdersView } from './views/SalesOrdersView';
import { BarcodeScannerView } from './views/BarcodeScannerView';
import { AlertsView } from './views/AlertsView';
import { AuditLogView } from './views/AuditLogView';
import { TenantSettingsView } from './views/TenantSettingsView';

function InventoryApp() {
  // 'public' for marketing portal website, or 'workspace' for internal tenant management
  const [viewMode, setViewMode] = useState('public'); 
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [showAuthModal, setShowAuthModal] = useState(false);

  const renderWorkspaceView = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardView onNavigate={(tab) => setCurrentTab(tab)} />;
      case 'products':
        return <ProductsView />;
      case 'warehouses':
        return <WarehousesView />;
      case 'operations':
        return <StockOperationsView />;
      case 'purchase_orders':
        return <PurchaseOrdersView />;
      case 'sales_orders':
        return <SalesOrdersView />;
      case 'barcode_station':
        return <BarcodeScannerView />;
      case 'alerts':
        return <AlertsView onNavigate={(tab) => setCurrentTab(tab)} />;
      case 'audit':
        return <AuditLogView />;
      case 'settings':
        return <TenantSettingsView />;
      default:
        return <DashboardView onNavigate={(tab) => setCurrentTab(tab)} />;
    }
  };

  // 1. If in Public Website Mode
  if (viewMode === 'public') {
    return (
      <>
        <PublicPortalView
          onEnterTenant={() => setViewMode('workspace')}
          onOpenAuth={() => setShowAuthModal(true)}
        />
        <LoginModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onLoginSuccess={() => setViewMode('workspace')}
        />
      </>
    );
  }

  // 2. If in Tenant Management Workspace Mode
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800 selection:bg-emerald-500 selection:text-white">
      {/* Top Tenant Navbar */}
      <Navbar
        onOpenAuth={() => setShowAuthModal(true)}
        onOpenScanner={() => setCurrentTab('barcode_station')}
        onBackToPublic={() => setViewMode('public')}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        {/* Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
          onBackToPublic={() => setViewMode('public')}
        />

        {/* Dynamic View Content Area */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto max-w-full">
          {renderWorkspaceView()}
        </main>
      </div>

      {/* Auth / Demo Switch Modal */}
      <LoginModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLoginSuccess={() => setViewMode('workspace')}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <InventoryApp />
    </AuthProvider>
  );
}
