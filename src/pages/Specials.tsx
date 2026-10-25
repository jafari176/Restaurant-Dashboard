import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SpecialsPanel } from '@/components/specials/SpecialsPanel';

const Specials = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card">
        <div className="container py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Weekend Specials</h1>
                <p className="text-sm text-muted-foreground">
                  What the phone agent offers callers
                </p>
              </div>
            </div>

            <Button variant="outline" onClick={() => navigate('/')} className="h-11 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Orders
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6">
        <SpecialsPanel />
      </main>
    </div>
  );
};

export default Specials;
