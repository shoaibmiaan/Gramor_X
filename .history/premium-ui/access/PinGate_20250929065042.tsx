import { useState } from 'react';
import { useRouter } from 'next/router';
import { PrButton, PrCard } from '../components';

const PinGate = () => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handlePinSubmit = () => {
    // Example PIN check
    if (pin === '1234') { // Replace with your actual PIN check logic
      router.push('/premium-page'); // Redirect to the premium content page
    } else {
      setError('Incorrect PIN, please try again.');
    }
  };

  return (
    <PrCard className="p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Enter Your PIN</h2>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <input
        type="password"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        className="w-full p-2 border border-gray-300 rounded mb-4"
        placeholder="Enter PIN"
      />
      <PrButton onClick={handlePinSubmit}>Submit</PrButton>
    </PrCard>
  );
};

export default PinGate;
