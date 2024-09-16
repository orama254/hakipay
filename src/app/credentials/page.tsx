import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import useStore from '@/store';




export default function Credentials() {
    const router = useRouter();
  const { state, addCredential } = useStore(); // Assuming the store hook follows a similar structure
  const [customerName, setCustomerName] = useState('');
  const [countryCode, setCountryCode] = useState('');

  const createCredential = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const subjectDid = state.customerDid.uri;
    const credential = await fetch(
      `https://mock-idv.tbddev.org/kcc?name=${customerName}&country=${countryCode}&did=${subjectDid}`
    ).then((res) => res.text());

    addCredential(credential);
    router.push('/send');
  };



  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 bg-gray-100 dark:bg-gray-800 py-8 px-6 md:px-8">
        <div className="max-w-3xl mx-auto bg-white dark:bg-gray-900 rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Create Credential</h2>
          <p className="text-red-400 text-sm">Required credential missing. Create Credential</p>
          <form onSubmit={createCredential}>
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 mb-2">Name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                className="w-full p-2 border rounded"
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 mb-2">Country Code</label>
              <input
                type="text"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                maxLength={2}
                required
                className="w-full p-2 border rounded"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 dark:text-white"
            >
              Create Credential
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}