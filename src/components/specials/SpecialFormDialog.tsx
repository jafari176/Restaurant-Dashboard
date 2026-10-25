import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Special, SpecialInput, comingWeekend } from '@/types/special';

interface SpecialFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (input: SpecialInput) => Promise<boolean>;
  /** Omit to add a new special. */
  special?: Special | null;
}

const DESCRIPTION_LIMIT = 100;

function emptyForm(): SpecialInput {
  const { start, end } = comingWeekend();
  return {
    name_en: '',
    name_fr: '',
    description: '',
    price: 0,
    start_date: start,
    end_date: end,
    is_active: true,
  };
}

export function SpecialFormDialog({ open, onClose, onSave, special }: SpecialFormDialogProps) {
  const [form, setForm] = useState<SpecialInput>(emptyForm());
  const [priceText, setPriceText] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    if (special) {
      setForm({
        name_en: special.name_en,
        name_fr: special.name_fr ?? '',
        description: special.description ?? '',
        price: special.price,
        start_date: special.start_date,
        end_date: special.end_date,
        is_active: special.is_active,
      });
      setPriceText(String(special.price));
    } else {
      setForm(emptyForm());
      setPriceText('');
    }
    setErrors({});
  }, [open, special]);

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!form.name_en.trim()) next.name_en = 'Name is required';
    const price = parseFloat(priceText);
    if (!priceText.trim() || Number.isNaN(price)) next.price = 'Price is required';
    else if (price <= 0) next.price = 'Price must be more than zero';
    if (form.end_date < form.start_date) next.end_date = 'End date cannot be before the start date';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const ok = await onSave({
      ...form,
      name_en: form.name_en.trim(),
      name_fr: form.name_fr?.trim() || null,
      description: form.description?.trim() || null,
      price: parseFloat(priceText),
    });
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {special ? 'Edit special' : 'Add special'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="name_en" className="text-base">
              Name (English) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name_en"
              value={form.name_en}
              onChange={(e) => setForm({ ...form, name_en: e.target.value })}
              placeholder="Lamb mansaf plate"
              className="h-12 text-base"
              autoFocus
            />
            {errors.name_en && <p className="text-sm text-destructive">{errors.name_en}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name_fr" className="text-base">
              Name (French)
            </Label>
            <Input
              id="name_fr"
              value={form.name_fr ?? ''}
              onChange={(e) => setForm({ ...form, name_fr: e.target.value })}
              placeholder="Assiette mansaf d'agneau"
              className="h-12 text-base"
            />
            <p className="text-xs text-muted-foreground">
              Left empty, the agent uses the English name with French callers.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price" className="text-base">
              Price <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="price"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={priceText}
                onChange={(e) => setPriceText(e.target.value)}
                placeholder="24.99"
                className="h-12 text-base pl-7"
              />
            </div>
            <p className="text-xs text-muted-foreground">Before tax, like menu prices.</p>
            {errors.price && <p className="text-sm text-destructive">{errors.price}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-base">
              Description
            </Label>
            <Textarea
              id="description"
              value={form.description ?? ''}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value.slice(0, DESCRIPTION_LIMIT) })
              }
              placeholder="Slow-cooked lamb with rice and yogurt sauce"
              className="text-base resize-none"
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              {(form.description ?? '').length}/{DESCRIPTION_LIMIT} — kept short so the agent stays brief.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="start_date" className="text-base">
                Starts
              </Label>
              <Input
                id="start_date"
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date" className="text-base">
                Ends
              </Label>
              <Input
                id="end_date"
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="h-12 text-base"
              />
            </div>
          </div>
          {errors.end_date && <p className="text-sm text-destructive">{errors.end_date}</p>}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving} className="h-12 flex-1 text-base">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="h-12 flex-1 text-base">
            {saving ? 'Saving…' : special ? 'Save changes' : 'Add special'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
