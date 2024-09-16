import BalanceCard from "@/components/BalanceCard";
import Header from "@/components/Header";
import Credentials from "./credentials/page";
import TransactionsCard from "@/components/TransactionsCard";


export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 bg-gray-100 dark:bg-gray-800 py-8 px-6 md:px-8 dark:text-white">
        <div className="max-w-3xl mx-auto grid gap-8">
          <BalanceCard />
          <Credentials />
          <TransactionsCard />
        </div>
      </main>
    </div>
  );
}
