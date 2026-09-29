import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { LoginModal } from '../components/LoginModal';

// Views
import { DashboardView } from './DashboardView';
import { ProductsView } from './ProductsView';
import { WarehousesView } from './WarehousesView';
import { StockOperationsView } from './StockOperationsView';
import { PurchaseOrdersView } from './PurchaseOrdersView';
import { SalesOrdersView } from './SalesOrdersView';
import { BarcodeScannerView } from './BarcodeScannerView';
import { AlertsView } from './AlertsView';
import { AuditLogView } from './AuditLogView';
import { TenantSettingsView } from './TenantSettingsView';

export const WorkspaceLayout = () => {
  const { tab = 'dashboard' } = useParams();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleSelectTab = (tabId) => {
    navigate(`/app/${tabId}`);
  };

  const renderView = () => {
    switch (tab) {
      case 'dashboard':
        return <DashboardView onNavigate={(t) => handleSelectTab(t)} />;
      case 'products':
        return <ProductsView />;
      case 'warehouses':
        return <WarehousesView />;
      case 'operations':
        return <StockOperationsView />;
      case 'purchase_orders':
      case 'purchase-orders':
        return <PurchaseOrdersView />;
      case 'sales_orders':
      case 'sales-orders':
        return <SalesOrdersView />;
      case 'barcode_station':
      case 'barcode-station':
        return <BarcodeScannerView />;
      case 'alerts':
        return <AlertsView onNavigate={(t) => handleSelectTab(t)} />;
      case 'audit':
        return <AuditLogView />;
      case 'settings':
      case 'billing':
        return <TenantSettingsView />;
      default:
        return <DashboardView onNavigate={(t) => handleSelectTab(t)} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800 selection:bg-emerald-500 selection:text-white">
      {/* Top Tenant Navbar */}
      <Navbar
        onOpenAuth={() => setShowAuthModal(true)}
        onOpenScanner={() => handleSelectTab('barcode_station')}
        onBackToPublic={() => navigate('/')}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex max-w-[1600px] w-full mx-auto">
        {/* Navigation Sidebar */}
        <Sidebar
          currentTab={tab.replace('-', '_')}
          onSelectTab={handleSelectTab}
          onBackToPublic={() => navigate('/')}
        />

        {/* Dynamic View Content Area */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto max-w-full">
          {renderView()}
        </main>
      </div>

      {/* Auth / Demo Switch Modal */}
      <LoginModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLoginSuccess={() => setShowAuthModal(false)}
      />
    </div>
  );
};
