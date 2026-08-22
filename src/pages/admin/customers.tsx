import { useState } from 'react';
import { useCustomers } from '@/hooks/useCustomers';
import { Search } from 'lucide-react';
import { CustomerTableSkeleton } from '@/components/admin/CustomerTableSkeleton.tsx';

export default function AdminCustomersPage() {
    const { customers, loading } = useCustomers();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredCustomers = customers.filter(c => 
        c.telegramDisplayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.telegramUsername?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.telegramUserId.includes(searchTerm) ||
        c.primeMemberId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Customers Management</h1>
            
            <div className="flex gap-2 mb-4">
                <input 
                    type="text" 
                    placeholder="Search by name, username, ID..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="border p-2 rounded w-full"
                />
            </div>

            {loading ? (
                <CustomerTableSkeleton rowCount={8} />
            ) : (
                <div className="bg-white rounded shadow overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b">
                                <th className="p-3 text-left">Name</th>
                                <th className="p-3 text-left">Member ID</th>
                                <th className="p-3 text-left">VIP Tier</th>
                                <th className="p-3 text-left">Orders</th>
                                <th className="p-3 text-left">Total Spent</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCustomers.map(c => (
                                <tr key={c.id} className="border-b hover:bg-gray-50">
                                    <td className="p-3">{c.telegramDisplayName}</td>
                                    <td className="p-3">{c.primeMemberId}</td>
                                    <td className="p-3">{c.vipTier}</td>
                                    <td className="p-3">{c.orderCount}</td>
                                    <td className="p-3">₱{c.totalSpending.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
