import { PrButton, PrCard, PrProgress, PrTimer } from 'premium-ui/components';
import { useEffect, useState } from 'react';

const PremiumPage = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Example progress logic
    const interval = setInterval(() => {
      setProgress((prev) => (prev < 100 ? prev + 1 : 100));
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">Welcome to Premium Content</h1>

      <PrCard className="mb-4">
        <h2 className="text-2xl font-semibold">Premium Features</h2>
        <PrProgress value={progress} max={100} className="mt-4" />
        <PrTimer initialTime={600} className="mt-4" />
        <p className="mt-2">Stay tuned as we bring you more exclusive content!</p>
      </PrCard>

      <PrButton className="mt-6" onClick={() => alert('Enjoy your premium content!')}>
        Start Premium Experience
      </PrButton>
    </div>
  );
};

export default PremiumPage;
