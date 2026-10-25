import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Special, SpecialInput } from '@/types/special';
import { useToast } from '@/hooks/use-toast';

export function useSpecials() {
  const [specials, setSpecials] = useState<Special[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSpecials = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('specials')
        .select('*')
        .order('start_date', { ascending: false })
        .order('price');

      if (error) throw error;
      setSpecials((data || []) as Special[]);
    } catch (error) {
      console.error('Error fetching specials:', error);
      toast({
        title: 'Error',
        description: 'Failed to load specials',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSpecials();

    // Keep a second open dashboard in step with edits made on the iPad.
    const channel = supabase
      .channel('specials-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'specials' }, () => {
        fetchSpecials();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSpecials]);

  const createSpecial = async (input: SpecialInput): Promise<boolean> => {
    try {
      const { error } = await supabase.from('specials').insert(input);
      if (error) throw error;
      toast({ title: 'Special added', description: input.name_en });
      await fetchSpecials();
      return true;
    } catch (error) {
      console.error('Error creating special:', error);
      toast({ title: 'Error', description: 'Failed to add special', variant: 'destructive' });
      return false;
    }
  };

  const updateSpecial = async (id: string, patch: Partial<SpecialInput>): Promise<boolean> => {
    try {
      const { error } = await supabase.from('specials').update(patch).eq('id', id);
      if (error) throw error;
      await fetchSpecials();
      return true;
    } catch (error) {
      console.error('Error updating special:', error);
      toast({ title: 'Error', description: 'Failed to update special', variant: 'destructive' });
      return false;
    }
  };

  const deleteSpecial = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('specials').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Special deleted' });
      await fetchSpecials();
      return true;
    } catch (error) {
      console.error('Error deleting special:', error);
      toast({ title: 'Error', description: 'Failed to delete special', variant: 'destructive' });
      return false;
    }
  };

  const toggleSpecial = async (special: Special): Promise<boolean> => {
    const next = !special.is_active;
    const ok = await updateSpecial(special.id, { is_active: next });
    if (ok) {
      toast({
        title: next ? 'Special is on' : 'Special is off',
        description: `${special.name_en} ${next ? 'will be' : 'will not be'} offered on calls`,
      });
    }
    return ok;
  };

  return {
    specials,
    loading,
    refetch: fetchSpecials,
    createSpecial,
    updateSpecial,
    deleteSpecial,
    toggleSpecial,
  };
}
