import { useState, useMemo } from 'react';
import { Plus, ChevronDown, ChevronRight, Phone, Sparkles } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { useSpecials } from '@/hooks/useSpecials';
import { Special, SpecialInput, isLive, isPast, nextWeekend } from '@/types/special';
import { SpecialCard } from './SpecialCard';
import { SpecialFormDialog } from './SpecialFormDialog';

export function SpecialsPanel() {
  const { specials, loading, createSpecial, updateSpecial, deleteSpecial, toggleSpecial } =
    useSpecials();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Special | null>(null);
  const [deleting, setDeleting] = useState<Special | null>(null);
  const [showPast, setShowPast] = useState(false);
  const [busy, setBusy] = useState(false);

  const { current, past, liveCount } = useMemo(() => {
    const past = specials.filter((s) => isPast(s));
    const current = specials.filter((s) => !isPast(s));
    // Wrapped rather than passed by reference: isLive takes an optional second
    // argument, which filter would fill with the array index.
    return { current, past, liveCount: specials.filter((s) => isLive(s)).length };
  }, [specials]);

  const handleSave = async (input: SpecialInput) => {
    setBusy(true);
    const ok = editing ? await updateSpecial(editing.id, input) : await createSpecial(input);
    setBusy(false);
    return ok;
  };

  const handleRunAgain = async (special: Special) => {
    const { start, end } = nextWeekend();
    setBusy(true);
    await createSpecial({
      name_en: special.name_en,
      name_fr: special.name_fr,
      description: special.description,
      price: special.price,
      start_date: start,
      end_date: end,
      is_active: true,
    });
    setBusy(false);
  };

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (special: Special) => {
    setEditing(special);
    setFormOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* What the agent is actually offering right now, so he can trust it worked. */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <Phone className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <p className="font-semibold text-foreground">
              {liveCount === 0
                ? 'Nothing on the phone right now'
                : `Live on phone now: ${liveCount} ${liveCount === 1 ? 'special' : 'specials'}`}
            </p>
            <p className="text-sm text-muted-foreground">
              {liveCount === 0
                ? 'The agent will not mention specials.'
                : 'The agent offers these on the next call.'}
            </p>
          </div>
        </div>

        <Button onClick={openAdd} className="h-12 gap-2 px-5 text-base">
          <Plus className="h-5 w-5" />
          Add special
        </Button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground">Loading specials…</div>
      ) : current.length === 0 ? (
        <div className="rounded-xl border border-dashed py-16 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Sparkles className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mb-1 text-lg font-medium text-foreground">No specials yet</h3>
          <p className="text-muted-foreground">Add one and the agent offers it on the next call.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {current.map((s) => (
            <SpecialCard
              key={s.id}
              special={s}
              disabled={busy}
              onToggle={() => toggleSpecial(s)}
              onEdit={() => openEdit(s)}
              onDelete={() => setDeleting(s)}
            />
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div>
          <button
            onClick={() => setShowPast((v) => !v)}
            className="flex h-12 w-full items-center gap-2 rounded-lg px-2 text-left font-medium text-muted-foreground hover:text-foreground"
          >
            {showPast ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            Past specials ({past.length})
          </button>

          {showPast && (
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              {past.map((s) => (
                <SpecialCard
                  key={s.id}
                  special={s}
                  disabled={busy}
                  onRunAgain={() => handleRunAgain(s)}
                  onDelete={() => setDeleting(s)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <SpecialFormDialog
        open={formOpen}
        special={editing}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this special?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.name_en} will be removed. Orders that already included it keep their
              original price.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-12">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="h-12 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (deleting) await deleteSpecial(deleting.id);
                setDeleting(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
