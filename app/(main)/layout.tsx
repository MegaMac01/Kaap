import { Header } from "@/components/layout/Header";
import { OnboardingGate } from "@/components/layout/OnboardingGate";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <OnboardingGate />
      <Header />
      {children}
    </>
  );
}
