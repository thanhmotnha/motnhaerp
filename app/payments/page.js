import { redirect } from 'next/navigation';

export default function PaymentsRedirect() {
    redirect('/finance?tab=thu_tien');
}
