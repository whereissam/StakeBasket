import { createFileRoute } from '@tanstack/react-router';
import { SimpleStaking } from '../components/SimpleStaking';

export const Route = createFileRoute('/simple-staking')({
  component: SimpleStakingPage,
});

function SimpleStakingPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold">Simple Staking</h1>
          <p className="text-xl text-muted-foreground mt-2">
            Clean, fast, reliable CORE+BTC staking
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Rewritten with Linus's "good taste" principles
          </p>
        </div>
        <SimpleStaking />
      </div>
    </div>
  );
}