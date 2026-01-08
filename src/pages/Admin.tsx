import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnalyticsTab } from '@/components/admin/AnalyticsTab';
import { CustomersTab } from '@/components/admin/CustomersTab';
import { OrderHistoryTab } from '@/components/admin/OrderHistoryTab';
import { SalesReportsTab } from '@/components/admin/SalesReportsTab';
import { CustomerInsightsTab } from '@/components/admin/CustomerInsightsTab';

const Admin = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('analytics');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Orders
              </Button>
            </div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <div className="w-[140px]" /> {/* Spacer for centering */}
          </div>
        </div>
      </header>

      <main className="container py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="orders">Order History</TabsTrigger>
            <TabsTrigger value="sales">Sales Reports</TabsTrigger>
            <TabsTrigger value="insights">Customer Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="mt-6">
            <AnalyticsTab />
          </TabsContent>

          <TabsContent value="customers" className="mt-6">
            <CustomersTab />
          </TabsContent>

          <TabsContent value="orders" className="mt-6">
            <OrderHistoryTab />
          </TabsContent>

          <TabsContent value="sales" className="mt-6">
            <SalesReportsTab />
          </TabsContent>

          <TabsContent value="insights" className="mt-6">
            <CustomerInsightsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
