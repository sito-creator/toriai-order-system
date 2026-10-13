'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateOrderStatus(orderId: string, newStatus: string) {
    const supabase = await createClient();
    
    const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);
        
    if (error) {
        throw new Error(error.message);
    }
    
    // Refresh the page
    revalidatePath('/orders');
}
