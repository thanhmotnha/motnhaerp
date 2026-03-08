import { redirect } from 'next/navigation';

export default function ExpensesRedirect() {
    redirect('/finance?tab=chi_phi');
}
