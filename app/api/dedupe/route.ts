import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: customers } = await supabase.from('customers').select('*');
  
  if (!customers) return NextResponse.json({ error: 'Failed' });

  const map = new Map<string, any[]>();
  for (const c of customers) {
    if (!map.has(c.company_name)) map.set(c.company_name, []);
    map.get(c.company_name)!.push(c);
  }

  let deleted = 0;
  for (const [name, list] of map.entries()) {
    if (list.length > 1) {
      list.sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      
      const dupes = list.slice(1);
      for (const d of dupes) {
        await supabase.from('customers').delete().eq('id', d.id);
        deleted++;
      }
    }
  }

  return NextResponse.json({ success: true, deletedCount: deleted });
}
