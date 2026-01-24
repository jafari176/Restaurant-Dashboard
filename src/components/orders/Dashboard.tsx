import { useState, useMemo, useEffect } from 'react';
import { Package, RefreshCw, Settings, X, Volume2, VolumeX } from 'lucide-react';
import { formatDistanceToNow, parseISO, isWithinInterval, startOfDay, endOfDay, isSameDay, isAfter, isBefore } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { useNavigate } from 'react-router-dom';
import { useOrders } from '@/hooks/useOrders';
import { Order } from '@/types/order';
import { TabButton } from './TabButton';
import { SearchBar } from './SearchBar';
import { OrderGrid } from './OrderGrid';
import { OrderDetailModal } from './OrderDetailModal';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type TabType = 'new' | 'in_progress' | 'ready' | 'received';

const tabs: { id: TabType; label: string; colorClass: string }[] = [
  { id: 'new', label: 'New Orders', colorClass: 'bg-status-new text-white' },
  { id: 'in_progress', label: 'In Progress', colorClass: 'bg-status-in-progress text-white' },
  { id: 'ready', label: 'Ready', colorClass: 'bg-status-ready text-white' },
  { id: 'received', label: 'Received', colorClass: 'bg-status-received text-white' },
];

export function Dashboard() {
  const navigate = useNavigate();
  const { ordersByStatus, loading, updateOrderStatus, deleteOrder, refetch, lastRefreshedAt } = useOrders();
  const [activeTab, setActiveTab] = useState<TabType>('new');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [rejectOrder, setRejectOrder] = useState<Order | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const [, setTick] = useState(0);

  // Update "time ago" display every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 10000);
    return () => clearInterval(interval);
  }, []);

  const handleEnableSound = () => {
    const dummySound = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
    dummySound.play().then(() => {
      dummySound.pause();
      setIsSoundEnabled(true);
    }).catch(error => {
      console.error("Could not enable sound:", error);
    });
  };

  useEffect(() => {
    // This effect runs when the list of new orders changes.
    if (!isSoundEnabled) return;

    const newOrdersCount = ordersByStatus.new.length;
    const lastKnownCount = parseInt(sessionStorage.getItem('lastNewOrdersCount') || '0', 10);

    if (newOrdersCount > lastKnownCount) {
      const newAudio = new Audio('/new_order_alert.mp3');
      newAudio.loop = true;
      newAudio.play().catch(error => {
        // Autoplay was prevented.
        console.error("Audio autoplay was prevented:", error);
      });
      setAudio(newAudio);
    }

    sessionStorage.setItem('lastNewOrdersCount', newOrdersCount.toString());

  }, [ordersByStatus.new, isSoundEnabled]);

  // Cleanup audio on component unmount
  useEffect(() => {
    return () => {
      if (audio) {
        audio.pause();
        setAudio(null);
      }
    };
  }, [audio]);

  const filteredOrders = useMemo(() => {
    let orders = ordersByStatus[activeTab];

    // Apply date range filter
    if (dateRange?.from) {
      const fromDate = dateRange.from;
      const toDate = dateRange.to || dateRange.from;

      const isDateInRange = (dateStr: string | null) => {
        if (!dateStr) return false;
        const date = parseISO(dateStr);

        // Check if date is same as fromDate or toDate (inclusive)
        if (isSameDay(date, fromDate) || isSameDay(date, toDate)) return true;

        // Check if date is between fromDate and toDate
        if (isAfter(date, fromDate) && isBefore(date, toDate)) return true;

        return false;
      };

      orders = orders.filter((order) => {
        // Check creation date or any status dates
        return (
          isDateInRange(order.created_at) ||
          isDateInRange(order.accepted_at) ||
          isDateInRange(order.ready_at) ||
          isDateInRange(order.received_at)
        );
      });
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      orders = orders.filter(
        (order) =>
          order.order_id.toLowerCase().includes(query) ||
          order.customer_name.toLowerCase().includes(query) ||
          order.phone_number.includes(query)
      );
    }

    return orders;
  }, [ordersByStatus, activeTab, searchQuery, dateRange]);

  const handleAccept = async (order: Order) => {
    if (audio) {
      audio.pause();
      setAudio(null);
    }
    setIsProcessing(true);
    await updateOrderStatus(order, 'in_progress', {
      accepted_at: new Date().toISOString(),
    });
    setIsProcessing(false);
    setSelectedOrder(null);
  };

  const handleReject = async () => {
    if (audio) {
      audio.pause();
      setAudio(null);
    }
    if (!rejectOrder) return;
    setIsProcessing(true);
    await deleteOrder(rejectOrder.order_id);
    setIsProcessing(false);
    setRejectOrder(null);
    setSelectedOrder(null);
  };

  const handleMarkReady = async (order: Order) => {
    setIsProcessing(true);
    await updateOrderStatus(order, 'ready', {
      ready_at: new Date().toISOString(),
    });
    setIsProcessing(false);
    setSelectedOrder(null);
  };

  const handleMarkReceived = async (order: Order) => {
    setIsProcessing(true);
    await updateOrderStatus(order, 'received', {
      received_at: new Date().toISOString(),
    });
    setIsProcessing(false);
    setSelectedOrder(null);
  };

  const getEmptyMessage = (tab: TabType) => {
    switch (tab) {
      case 'new':
        return 'No new orders waiting to be processed';
      case 'in_progress':
        return 'No orders currently in progress';
      case 'ready':
        return 'No orders ready for pickup';
      case 'received':
        return 'No completed orders yet';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Package className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-semibold text-xl">Order Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  {lastRefreshedAt 
                    ? `Updated ${formatDistanceToNow(lastRefreshedAt, { addSuffix: true })}`
                    : 'Manage and track orders'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin')}
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                Admin
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={refetch}
                disabled={loading}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {isSoundEnabled ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (audio) {
                      audio.pause();
                      setAudio(null);
                    }
                    setIsSoundEnabled(false);
                  }}
                  className="gap-2"
                >
                  <VolumeX className="h-4 w-4" />
                  Mute
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEnableSound}
                  className="gap-2"
                >
                  <Volume2 className="h-4 w-4" />
                  Enable Sound
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container py-6">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 p-1.5 bg-muted/50 rounded-xl w-fit">
          {tabs.map((tab) => (
            <TabButton
              key={tab.id}
              label={tab.label}
              count={ordersByStatus[tab.id].length}
              isActive={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              colorClass={tab.colorClass}
            />
          ))}
        </div>

        {/* Search and Filters */}
        <div className="mb-6 flex flex-col gap-4">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search by order ID, customer name, or phone..."
          />
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <DateRangePicker
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
              />
            </div>
            {dateRange && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setDateRange(undefined)}
                title="Clear date filter"
                className="shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Orders Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <OrderGrid
            orders={filteredOrders}
            emptyMessage={getEmptyMessage(activeTab)}
            onOrderClick={setSelectedOrder}
            onAccept={activeTab === 'new' ? handleAccept : undefined}
            onReject={activeTab === 'new' ? (order) => setRejectOrder(order) : undefined}
            onMarkReady={activeTab === 'in_progress' ? handleMarkReady : undefined}
            onMarkReceived={activeTab === 'ready' ? handleMarkReceived : undefined}
            isLoading={isProcessing}
          />
        )}
      </main>

      {/* Order Detail Modal */}
      <OrderDetailModal
        order={selectedOrder}
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onAccept={selectedOrder?.status === 'new' ? () => handleAccept(selectedOrder) : undefined}
        onReject={selectedOrder?.status === 'new' ? () => setRejectOrder(selectedOrder) : undefined}
        onMarkReady={selectedOrder?.status === 'in_progress' ? () => handleMarkReady(selectedOrder) : undefined}
        onMarkReceived={selectedOrder?.status === 'ready' ? () => handleMarkReceived(selectedOrder) : undefined}
        isLoading={isProcessing}
      />

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={!!rejectOrder} onOpenChange={() => setRejectOrder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject order {rejectOrder?.order_id}? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={isProcessing}
              className="bg-destructive hover:bg-destructive/90"
            >
              Reject Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
