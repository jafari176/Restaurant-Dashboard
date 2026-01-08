import { Dashboard } from '@/components/orders/Dashboard';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const Index = () => {
  return (
    <div className="relative h-screen">
      <div className="absolute top-4 right-4">
        <Link to="/admin">
          <Button>Admin</Button>
        </Link>
      </div>
      <Dashboard />
    </div>
  );
};

export default Index;
