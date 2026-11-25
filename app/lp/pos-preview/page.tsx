import { notFound } from 'next/navigation';
import PosPreview from './preview';
import DashboardLayout from '@/app/(dashboard)/layout';
// This route never authenticates a user or reads production data. It is absent in production.
export default function PosPreviewPage() {
    if (process.env.NODE_ENV === 'production' || process.env.TORIAI_POS_DEMO !== '1') notFound();
    return <DashboardLayout><PosPreview/></DashboardLayout>;
}
